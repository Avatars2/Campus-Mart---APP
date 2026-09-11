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
      .populate('item_id', 'name price images')
      .populate('seller_id', 'full_name email phone student_id profile_photo_url')
      .populate('buyer_id', 'full_name email phone student_id profile_photo_url')
      .sort({ createdAt: -1 });

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

    if (!order_id || !['delivered', 'completed'].includes(status)) {
      return NextResponse.json({ error: 'A valid order and status are required' }, { status: 400 });
    }

    await connectDB();
    const isSellerDelivery = status === 'delivered';
    const order = await Order.findOneAndUpdate(
      {
        _id: order_id,
        [isSellerDelivery ? 'seller_id' : 'buyer_id']: authResult.user.id,
        status: isSellerDelivery ? 'pending' : 'delivered',
      },
      { status },
      { new: true }
    )
      .populate('item_id', 'name price images')
      .populate('seller_id', 'full_name email phone student_id department year_semester')
      .populate('buyer_id', 'full_name email phone student_id department year_semester');

    if (!order) {
      return NextResponse.json({ error: 'Order not found or cannot be completed' }, { status: 404 });
    }

    const recipientId = isSellerDelivery ? order.buyer_id._id : order.seller_id._id;
    const notificationTitle = isSellerDelivery ? 'Item delivered' : 'Transaction successful';
    const notificationBody = isSellerDelivery
      ? `${order.item_id.name} was marked delivered. Please confirm that you received it.`
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
