import { NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import Item from '@/models/Item';
import User from '@/models/User';
import Order from '@/models/Order';
import Wishlist from '@/models/Wishlist';
import Notification from '@/models/Notification';
import { getRazorpayLinkedAccountStatus } from '@/lib/razorpay';
import { verifyAuth } from '@/lib/auth';
import { cloudinary } from '@/lib/cloudinary';
import { sendNotification } from '@/utils/notificationHelper';
import { pusherServer } from '@/lib/pusher';

export async function PUT(request, { params }) {
  try {
    const authResult = await verifyAuth(request);
    if (authResult.error) {
      return NextResponse.json({ error: authResult.error }, { status: 401 });
    }

    const resolvedParams = await params;
    const { id } = resolvedParams;
    const seller_id = authResult.user.id;

    await connectDB();
    const item = await Item.findOne({ _id: id, seller_id });

    if (!item) {
      return NextResponse.json({ error: 'Item not found or unauthorized' }, { status: 404 });
    }

    // Block editing if item has an active rental
    const activeRental = await Order.findOne({
      item_id: id,
      status: { $in: ['rental_active', 'return_requested'] },
    });

    if (activeRental) {
      return NextResponse.json(
        { error: 'Cannot edit or modify this item while it is currently rented out with an active rental.' },
        { status: 400 }
      );
    }

    const formData = await request.formData();
    const name = formData.get('name');
    const description = formData.get('description');
    const price = formData.get('price');
    const condition_rating = formData.get('condition_rating');
    const category_id = formData.get('category_id');
    const listing_type = formData.get('listing_type');
    const rental_period = formData.get('rental_period');
    const quantity = formData.get('quantity');
    const is_active = formData.get('is_active');

    const willBeActive = is_active !== null && is_active !== undefined ? is_active === 'true' : item.is_active;

    if (willBeActive) {
      const seller = await User.findById(seller_id)
        .select('+razorpay_account_id razorpay_account_status bank_account upi_id');
      const isPayoutReady = Boolean(
        (seller?.bank_account?.account_number && seller?.bank_account?.ifsc_code)
        || seller?.upi_id
        || seller?.razorpay_account_status === 'activated'
        || seller?.razorpay_account_id
      );
      if (!isPayoutReady) {
        return NextResponse.json({ error: 'Add your payout details (Bank Account or UPI ID) in Profile > Payment before publishing a listing.' }, { status: 403 });
      }
    }

    if (listing_type === 'rent' && !['hour', 'day', 'month'].includes(rental_period)) {
      return NextResponse.json({ error: 'Please select a rental period' }, { status: 400 });
    }

    const previousPrice = Number(item.price);
    const wasSoldOut = (item.quantity <= 0) || Boolean(item.marked_sold_at);

    if (name) item.name = name;
    if (description) item.description = description;
    if (price) item.price = Number(price);
    if (condition_rating) item.condition_rating = Number(condition_rating);
    if (category_id) item.category_id = category_id;
    if (listing_type) {
      item.listing_type = listing_type;
      item.rental_period = listing_type === 'rent' ? rental_period : null;
    }

    const currentListingType = listing_type || item.listing_type;

    if (quantity !== null && quantity !== undefined) {
      const parsedQty = currentListingType === 'rent' ? 1 : Number(quantity);
      item.quantity = parsedQty;

      if (currentListingType !== 'rent') {
        if (parsedQty > 0) {
          // Restocked: clear marked_sold_at and activate if requested
          item.marked_sold_at = null;
          if (is_active !== null && is_active !== undefined) {
            item.is_active = is_active === 'true';
          } else {
            item.is_active = true;
          }
        } else {
          // Zero quantity: item is sold out
          item.is_active = false;
          if (!item.marked_sold_at) {
            item.marked_sold_at = new Date();
          }
        }
      } else {
        // Rental items
        if (is_active !== null && is_active !== undefined) {
          item.is_active = is_active === 'true';
        }
      }
    } else if (is_active !== null && is_active !== undefined) {
      // Quantity was not passed, only visibility changed
      const activeBool = is_active === 'true';
      item.is_active = activeBool;
      if (activeBool && (currentListingType === 'rent' || item.quantity > 0)) {
        item.marked_sold_at = null;
      }
    }

    const files = formData.getAll('images');
    if (files && files.length > 0) {
      const uploadPromises = files.map(async (file) => {
        if (typeof file === 'string' && file.startsWith('http')) {
          return file;
        }
        if (file && typeof file.arrayBuffer === 'function') {
          const bytes = await file.arrayBuffer();
          const buffer = Buffer.from(bytes);
          const dataURI = `data:${file.type || 'image/jpeg'};base64,${buffer.toString('base64')}`;
          
          const uploadResponse = await cloudinary.uploader.upload(dataURI, {
            folder: 'campusmart/items',
          });
          return uploadResponse.secure_url;
        }
        return null;
      });
      const imageUrls = (await Promise.all(uploadPromises)).filter(Boolean);
      if (imageUrls.length > 0) {
        item.images = imageUrls;
      }
    }

    await item.save();

    // ── Automatic Wishlist Notifications: Price Drop & Restock ──
    try {
      const newPrice = Number(item.price);
      const isRestocked = wasSoldOut && item.quantity > 0 && item.is_active;
      const isPriceDropped = price && Number(price) > 0 && newPrice < previousPrice;

      if (isPriceDropped || isRestocked) {
        const wishlists = await Wishlist.find({ items: item._id }).select('user');
        const notifiedUserIds = wishlists
          .map((w) => w.user?.toString())
          .filter((uid) => uid && uid !== seller_id);
        const uniqueUserIds = [...new Set(notifiedUserIds)];

        for (const recipientId of uniqueUserIds) {
          if (isPriceDropped) {
            await Notification.deleteMany({
              recipient: recipientId,
              relatedId: item._id,
              subType: 'PRICE_DROP',
              read: false,
            });
            const discountPercent = Math.round(((previousPrice - newPrice) / previousPrice) * 100);
            await sendNotification({
              recipientId,
              senderId: seller_id,
              type: 'WISHLIST',
              subType: 'PRICE_DROP',
              title: `🔥 Price Drop: ${item.name}`,
              body: `Great news! "${item.name}" dropped from ₹${previousPrice} to ₹${newPrice}${discountPercent > 0 ? ` (${discountPercent}% OFF)` : ''}! Grab it before someone else does.`,
              relatedId: item._id,
              thumbnail: item.images?.[0] || null,
              actionUrl: {
                targetScreen: 'ProductDetail',
                params: { item: item.toJSON ? item.toJSON() : item },
              },
            }).catch((err) => console.error('Wishlist price-drop notification error:', err));
          } else if (isRestocked) {
            await sendNotification({
              recipientId,
              senderId: seller_id,
              type: 'WISHLIST',
              subType: 'BACK_IN_STOCK',
              title: `📦 Back in Stock: ${item.name}`,
              body: `"${item.name}" that you added to your wishlist is now back in stock (₹${item.price})! Grab it now.`,
              relatedId: item._id,
              thumbnail: item.images?.[0] || null,
              actionUrl: {
                targetScreen: 'ProductDetail',
                params: { item: item.toJSON ? item.toJSON() : item },
              },
            }).catch((err) => console.error('Wishlist restock notification error:', err));
          }
        }
      }
    } catch (notifErr) {
      console.error('Error in wishlist auto-notification triggers:', notifErr);
    }

    // Broadcast real-time item update via Pusher
    try {
      const itemPayload = item.toJSON ? item.toJSON() : item;
      await pusherServer.trigger('market-items', 'item:updated', {
        item: itemPayload,
        itemId: item._id.toString(),
      });
      await pusherServer.trigger(`user-${seller_id}`, 'item:updated', {
        item: itemPayload,
        itemId: item._id.toString(),
      });
    } catch (pusherErr) {
      console.warn('[Pusher] item:updated trigger warning:', pusherErr.message);
    }

    return NextResponse.json(item);
  } catch (error) {
    console.error('Error updating item:', error);
    return NextResponse.json({ error: 'Server error updating item' }, { status: 500 });
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
    const seller_id = authResult.user.id;

    await connectDB();
    const item = await Item.findOne({ _id: id, seller_id });

    if (!item) {
      return NextResponse.json({ error: 'Item not found or unauthorized' }, { status: 404 });
    }

    // Check if there are active orders or active rentals for this item
    const activeOrder = await Order.findOne({
      item_id: id,
      status: { $in: ['pending', 'paid', 'delivered', 'rental_active', 'return_requested'] },
    });

    if (activeOrder) {
      const isRented = activeOrder.status === 'rental_active' || activeOrder.status === 'return_requested';
      return NextResponse.json(
        {
          error: isRented
            ? 'Cannot delete this item because it is currently rented out to a student with an active rental. Please wait until the rental is returned and completed.'
            : 'Cannot delete this item because an active order is in progress. Please fulfill or resolve the order first.',
        },
        { status: 400 }
      );
    }

    // Delete images from Cloudinary
    if (item.images && item.images.length > 0) {
      const deletePromises = item.images.map((url) => {
        const parts = url.split('/');
        const fileWithExt = parts[parts.length - 1];
        const publicId = `campusmart/items/${fileWithExt.split('.')[0]}`;
        return cloudinary.uploader.destroy(publicId).catch(() => {});
      });
      await Promise.all(deletePromises);
    }

    await Item.findByIdAndDelete(id);

    try {
      await pusherServer.trigger('market-items', 'item:deleted', { itemId: id.toString() });
      await pusherServer.trigger(`user-${seller_id}`, 'item:deleted', { itemId: id.toString() });
    } catch (pusherErr) {
      console.warn('[Pusher] item:deleted trigger warning:', pusherErr.message);
    }

    return NextResponse.json({ message: 'Item deleted successfully' });
  } catch (error) {
    console.error('Error deleting item:', error);
    return NextResponse.json({ error: 'Server error deleting item' }, { status: 500 });
  }
}
