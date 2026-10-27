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

    // 1. Fetch captured payments for this seller
    const payments = await Payment.find({
      'settlements.seller_id': sellerId,
      status: { $in: ['captured', 'needs_review'] },
    })
      .populate('buyer_id', 'full_name email phone student_id profile_photo_url')
      .populate('inventory_reservations.item_id', 'name images price listing_type rental_period')
      .sort({ createdAt: -1 })
      .limit(100)
      .lean();

    const paymentIds = payments.map((p) => p._id);
    const orderIds = payments.flatMap((p) => p.order_ids || []);

    // 2. Fetch orders linked to these payments for this seller
    const orders = await Order.find({
      $or: [
        { payment_id: { $in: paymentIds }, seller_id: sellerId },
        { _id: { $in: orderIds }, seller_id: sellerId },
      ],
    })
      .populate('item_id', 'name images price listing_type rental_period')
      .populate('buyer_id', 'full_name email phone student_id profile_photo_url')
      .lean();

    // Map orders by payment_id and by order_id
    const ordersByPaymentId = {};
    const ordersById = {};
    for (const order of orders) {
      const pId = order.payment_id?.toString();
      const oId = order._id?.toString();
      if (pId) {
        if (!ordersByPaymentId[pId]) ordersByPaymentId[pId] = [];
        ordersByPaymentId[pId].push(order);
      }
      if (oId) {
        ordersById[oId] = order;
      }
    }

    const transfers = payments.flatMap((payment) =>
      payment.settlements
        .filter((settlement) => settlement.seller_id?.toString() === sellerId)
        .map((settlement) => {
          const pId = payment._id.toString();
          let matchedOrders = ordersByPaymentId[pId] || [];
          if (!matchedOrders.length && payment.order_ids && payment.order_ids.length > 0) {
            matchedOrders = payment.order_ids.map((id) => ordersById[id.toString()]).filter(Boolean);
          }

          // Buyer details
          const buyerObj = matchedOrders[0]?.buyer_id || payment.buyer_id || {};
          const buyer = {
            name: buyerObj.full_name || 'Campus Student',
            email: buyerObj.email || '',
            phone: buyerObj.phone || '',
            student_id: buyerObj.student_id || '',
            profile_photo_url: buyerObj.profile_photo_url || null,
          };

          const isExtensionPayment = settlement.reference_id?.startsWith?.('ext_');

          // Items details
          let items = [];
          if (matchedOrders.length > 0) {
            items = matchedOrders.map((ord) => {
              const isRent = ord.item_id?.listing_type === 'rent';
              return {
                order_id: ord._id,
                name: ord.item_id?.name || 'Campus Item',
                image: ord.item_id?.images?.[0] || null,
                price: Math.round(settlement.amount / 100),
                quantity: ord.quantity || 1,
                listing_type: isRent ? 'rent' : 'sell',
                rental_period: ord.item_id?.rental_period || 'day',
                rental_duration: ord.rental_duration || 1,
                is_extension: Boolean(isExtensionPayment),
                order_status: ord.status,
                delivery_address: ord.delivery_address || 'Campus Pickup',
              };
            });
          } else if (payment.inventory_reservations && payment.inventory_reservations.length > 0) {
            items = payment.inventory_reservations.map((res) => ({
              name: res.item_id?.name || 'Campus Item',
              image: res.item_id?.images?.[0] || null,
              price: res.item_id?.price || Math.round(settlement.amount / 100),
              quantity: res.quantity || 1,
              listing_type: res.listing_type || 'sell',
              rental_period: res.item_id?.rental_period || 'day',
              rental_duration: 1,
              is_extension: Boolean(isExtensionPayment),
              order_status: 'completed',
              delivery_address: 'Campus Pickup',
            }));
          }

          // Determine payout status
          let payoutStatus = payment.status === 'needs_review' ? 'review' : settlement.status;
          if (payoutStatus === 'held' && matchedOrders.length > 0) {
            const hasStartedRental = matchedOrders.some((ord) =>
              ord.item_id?.listing_type === 'rent' && ['rental_active', 'completed'].includes(ord.status)
            );
            const hasCompletedSale = matchedOrders.some((ord) =>
              ord.item_id?.listing_type !== 'rent' && ord.status === 'completed'
            );
            if (hasStartedRental || hasCompletedSale || isExtensionPayment) {
              payoutStatus = 'transferred';
            }
          }

          return {
            payment_id: payment._id,
            amount: settlement.amount,
            currency: payment.currency,
            payment_status: payment.status,
            payout_status: payoutStatus,
            transfer_id: settlement.razorpay_transfer_id,
            created_at: payment.createdAt,
            buyer,
            items,
          };
        })
    );

    // 3. Fallback: Include any online paid orders for this seller not yet captured in payments
    const standalonePaidOrders = await Order.find({
      seller_id: sellerId,
      payment_method: { $in: ['Razorpay', 'UPI'] },
      payment_status: 'paid',
      $or: [
        { payment_id: { $nin: paymentIds } },
        { payment_id: null },
      ],
    })
      .populate('item_id', 'name images price listing_type rental_period')
      .populate('buyer_id', 'full_name email phone student_id profile_photo_url')
      .lean();

    for (const ord of standalonePaidOrders) {
      const isRent = ord.item_id?.listing_type === 'rent';
      const isCompleted = isRent ? ['rental_active', 'completed'].includes(ord.status) : ord.status === 'completed';
      const buyerObj = ord.buyer_id || {};
      const buyer = {
        name: buyerObj.full_name || 'Campus Student',
        email: buyerObj.email || '',
        phone: buyerObj.phone || '',
        student_id: buyerObj.student_id || '',
        profile_photo_url: buyerObj.profile_photo_url || null,
      };

      transfers.push({
        payment_id: ord.payment_id || ord._id,
        amount: Math.round((ord.total_price || 0) * 100),
        currency: 'INR',
        payment_status: 'captured',
        payout_status: isCompleted ? 'transferred' : 'held',
        transfer_id: ord.payment_id?.toString() || null,
        created_at: ord.createdAt,
        buyer,
        items: [{
          order_id: ord._id,
          name: ord.item_id?.name || 'Campus Item',
          image: ord.item_id?.images?.[0] || null,
          price: ord.total_price,
          quantity: ord.quantity || 1,
          listing_type: isRent ? 'rent' : 'sell',
          rental_period: ord.item_id?.rental_period || 'day',
          rental_duration: ord.rental_duration || 1,
          is_extension: false,
          order_status: ord.status,
          delivery_address: ord.delivery_address || 'Campus Pickup',
        }],
      });
    }

    // Sort newest transactions first
    transfers.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

    return NextResponse.json({ transfers }, { status: 200 });
  } catch (error) {
    console.error('Seller transfer status error:', error);
    return NextResponse.json({ error: 'Could not retrieve seller transfer status' }, { status: 500 });
  }
}
