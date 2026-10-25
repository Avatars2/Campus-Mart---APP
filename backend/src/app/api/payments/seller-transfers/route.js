import { NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import Payment from '@/models/Payment';
import Order from '@/models/Order';
import Item from '@/models/Item';
import User from '@/models/User';
import { verifyAuth } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(request) {
  try {
    const authResult = await verifyAuth(request);
    if (authResult.error) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status || 401 });
    }
    await connectDB();

    const sellerId = authResult.user.id;

    const payments = await Payment.find({
      'settlements.seller_id': sellerId,
      status: { $in: ['captured', 'needs_review'] },
    })
      .populate('buyer_id', 'full_name email phone student_id profile_photo_url')
      .populate('inventory_reservations.item_id', 'name images price listing_type')
      .sort({ createdAt: -1 })
      .limit(100)
      .lean();

    const paymentIds = payments.map((p) => p._id);
    const orderIds = payments.flatMap((p) => p.order_ids || []);

    // Fetch orders linked to these payments for this seller
    const orders = await Order.find({
      $or: [
        { payment_id: { $in: paymentIds }, seller_id: sellerId },
        { _id: { $in: orderIds }, seller_id: sellerId },
      ],
    })
      .populate('item_id', 'name images price listing_type')
      .populate('buyer_id', 'full_name email phone student_id profile_photo_url')
      .lean();

    // Map orders by payment_id
    const ordersByPaymentId = {};
    for (const order of orders) {
      const pId = order.payment_id?.toString();
      if (pId) {
        if (!ordersByPaymentId[pId]) ordersByPaymentId[pId] = [];
        ordersByPaymentId[pId].push(order);
      }
    }

    const transfers = payments.flatMap((payment) =>
      payment.settlements
        .filter((settlement) => settlement.seller_id.toString() === sellerId)
        .map((settlement) => {
          const pId = payment._id.toString();
          const matchedOrders = ordersByPaymentId[pId] || [];

          // Buyer details
          const buyerObj = matchedOrders[0]?.buyer_id || payment.buyer_id || {};
          const buyer = {
            name: buyerObj.full_name || 'Campus Student',
            email: buyerObj.email || '',
            phone: buyerObj.phone || '',
            student_id: buyerObj.student_id || '',
            profile_photo_url: buyerObj.profile_photo_url || null,
          };

          // Items details
          let items = [];
          if (matchedOrders.length > 0) {
            items = matchedOrders.map((ord) => ({
              order_id: ord._id,
              name: ord.item_id?.name || 'Campus Item',
              image: ord.item_id?.images?.[0] || null,
              price: ord.item_id?.price || ord.total_price,
              quantity: ord.quantity || 1,
              listing_type: ord.item_id?.listing_type || 'sell',
              order_status: ord.status,
              delivery_address: ord.delivery_address || 'Campus Pickup',
            }));
          } else if (payment.inventory_reservations && payment.inventory_reservations.length > 0) {
            items = payment.inventory_reservations.map((res) => ({
              name: res.item_id?.name || 'Campus Item',
              image: res.item_id?.images?.[0] || null,
              price: res.item_id?.price,
              quantity: res.quantity || 1,
              listing_type: res.listing_type || 'sell',
              order_status: 'completed',
              delivery_address: 'Campus Pickup',
            }));
          }

          return {
            payment_id: payment._id,
            amount: settlement.amount,
            currency: payment.currency,
            payment_status: payment.status,
            payout_status: payment.status === 'needs_review' ? 'review' : settlement.status,
            transfer_id: settlement.razorpay_transfer_id,
            created_at: payment.createdAt,
            buyer,
            items,
          };
        })
    );

    return NextResponse.json({ transfers }, { status: 200 });
  } catch (error) {
    console.error('Seller transfer status error:', error);
    return NextResponse.json({ error: 'Could not retrieve seller transfer status' }, { status: 500 });
  }
}
