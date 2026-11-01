import { NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import Notification from '@/models/Notification';
import Order from '@/models/Order';
import Item from '@/models/Item';
import User from '@/models/User';
import { verifyAuth } from '@/lib/auth';

export async function GET(request) {
  try {
    const authResult = await verifyAuth(request);
    if (authResult.error) {
      return NextResponse.json({ error: authResult.error }, { status: 401 });
    }

    await connectDB();
    const userId = authResult.user.id;

    const rawNotifications = await Notification.find({ recipient: userId, type: { $ne: 'MESSAGE' } })
      .sort({ createdAt: -1 })
      .populate('sender', 'full_name profile_photo_url')
      .lean();

    // 1. Deduplicate identical notifications (e.g. duplicate price drops or order events)
    const seen = new Set();
    const uniqueNotifications = [];
    const duplicateIdsToDelete = [];

    for (const n of rawNotifications) {
      let key;
      if (n.subType === 'PRICE_DROP' || n.title?.toLowerCase().includes('price drop')) {
        // Keep only the latest price drop notification per item
        key = `PRICE_DROP_${n.relatedId || n.title}`;
      } else if (n.type === 'BUYING_REQUEST' && n.relatedId) {
        // Keep only 1 notification per buying request per sender (never duplicate per chat message)
        const senderId = n.sender?._id || n.sender || '';
        key = `BUYING_REQUEST_${n.relatedId}_${senderId}`;
      } else if (n.type === 'ORDER' && n.relatedId) {
        // Keep only 1 notification per order event (new order, payment confirmed, etc.)
        const titleNorm = (n.title || '').toLowerCase();
        const stage = n.subType || (
          titleNorm.includes('order received') || titleNorm.includes('new order') ? 'NEW_ORDER' :
          titleNorm.includes('payment') ? 'PAYMENT' :
          titleNorm.includes('delivered') ? 'DELIVERED' :
          titleNorm.includes('cancelled') ? 'CANCELLED' :
          titleNorm.includes('completed') ? 'COMPLETED' :
          titleNorm.includes('return') ? 'RETURN' :
          n.title
        );
        key = `ORDER_${n.relatedId}_${stage}`;
      } else {
        key = `${n.type}_${n.subType || ''}_${n.relatedId || ''}_${n.title || ''}`;
      }

      if (seen.has(key)) {
        duplicateIdsToDelete.push(n._id);
      } else {
        seen.add(key);
        uniqueNotifications.push(n);
      }
    }

    if (duplicateIdsToDelete.length > 0) {
      Notification.deleteMany({ _id: { $in: duplicateIdsToDelete } }).exec();
    }

    // 2. Auto-enrich order/wishlist notifications missing thumbnails or buyer/seller names
    const enrichedNotifications = await Promise.all(
      uniqueNotifications.map(async (n) => {
        if (
          n.type === 'ORDER' &&
          n.relatedId &&
          (
            !n.thumbnail ||
            !n.actionUrl?.params?.tab ||
            n.actionUrl?.targetScreen === 'NotificationDetail' ||
            n.body?.includes('Someone just bought') ||
            n.title?.toLowerCase().includes('payment confirmed') ||
            n.title?.toLowerCase().includes('new paid order')
          )
        ) {
          try {
            const order = await Order.findById(n.relatedId)
              .populate('item_id', 'name images listing_type rental_period')
              .populate('buyer_id', 'full_name')
              .populate('seller_id', 'full_name')
              .lean();

            if (order) {
              const itemImg = order.item_id?.images?.[0] || null;
              const itemName = order.item_id?.name || 'Item';
              const buyerName = order.buyer_id?.full_name || 'Buyer';
              const sellerName = order.seller_id?.full_name || 'Seller';
              const isSeller = String(order.seller_id?._id || order.seller_id) === String(userId);

              let updatedThumbnail = n.thumbnail || itemImg;
              let updatedTitle = n.title;
              let updatedBody = n.body;

              if (n.title === 'New Order Received!' || n.body?.includes('Someone just bought')) {
                updatedTitle = order.item_id?.listing_type === 'rent'
                  ? `⏱️ New Rental Request: ${itemName}`
                  : `📦 New Order: ${itemName}`;
                updatedBody = order.item_id?.listing_type === 'rent'
                  ? `${buyerName} requested to rent "${itemName}". Total: ₹${order.total_price}.`
                  : `${buyerName} bought "${itemName}" (Qty: ${order.quantity || 1}) for ₹${order.total_price}.`;
              } else if (
                n.title?.toLowerCase() === 'payment confirmed' ||
                n.title?.toLowerCase().includes('payment confirmed') ||
                n.title?.toLowerCase().includes('new paid order')
              ) {
                if (isSeller) {
                  updatedTitle = `💰 New Paid Order: ${itemName}`;
                  updatedBody = `Payment confirmed for "${itemName}" from ${buyerName}. Total: ₹${order.total_price}. Please arrange delivery.`;
                } else {
                  updatedTitle = `✅ Payment Confirmed: ${itemName}`;
                  updatedBody = `Payment confirmed for "${itemName}". Seller ${sellerName} has been notified to arrange delivery.`;
                }
              }

              const targetTab = isSeller ? 'sales' : 'purchases';
              const updatedActionUrl = {
                targetScreen: 'Buy',
                params: {
                  tab: targetTab,
                },
              };

              const needsActionUrlUpdate =
                !n.actionUrl ||
                !n.actionUrl?.params?.tab ||
                n.actionUrl.targetScreen === 'NotificationDetail' ||
                n.actionUrl.params?.tab !== targetTab;
              const nextActionUrl = needsActionUrlUpdate ? updatedActionUrl : n.actionUrl;

              if (
                updatedThumbnail !== n.thumbnail ||
                updatedTitle !== n.title ||
                updatedBody !== n.body ||
                needsActionUrlUpdate
              ) {
                n.thumbnail = updatedThumbnail;
                n.title = updatedTitle;
                n.body = updatedBody;
                n.actionUrl = nextActionUrl;
                Notification.updateOne(
                  { _id: n._id },
                  {
                    $set: {
                      thumbnail: updatedThumbnail,
                      title: updatedTitle,
                      body: updatedBody,
                      actionUrl: nextActionUrl,
                    },
                  }
                ).exec();
              }
            }
          } catch (err) {
            console.error('Error auto-enriching order notification:', err);
          }
        } else if (n.type === 'WISHLIST' && n.relatedId && !n.thumbnail) {
          try {
            const item = await Item.findById(n.relatedId).select('images').lean();
            if (item?.images?.[0]) {
              n.thumbnail = item.images[0];
              Notification.updateOne({ _id: n._id }, { $set: { thumbnail: item.images[0] } }).exec();
            }
          } catch (err) {
            console.error('Error auto-enriching wishlist thumbnail:', err);
          }
        }
        return n;
      })
    );

    return NextResponse.json({ notifications: enrichedNotifications });
  } catch (error) {
    console.error('Get Notifications Error:', error);
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 });
  }
}

export async function DELETE(request) {
  try {
    const authResult = await verifyAuth(request);
    if (authResult.error) {
      return NextResponse.json({ error: authResult.error }, { status: 401 });
    }

    await connectDB();
    const userId = authResult.user.id;

    await Notification.deleteMany({ recipient: userId });

    return NextResponse.json({ message: 'All notifications cleared successfully' });
  } catch (error) {
    console.error('Clear All Notifications Error:', error);
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 });
  }
}
