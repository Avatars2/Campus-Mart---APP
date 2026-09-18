import { NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import Order from '@/models/Order';
import Item from '@/models/Item'; // required for population
import User from '@/models/User'; // required for population
import { verifyAuth } from '@/lib/auth';
import { sendNotification } from '@/utils/notificationHelper';

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
      query = { seller_id: userId };
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

    return NextResponse.json({ orders }, { status: 200 });
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

    const { order_id, status, rating } = await request.json();
    if (rating !== undefined) {
      if (!order_id || !Number.isInteger(Number(rating)) || Number(rating) < 1 || Number(rating) > 5) {
        return NextResponse.json({ error: 'A rating from 1 to 5 is required' }, { status: 400 });
      }

      await connectDB();
      const ratedOrder = await Order.findOneAndUpdate(
        { _id: order_id, buyer_id: authResult.user.id, status: 'completed', buyer_rating: null },
        { buyer_rating: Number(rating), rated_at: new Date() },
        { new: true }
      );

      if (!ratedOrder) {
        return NextResponse.json({ error: 'Order is not eligible for rating' }, { status: 400 });
      }

      const ratedItem = await Item.findById(ratedOrder.item_id);
      if (ratedItem) {
        const nextRatingsCount = ratedItem.ratings_count + 1;
        ratedItem.average_rating = ((ratedItem.average_rating * ratedItem.ratings_count) + Number(rating)) / nextRatingsCount;
        ratedItem.ratings_count = nextRatingsCount;
        await ratedItem.save();
      }

      return NextResponse.json({ message: 'Rating saved', order: ratedOrder }, { status: 200 });
    }

    if (!order_id || !['delivered', 'completed', 'rental_active', 'return_requested'].includes(status)) {
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
      } else if (!isBuyer || order.status !== 'delivered') {
        return NextResponse.json({ error: 'Only the buyer can confirm a delivered sale' }, { status: 400 });
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
      if (!isBuyer || !isRental || order.status !== 'rental_active') {
        return NextResponse.json({ error: 'The buyer can request a return only during an active rental' }, { status: 400 });
      }
      if (order.rental_due_at && now < order.rental_due_at) {
        return NextResponse.json({ error: `The rental ends on ${order.rental_due_at.toLocaleString()}` }, { status: 400 });
      }
      order.return_requested_at = now;
    }

    order.status = status;
    await order.save();

    const recipientId = isSeller ? buyerId : sellerId;
    const notificationTitle = status === 'delivered'
      ? 'Item delivered'
      : status === 'rental_active'
        ? 'Rental started'
        : status === 'return_requested'
          ? 'Rental return requested'
          : isRental ? 'Rental completed' : 'Transaction successful';
    const notificationBody = status === 'delivered'
      ? `${order.item_id.name} was marked delivered. Please confirm that you received it.`
      : status === 'rental_active'
        ? `${order.item_id.name} rental started. Please return it by ${order.rental_due_at.toLocaleString()}.`
        : status === 'return_requested'
          ? `${order.item_id.name} is ready to be returned. Please discuss the handover in Messages.`
          : isRental
            ? `${order.item_id.name} was returned and the rental is complete.`
            : `${order.item_id.name} has been confirmed as received by the buyer.`;

    await sendNotification({
      recipientId: recipientId.toString(),
      senderId: authResult.user.id,
      type: 'ORDER',
      title: notificationTitle,
      body: notificationBody,
      relatedId: order._id
    }).catch((error) => console.error('Completion notification failed:', error));

    return NextResponse.json({ message: `Order marked as ${status}`, order }, { status: 200 });
  } catch (error) {
    console.error('Update order error:', error);
    return NextResponse.json({ error: 'Unable to update order' }, { status: 500 });
  }
}
