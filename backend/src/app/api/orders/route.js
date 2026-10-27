import { NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import Order from '@/models/Order';
import Item from '@/models/Item'; // required for population
import Payment from '@/models/Payment';
import User from '@/models/User'; // required for population
import { verifyAuth } from '@/lib/auth';
import { sendNotification } from '@/utils/notificationHelper';
import { transferSellerFunds } from '@/lib/paymentLifecycle';

export async function GET(request) {
  try {
    const authResult = await verifyAuth(request);
    if (authResult.error) {
      return NextResponse.json({ error: authResult.error }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type') || 'purchases'; // 'purchases' or 'sales'

    await connectDB();
    const userId = authResult.user.id;

    let query = {};
    if (type === 'sales') {
      query = {
        seller_id: userId,
        $or: [
          { payment_method: { $nin: ['UPI', 'Razorpay'] } },
          { payment_status: 'paid' },
        ],
      };
    } else {
      query = { buyer_id: userId };
    }

    const orders = await Order.find(query)
      .populate('item_id', 'name price images listing_type rental_period')
      .populate('seller_id', 'full_name email phone student_id profile_photo_url')
      .populate('buyer_id', 'full_name email phone student_id profile_photo_url')
      .sort({ createdAt: -1 });

    for (const order of orders) {
      if (
        order.status === 'rental_active'
        && order.rental_started_at
        && order.rental_due_at
        && order.rental_due_at <= order.rental_started_at
        && order.item_id?.listing_type === 'rent'
      ) {
        const repairedDueAt = new Date(order.rental_started_at);
        const rentalDuration = order.rental_duration || 1;
        const rentalPeriod = ['hour', 'day', 'month'].includes(order.item_id.rental_period)
          ? order.item_id.rental_period
          : 'day';
        if (rentalPeriod === 'hour') repairedDueAt.setHours(repairedDueAt.getHours() + rentalDuration);
        if (rentalPeriod === 'day') repairedDueAt.setDate(repairedDueAt.getDate() + rentalDuration);
        if (rentalPeriod === 'month') repairedDueAt.setMonth(repairedDueAt.getMonth() + rentalDuration);
        order.rental_due_at = repairedDueAt;
        await order.save();
      }
    }

    const responseOrders = orders.map((order) => order.toJSON());

    if (type === 'sales') {
      const paymentIds = orders.map((order) => order.payment_id).filter(Boolean);
      const payments = await Payment.find({ _id: { $in: paymentIds } })
        .select('settlements')
        .lean();
      const settlementByPaymentAndSeller = new Map();
      for (const payment of payments) {
        for (const settlement of payment.settlements) {
          settlementByPaymentAndSeller.set(
            `${payment._id.toString()}:${settlement.seller_id.toString()}`,
            settlement.status
          );
        }
      }
      for (const order of responseOrders) {
        order.seller_payout_status = ['UPI', 'Razorpay'].includes(order.payment_method)
          ? settlementByPaymentAndSeller.get(`${order.payment_id}:${authResult.user.id}`) || 'not_configured'
          : 'not_applicable';
      }
    }
    return NextResponse.json({ orders: responseOrders }, { status: 200 });
  } catch (error) {
    console.error('Fetch Orders error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function PATCH(request) {
  try {
    const authResult = await verifyAuth(request);
    if (authResult.error) {
      return NextResponse.json({ error: authResult.error }, { status: 401 });
    }

    let { order_id, status, rating } = await request.json();
    if (rating !== undefined) {
      const numRating = Number(rating);
      if (
        !order_id ||
        Number.isNaN(numRating) ||
        numRating < 0.5 ||
        numRating > 5 ||
        Math.abs(numRating * 2 - Math.round(numRating * 2)) > 1e-6
      ) {
        return NextResponse.json({ error: 'A rating between 0.5 and 5 is required' }, { status: 400 });
      }

      await connectDB();
      const existingOrder = await Order.findOne({ _id: order_id, buyer_id: authResult.user.id });
      if (!existingOrder) {
        return NextResponse.json({ error: 'Order not found or unauthorized' }, { status: 404 });
      }

      if (existingOrder.status !== 'completed' && existingOrder.status !== 'delivered') {
        return NextResponse.json({ error: 'Order must be delivered or completed to submit a rating' }, { status: 400 });
      }

      if (existingOrder.status === 'delivered') {
        existingOrder.status = 'completed';
        if (!existingOrder.completed_at) {
          existingOrder.completed_at = new Date();
        }
      }

      const oldRating = existingOrder.buyer_rating;
      existingOrder.buyer_rating = numRating;
      existingOrder.rated_at = new Date();
      await existingOrder.save();

      const ratedItem = await Item.findById(existingOrder.item_id);
      if (ratedItem) {
        const prevCount = Number(ratedItem.ratings_count) || 0;
        const prevAvg = Number(ratedItem.average_rating) || 0;
        let nextRatingsCount = prevCount;
        let nextAverage;

        if (oldRating != null && prevCount > 0) {
          const totalScore = (prevAvg * prevCount) - Number(oldRating) + numRating;
          nextAverage = totalScore / prevCount;
        } else {
          nextRatingsCount = prevCount + 1;
          nextAverage = ((prevAvg * prevCount) + numRating) / nextRatingsCount;
        }

        ratedItem.average_rating = Math.min(5, Math.max(0, Math.round(nextAverage * 10) / 10));
        ratedItem.ratings_count = nextRatingsCount;
        await ratedItem.save();
      }

      return NextResponse.json({ message: 'Rating saved', order: existingOrder }, { status: 200 });
    }

    if (!order_id || !['delivered', 'completed', 'rental_active', 'return_requested', 'cancelled', 'cancel_requested', 'pending', 'returned'].includes(status)) {
      return NextResponse.json({ error: 'A valid order and status are required' }, { status: 400 });
    }

    await connectDB();
    const order = await Order.findOne({ _id: order_id })
      .populate('item_id', 'name price images listing_type rental_period')
      .populate('seller_id', 'full_name email phone student_id department year_semester')
      .populate('buyer_id', 'full_name email phone student_id department year_semester');

    if (!order) {
      return NextResponse.json({ error: 'Order not found or cannot be completed' }, { status: 404 });
    }

    const userId = authResult.user.id.toString();
    const sellerId = order.seller_id._id.toString();
    const buyerId = order.buyer_id._id.toString();
    const isSeller = userId === sellerId;
    const isBuyer = userId === buyerId;
    const isRental = order.item_id.listing_type === 'rent';
    const now = new Date();
    const buyerConfirmedDelivery = isBuyer && (
      (status === 'completed' && !isRental && order.status === 'delivered')
      || (status === 'rental_active' && isRental && order.status === 'delivered')
    );

    if (['UPI', 'Razorpay'].includes(order.payment_method) && order.payment_status !== 'paid') {
      return NextResponse.json({ error: 'Order actions are unavailable until online payment is confirmed' }, { status: 409 });
    }

    if (status === 'cancel_requested') {
      if (!isBuyer || (order.status !== 'pending' && order.status !== 'cancel_requested')) {
        return NextResponse.json({ error: 'Only the buyer can cancel a pending order' }, { status: 400 });
      }
      status = 'cancelled';
    }

    if (status === 'delivered') {
      if (!isSeller || order.status !== 'pending') {
        return NextResponse.json({ error: 'Only the seller can mark a pending order as delivered' }, { status: 400 });
      }
    } else if (status === 'completed') {
      if (isRental) {
        if (!isSeller || order.status !== 'return_requested') {
          return NextResponse.json({ error: 'Only the seller can confirm a requested rental return' }, { status: 400 });
        }
        order.returned_at = now;
      } else if (isSeller && order.status === 'return_requested') {
        // Seller rejecting a purchase return request
        // order remains completed, no timestamps updated
      } else if (!isBuyer || order.status !== 'delivered') {
        return NextResponse.json({ error: 'Only the buyer can confirm a delivered sale' }, { status: 400 });
      } else {
        order.completed_at = now;
      }
    } else if (status === 'rental_active') {
      if (!isBuyer || !isRental || order.status !== 'delivered') {
        return NextResponse.json({ error: 'The buyer can confirm receipt only after delivery' }, { status: 400 });
      }

      const rentalStartedAt = now;
      const rentalDueAt = new Date(rentalStartedAt);
      const rentalDuration = order.rental_duration || 1;
      const rentalPeriod = ['hour', 'day', 'month'].includes(order.item_id.rental_period)
        ? order.item_id.rental_period
        : 'day';
      if (rentalPeriod === 'hour') rentalDueAt.setHours(rentalDueAt.getHours() + rentalDuration);
      if (rentalPeriod === 'day') rentalDueAt.setDate(rentalDueAt.getDate() + rentalDuration);
      if (rentalPeriod === 'month') rentalDueAt.setMonth(rentalDueAt.getMonth() + rentalDuration);
      order.rental_started_at = rentalStartedAt;
      order.rental_due_at = rentalDueAt;
    } else if (status === 'return_requested') {
      if (isRental) {
        if (!isBuyer || order.status !== 'rental_active') {
          return NextResponse.json({ error: 'The buyer can request a return only during an active rental' }, { status: 400 });
        }
        if (order.rental_due_at && now < order.rental_due_at) {
          return NextResponse.json({ error: `The rental ends on ${order.rental_due_at.toLocaleString()}` }, { status: 400 });
        }
      } else {
        if (!isBuyer || order.status !== 'completed') {
          return NextResponse.json({ error: 'Only completed purchases can be returned' }, { status: 400 });
        }
        const completedDate = order.completed_at || order.updatedAt;
        if ((now.getTime() - new Date(completedDate).getTime()) > 7 * 24 * 60 * 60 * 1000) {
          return NextResponse.json({ error: 'The 7-day return window has expired' }, { status: 400 });
        }
      }
      order.return_requested_at = now;
    } else if (status === 'returned') {
      if (!isSeller || order.status !== 'return_requested') {
        return NextResponse.json({ error: 'Only the seller can confirm a returned item' }, { status: 400 });
      }
      order.returned_at = now;

      // Process refund for online paid orders
      if (['UPI', 'Razorpay'].includes(order.payment_method) && order.payment_status === 'paid' && order.payment_id) {
        const payment = await Payment.findById(order.payment_id);
        const { refundOrderPayment } = await import('@/lib/paymentLifecycle');
        await refundOrderPayment(payment, order, 'Item return confirmed by seller');
      }

      // Restock inventory for returned item
      await Item.findByIdAndUpdate(order.item_id._id || order.item_id, {
        $inc: { quantity: order.quantity },
        $set: { is_active: true, marked_sold_at: null },
      });
    } else if (status === 'cancelled') {
      // Buyer cancelling directly or seller approving cancellation
      if (isBuyer) {
        if (order.status !== 'pending' && order.status !== 'cancel_requested') {
          return NextResponse.json({ error: 'Cannot cancel this order' }, { status: 400 });
        }
      } else if (isSeller) {
        // Seller approving cancellation request
        if (order.status !== 'cancel_requested' && order.status !== 'pending') {
          return NextResponse.json({ error: 'Cannot cancel this order' }, { status: 400 });
        }
      } else {
        return NextResponse.json({ error: 'Unauthorized to cancel' }, { status: 403 });
      }

      // Process refund for online paid orders
      if (['UPI', 'Razorpay'].includes(order.payment_method) && order.payment_status === 'paid' && order.payment_id) {
        const payment = await Payment.findById(order.payment_id);
        const { refundOrderPayment } = await import('@/lib/paymentLifecycle');
        await refundOrderPayment(payment, order, isBuyer ? 'Buyer cancelled order' : 'Seller approved cancellation');
      }

      // Restock inventory for cancelled order
      await Item.findByIdAndUpdate(order.item_id._id || order.item_id, {
        $inc: { quantity: order.quantity },
        $set: { is_active: true, marked_sold_at: null },
      });
    } else if (status === 'pending') {
      // Seller rejecting a cancellation request
      if (!isSeller || order.status !== 'cancel_requested') {
        return NextResponse.json({ error: 'Only the seller can reject a cancellation request' }, { status: 400 });
      }
    }

    order.status = status;
    await order.save();

    let payoutMessage = null;
    if (buyerConfirmedDelivery && order.payment_id) {
      const payment = await Payment.findById(order.payment_id);
      if (payment) {
        try {
          const result = await transferSellerFunds(payment);
          payoutMessage = result.message;
        } catch (error) {
          console.error('Seller payout transfer failed after delivery confirmation:', error);
          payoutMessage = 'Order completed; seller payout is delayed and will be retried.';
        }
      }
    }

    let notificationTitle = 'Order Update';
    let notificationBody = 'Your order has been updated.';
    
    if (status === 'delivered') {
      notificationTitle = 'Item delivered';
      notificationBody = `${order.item_id.name} was marked delivered. Please confirm that you received it.`;
    } else if (status === 'rental_active') {
      notificationTitle = 'Rental started';
      notificationBody = `${order.item_id.name} rental started. Please return it by ${order.rental_due_at.toLocaleString()}.`;
    } else if (status === 'return_requested') {
      notificationTitle = isRental ? 'Rental return requested' : 'Item return requested';
      notificationBody = isRental ? `${order.item_id.name} is ready to be returned. Please discuss the handover in Messages.` : `The buyer wants to return ${order.item_id.name}. Please discuss in Messages and approve the return.`;
    } else if (status === 'returned') {
      notificationTitle = 'Item returned & refund initiated';
      notificationBody = ['UPI', 'Razorpay'].includes(order.payment_method)
        ? `The return for ${order.item_id.name} was confirmed by the seller. A full refund has been initiated to your original payment method.`
        : `The return for ${order.item_id.name} was confirmed by the seller.`;
    } else if (status === 'completed') {
      if (isSeller && !isRental) {
        notificationTitle = 'Return request rejected';
        notificationBody = `The seller declined your return request for ${order.item_id.name}.`;
      } else {
        notificationTitle = isRental ? 'Rental completed' : 'Transaction successful';
        notificationBody = isRental ? `${order.item_id.name} was returned and the rental is complete.` : `${order.item_id.name} has been confirmed as received by the buyer.`;
      }
    } else if (status === 'cancel_requested') {
      notificationTitle = 'Order cancellation requested';
      notificationBody = `The buyer wants to cancel the order for ${order.item_id.name}. Please approve or reject.`;
    } else if (status === 'cancelled') {
      notificationTitle = 'Order cancelled';
      notificationBody = isBuyer
        ? `The order for ${order.item_id.name} was cancelled by the buyer.`
        : `The order for ${order.item_id.name} has been cancelled.`;
    } else if (status === 'pending') {
      notificationTitle = 'Cancellation rejected';
      notificationBody = `The seller declined to cancel the order for ${order.item_id.name}.`;
    }

    const recipientId = isSeller ? buyerId : sellerId;

    await sendNotification({
      recipientId: recipientId.toString(),
      senderId: authResult.user.id,
      type: 'ORDER',
      title: notificationTitle,
      body: notificationBody,
      relatedId: order._id
    }).catch((error) => console.error('Completion notification failed:', error));

    return NextResponse.json({
      message: `Order marked as ${status}`,
      ...(payoutMessage ? { payout_message: payoutMessage } : {}),
      order,
    }, { status: 200 });
  } catch (error) {
    console.error('Update order error:', error);
    return NextResponse.json({ error: error.message || 'Unable to update order', stack: error.stack }, { status: 500 });
  }
}
