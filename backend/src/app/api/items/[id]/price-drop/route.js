import { NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import Item from '@/models/Item';
import Order from '@/models/Order';
import Wishlist from '@/models/Wishlist';
import Notification from '@/models/Notification';
import { verifyAuth } from '@/lib/auth';
import { sendNotification } from '@/utils/notificationHelper';
import { pusherServer } from '@/lib/pusher';

export const runtime = 'nodejs';

export async function POST(request, { params }) {
  try {
    const authResult = await verifyAuth(request);
    if (authResult.error) {
      return NextResponse.json({ error: authResult.error }, { status: 401 });
    }

    const resolvedParams = await params;
    const { id } = resolvedParams;
    const sellerId = authResult.user.id;

    const body = await request.json().catch(() => ({}));
    const action = body.action;

    await connectDB();
    const item = await Item.findOne({ _id: id, seller_id: sellerId });

    if (!item) {
      return NextResponse.json({ error: 'Item not found or you are not authorized to update this listing.' }, { status: 404 });
    }

    // Block price drops on items currently rented
    const activeRental = await Order.findOne({
      item_id: id,
      status: { $in: ['rental_active', 'return_requested'] },
    });

    if (activeRental) {
      return NextResponse.json(
        { error: 'Cannot apply a price drop on an item that is currently rented out.' },
        { status: 400 }
      );
    }

    // ── Action: Remove / Reset Discount Offer ──
    if (action === 'reset' || action === 'remove_offer') {
      if (!item.original_price) {
        return NextResponse.json({ error: 'No active discount offer on this item.' }, { status: 400 });
      }

      const restoredPrice = item.original_price;
      item.price = restoredPrice;
      item.original_price = null;
      await item.save();

      return NextResponse.json({
        success: true,
        action: 'reset',
        message: `Discount offer removed! Price restored to original ₹${restoredPrice}.`,
        item: item.toJSON(),
      }, { status: 200 });
    }

    if (!item.is_active || item.is_suspended || item.marked_sold_at) {
      return NextResponse.json({ error: 'Price cannot be updated on inactive or sold items.' }, { status: 400 });
    }

    // Base price is the original price if an offer was already applied, otherwise current price
    const basePrice = Number(item.original_price || item.price);
    let newPrice = null;
    let discountPercent = null;

    if (body.discount_percent !== undefined && body.discount_percent !== null && body.discount_percent !== '') {
      const pct = Number(body.discount_percent);
      if (isNaN(pct) || pct < 1 || pct > 99) {
        return NextResponse.json({ error: 'Discount percentage must be between 1% and 99%.' }, { status: 400 });
      }
      discountPercent = Math.round(pct);
      newPrice = Math.max(1, Math.round(basePrice * (1 - discountPercent / 100)));
    } else if (body.new_price !== undefined && body.new_price !== null && body.new_price !== '') {
      newPrice = Number(body.new_price);
      if (!newPrice || isNaN(newPrice) || newPrice <= 0) {
        return NextResponse.json({ error: 'Please enter a valid price greater than 0.' }, { status: 400 });
      }
      if (newPrice >= basePrice) {
        return NextResponse.json({
          error: `New price (₹${newPrice}) must be lower than the original price (₹${basePrice}) to apply a discount.`,
        }, { status: 400 });
      }
      discountPercent = Math.round(((basePrice - newPrice) / basePrice) * 100);
    } else {
      return NextResponse.json({ error: 'Please enter a discount percentage (1-99%) or a discounted price.' }, { status: 400 });
    }

    // Preserve the authentic original price
    if (!item.original_price) {
      item.original_price = basePrice;
    }
    const previousPrice = item.price;
    item.price = newPrice;
    await item.save();

    // Query all students who added this item to their wishlist
    const wishlists = await Wishlist.find({ items: item._id }).select('user');
    const notifiedUserIds = wishlists
      .map(w => w.user?.toString())
      .filter(uid => uid && uid !== sellerId);

    const uniqueUserIds = [...new Set(notifiedUserIds)];

    // Send notifications to each wishlisting user (deduplicating previous unread price drops)
    for (const recipientId of uniqueUserIds) {
      try {
        await Notification.deleteMany({
          recipient: recipientId,
          relatedId: item._id,
          subType: 'PRICE_DROP',
          read: false,
        });

        await sendNotification({
          recipientId,
          senderId: sellerId,
          type: 'WISHLIST',
          subType: 'PRICE_DROP',
          title: `🔥 Price Drop: ${item.name}`,
          body: `Great news! "${item.name}" is now ${discountPercent}% OFF! Dropped from ₹${basePrice} to ₹${newPrice}. Grab it before someone else does!`,
          relatedId: item._id,
          thumbnail: item.images?.[0] || null,
          actionUrl: {
            targetScreen: 'ProductDetail',
            params: { item: item.toJSON ? item.toJSON() : item },
          },
        });
      } catch (err) {
        console.error(`Failed to notify wishlist user ${recipientId} for price drop:`, err);
      }
    }

    try {
      const itemPayload = item.toJSON();
      await pusherServer.trigger('market-items', 'item:updated', {
        item: itemPayload,
        itemId: item._id.toString(),
        isPriceDrop: true,
        newPrice,
        discountPercent,
        originalPrice: item.original_price,
      });
      await pusherServer.trigger(`user-${sellerId}`, 'item:updated', {
        item: itemPayload,
        itemId: item._id.toString(),
      });
    } catch (pusherErr) {
      console.warn('[Pusher] price drop trigger warning:', pusherErr.message);
    }

    return NextResponse.json({
      success: true,
      message: `Price successfully dropped to ₹${newPrice} (${discountPercent}% OFF)! ${uniqueUserIds.length} student(s) who wishlisted this item have been alerted.`,
      item: item.toJSON(),
      original_price: item.original_price,
      old_price: previousPrice,
      new_price: newPrice,
      discount_percent: discountPercent,
      notified_count: uniqueUserIds.length,
    }, { status: 200 });

  } catch (error) {
    console.error('Price drop error:', error);
    return NextResponse.json({ error: 'Failed to update price drop.' }, { status: 500 });
  }
}

export async function DELETE(request, { params }) {
  try {
    const authResult = await verifyAuth(request);
    if (authResult.error) {
      return NextResponse.json({ error: authResult.error }, { status: 401 });
    }

    const resolvedParams = await params;
    const { id } = resolvedParams;
    const sellerId = authResult.user.id;

    await connectDB();
    const item = await Item.findOne({ _id: id, seller_id: sellerId });

    if (!item) {
      return NextResponse.json({ error: 'Item not found or unauthorized' }, { status: 404 });
    }

    if (!item.original_price) {
      return NextResponse.json({ error: 'No active discount offer on this item.' }, { status: 400 });
    }

    const restoredPrice = item.original_price;
    item.price = restoredPrice;
    item.original_price = null;
    await item.save();

    try {
      const itemPayload = item.toJSON();
      await pusherServer.trigger('market-items', 'item:updated', {
        item: itemPayload,
        itemId: item._id.toString(),
        isRestored: true,
        restoredPrice,
      });
      await pusherServer.trigger(`user-${sellerId}`, 'item:updated', {
        item: itemPayload,
        itemId: item._id.toString(),
      });
    } catch (pusherErr) {
      console.warn('[Pusher] restore price trigger warning:', pusherErr.message);
    }

    return NextResponse.json({
      success: true,
      action: 'reset',
      message: `Discount offer removed! Price restored to original ₹${restoredPrice}.`,
      item: item.toJSON(),
    }, { status: 200 });
  } catch (error) {
    console.error('Remove discount offer error:', error);
    return NextResponse.json({ error: 'Failed to remove discount offer.' }, { status: 500 });
  }
}

