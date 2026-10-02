import { NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import Order from '@/models/Order';
import { verifyAdminAuth } from '@/lib/auth';

export async function GET(request) {
  try {
    const adminCheck = await verifyAdminAuth(request);
    if (adminCheck.error) {
      return NextResponse.json({ error: adminCheck.error }, { status: adminCheck.status || 401 });
    }

    await connectDB();

    // Fetch all orders for comprehensive admin view
    const orders = await Order.find()
      .populate('buyer_id', 'full_name email')
      .populate('seller_id', 'full_name email')
      .populate('item_id', 'name price')
      .sort({ createdAt: -1 });

    return NextResponse.json(orders);
  } catch (error) {
    console.error('Admin Orders Error:', error);
    return NextResponse.json({ error: 'Internal server error fetching orders.' }, { status: 500 });
  }
}
