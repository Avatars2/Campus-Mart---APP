import { NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import Order from '@/models/Order';
import Item from '@/models/Item';
import Payment from '@/models/Payment';
import User from '@/models/User';
import { verifyAuth } from '@/lib/auth';
import { sendNotification } from '@/utils/notificationHelper';
import { createRazorpayOrder, createRazorpayPaymentLink, getRazorpayKeyId, verifyCheckoutSignature, razorpayRequest } from '@/lib/razorpay';

export async function POST(request) {
  try {
    const authResult = await verifyAuth(request);
    if (authResult.error) {
      return NextResponse.json({ error: authResult.error }, { status: 401 });
    }

    const {
      order_id,
      extension_duration,
      action = 'create_order',
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
    } = await request.json();

    const durationNum = parseInt(extension_duration, 10);
    if (!order_id || isNaN(durationNum) || durationNum <= 0) {
      return NextResponse.json({ error: 'Valid order ID and positive extension duration are required' }, { status: 400 });
    }

    await connectDB();
    const order = await Order.findById(order_id)
      .populate('item_id', 'name price images listing_type rental_period')
      .populate('seller_id', 'full_name email phone student_id')
      .populate('buyer_id', 'full_name email phone student_id');

    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    const userId = authResult.user.id.toString();
    const buyerId = order.buyer_id._id.toString();
    const sellerId = order.seller_id._id.toString();

    // Verify caller is the buyer
    if (userId !== buyerId) {
      return NextResponse.json({ error: 'Only the buyer can extend this rental' }, { status: 403 });
    }

    // Verify rental is active
    if (!['rental_active', 'return_requested'].includes(order.status)) {
      return NextResponse.json({ error: 'Only active rentals can be extended' }, { status: 400 });
    }

    const item = order.item_id;
    if (!item || item.listing_type !== 'rent') {
      return NextResponse.json({ error: 'This item is not a rental' }, { status: 400 });
    }

    const rentalPeriod = ['hour', 'day', 'month'].includes(item.rental_period) ? item.rental_period : 'day';
    const unitPrice = Number(item.price) || 0;
    const extensionCost = unitPrice * durationNum;
    const amountInPaise = Math.round(extensionCost * 100);

    // Step 1: Create Razorpay Order & Hosted Payment Link
    if (action === 'create_order') {
      try {
        const shortOrderId = order._id.toString().slice(-8);
        const receipt = `ext_${shortOrderId}_${Date.now().toString().slice(-6)}`;
        const razorpayOrder = await createRazorpayOrder({
          amount: amountInPaise,
          currency: 'INR',
          receipt,
          notes: {
            order_id: order._id.toString(),
            extension_duration: durationNum,
            rental_period: rentalPeriod,
          },
        });

        return NextResponse.json({
          razorpay_order_id: razorpayOrder.id,
          amount: razorpayOrder.amount,
          currency: razorpayOrder.currency,
          key_id: getRazorpayKeyId(),
          extension_cost: extensionCost,
          duration: durationNum,
          period: rentalPeriod,
        }, { status: 200 });
      } catch (err) {
        console.error('Create Razorpay order error:', err);
        return NextResponse.json({ error: err.message || 'Failed to create Razorpay payment order' }, { status: 500 });
      }
    }

    // Step 2: Confirm Extension after Razorpay Payment
    if (action === 'confirm') {
      let finalPaymentId = razorpay_payment_id;
      if (finalPaymentId === 'pay_confirmed') finalPaymentId = null;

      // If payment ID is not provided or was a placeholder, query Razorpay order payments directly
      if (!finalPaymentId && razorpay_order_id) {
        try {
          const paymentsList = await razorpayRequest(`/orders/${encodeURIComponent(razorpay_order_id)}/payments`);
          const paid = paymentsList?.items?.find((p) => p.status === 'captured' || p.status === 'authorized');
          if (paid) {
            finalPaymentId = paid.id;
          }
        } catch (fetchErr) {
          console.warn('Could not query payments for extend-rental order:', fetchErr.message);
        }
      }

      if (!finalPaymentId) {
        return NextResponse.json({ error: 'Payment has not been completed for this rental extension' }, { status: 400 });
      }

      // Verify signature if provided and real
      if (razorpay_order_id && razorpay_signature && finalPaymentId) {
        const isValid = verifyCheckoutSignature(razorpay_order_id, finalPaymentId, razorpay_signature);
        if (!isValid) {
          // Double check with Razorpay API directly before failing
          try {
            const pInfo = await razorpayRequest(`/payments/${encodeURIComponent(finalPaymentId)}`);
            if (pInfo.order_id !== razorpay_order_id || (pInfo.status !== 'captured' && pInfo.status !== 'authorized')) {
              return NextResponse.json({ error: 'Invalid payment signature from Razorpay' }, { status: 400 });
            }
          } catch (e) {
            return NextResponse.json({ error: 'Invalid payment signature from Razorpay' }, { status: 400 });
          }
        }
      }

      const now = new Date();
      const previousDueAt = order.rental_due_at ? new Date(order.rental_due_at) : now;
      // If the rental has already passed its due date, extend from NOW so the user actually gets the time they paid for!
      const baseDate = previousDueAt.getTime() > now.getTime() ? previousDueAt : now;
      const newDueAt = new Date(baseDate);

      if (rentalPeriod === 'hour') newDueAt.setHours(newDueAt.getHours() + durationNum);
      if (rentalPeriod === 'day') newDueAt.setDate(newDueAt.getDate() + durationNum);
      if (rentalPeriod === 'month') newDueAt.setMonth(newDueAt.getMonth() + durationNum);

      // Create Payment document so extension earnings appear in seller's payment dashboard
      const sellerUser = await User.findById(sellerId).select('+razorpay_account_id');
      const sellerAccountId = sellerUser?.razorpay_account_id || null;
      const initialSettlementStatus = sellerAccountId ? 'transferred' : 'held';
      const referenceId = `ext_${order._id.toString().slice(-8)}_${Date.now().toString().slice(-6)}`;

      let extensionPayment = null;
      try {
        extensionPayment = await Payment.create({
          buyer_id: buyerId,
          order_ids: [order._id],
          amount: amountInPaise,
          currency: 'INR',
          provider: 'razorpay',
          status: 'captured',
          captured_at: new Date(),
          method: 'Razorpay',
          expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000),
          razorpay_order_id: razorpay_order_id || null,
          razorpay_payment_id: finalPaymentId,
          inventory_reservations: [{
            item_id: item._id,
            listing_type: 'rent',
            quantity: order.quantity || 1,
          }],
          settlements: [{
            seller_id: sellerId,
            razorpay_account_id: sellerAccountId,
            amount: amountInPaise,
            status: initialSettlementStatus,
            reference_id: referenceId,
          }],
        });
      } catch (payCreateErr) {
        console.error('Create extension payment record warning:', payCreateErr.message || payCreateErr);
      }

      const extensionRecord = {
        extended_at: new Date(),
        extension_duration: durationNum,
        extension_period: rentalPeriod,
        cost: extensionCost,
        previous_due_at: previousDueAt,
        new_due_at: newDueAt,
        payment_method: 'Razorpay',
        payment_id: finalPaymentId,
        payment_record_id: extensionPayment?._id || null,
      };

      if (!order.rental_extensions) {
        order.rental_extensions = [];
      }
      order.rental_extensions.push(extensionRecord);
      order.rental_due_at = newDueAt;
      order.status = 'rental_active';
      order.return_requested_at = null;
      order.rental_duration = (order.rental_duration || 1) + durationNum;
      order.total_price = (order.total_price || 0) + extensionCost;

      await order.save();

      const periodLabel = durationNum === 1
        ? (rentalPeriod === 'hour' ? 'Hour' : rentalPeriod === 'month' ? 'Month' : 'Day')
        : (rentalPeriod === 'hour' ? 'Hours' : rentalPeriod === 'month' ? 'Months' : 'Days');

      // Notify seller
      await sendNotification({
        recipientId: sellerId,
        senderId: buyerId,
        type: 'ORDER',
        title: 'Rental Extended & Paid!',
        body: `Buyer paid ₹${extensionCost} via Razorpay to extend "${item.name}" by +${durationNum} ${periodLabel}. New due date: ${newDueAt.toLocaleString()}.`,
        relatedId: order._id,
      }).catch(err => console.error('Seller rental extension notification failed:', err));

      return NextResponse.json({
        message: `Rental successfully extended by +${durationNum} ${periodLabel} with Razorpay payment!`,
        order: order.toJSON(),
        extension: extensionRecord,
        payment: extensionPayment,
      }, { status: 200 });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });

  } catch (error) {
    console.error('Rental Extension Error:', error);
    return NextResponse.json({ error: error.message || 'Rental extension failed' }, { status: 500 });
  }
}
