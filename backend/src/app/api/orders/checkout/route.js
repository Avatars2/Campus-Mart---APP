import { NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import Order from '@/models/Order';
import Item from '@/models/Item';
import { verifyAuth } from '@/lib/auth';
import { sendNotification } from '@/utils/notificationHelper';
import Cart from '@/models/Cart';

export async function POST(request) {
  try {
    const authResult = await verifyAuth(request);
    if (authResult.error) {
      return NextResponse.json({ error: authResult.error }, { status: 401 });
    }

    const { items, payment_method, delivery_address, from_cart } = await request.json();
    const buyer_id = authResult.user.id;

    if (!items || items.length === 0) {
      return NextResponse.json({ error: 'Cart is empty' }, { status: 400 });
    }

    await connectDB();
    const createdOrders = [];

    for (const itemData of items) {
      const dbItem = await Item.findById(itemData.id);

      if (!dbItem || !dbItem.is_active) {
        return NextResponse.json({ error: `Item ${dbItem?.name || 'Unknown'} is no longer available` }, { status: 400 });
      }

      if (dbItem.seller_id.toString() === buyer_id) {
        return NextResponse.json({ error: `You cannot buy your own item: ${dbItem.name}` }, { status: 400 });
      }

      if (dbItem.listing_type === 'rent') {
        const activeRental = await Order.exists({
          item_id: dbItem._id,
          status: { $in: ['pending', 'delivered', 'rental_active', 'return_requested'] },
        });
        if (activeRental) {
          return NextResponse.json({ error: `${dbItem.name} is currently rented and unavailable` }, { status: 400 });
        }
      }

      const rentalDuration = dbItem.listing_type === 'rent' ? Number(itemData.rental_duration || 1) : null;
      if (dbItem.listing_type === 'rent' && (!Number.isInteger(rentalDuration) || rentalDuration < 1)) {
        return NextResponse.json({ error: `Choose a valid rental duration for ${dbItem.name}` }, { status: 400 });
      }

      const order = await Order.create({
        buyer_id,
        seller_id: dbItem.seller_id,
        item_id: dbItem._id,
        quantity: 1,
        total_price: dbItem.listing_type === 'rent' ? dbItem.price * rentalDuration : dbItem.price,
        rental_duration: rentalDuration,
        payment_method: payment_method || 'Cash',
        delivery_address: delivery_address || 'Campus Pickup',
        status: 'pending'
      });

      await order.populate([
        { path: 'item_id', select: 'name price images listing_type rental_period' },
        { path: 'seller_id', select: 'full_name email phone student_id department year_semester' },
        { path: 'buyer_id', select: 'full_name email phone student_id department year_semester' },
      ]);

      if (dbItem.listing_type !== 'rent') {
        // Decrement quantity based on how many were ordered
        const orderQuantity = itemData.quantity || 1;
        dbItem.quantity = Math.max(0, dbItem.quantity - orderQuantity);
        
        // Only mark as inactive/sold if quantity reaches 0
        if (dbItem.quantity === 0) {
          dbItem.is_active = false;
          dbItem.marked_sold_at = new Date();
        }
        await dbItem.save();
      }

      createdOrders.push(order);

      // Send notification to the seller
      await sendNotification({
        recipientId: dbItem.seller_id.toString(),
        senderId: buyer_id,
        type: 'ORDER',
        title: 'New Order Received!',
        body: dbItem.listing_type === 'rent'
          ? `Someone requested to rent ${dbItem.name} for ${rentalDuration} ${dbItem.rental_period || 'day'}${rentalDuration === 1 ? '' : 's'}.`
          : `Someone just bought your item: ${dbItem.name}`,
        relatedId: order._id
      }).catch(err => console.error('Notification failed to send:', err));
    }

    if (from_cart) {
      await Cart.findOneAndUpdate({ user: buyer_id }, { items: [] });
    }

    return NextResponse.json({ message: 'Checkout successful', orders: createdOrders }, { status: 201 });
  } catch (error) {
    console.error('Checkout error:', error);
    return NextResponse.json({ error: error.message || 'Error during checkout' }, { status: 400 });
  }
}
