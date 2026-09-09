import { NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import Order from '@/models/Order';
import Item from '@/models/Item'; // required for population
import User from '@/models/User'; // required for population
import { verifyAuth } from '@/lib/auth';

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
      .populate('seller_id', 'full_name profile_photo_url')
      .populate('buyer_id', 'full_name profile_photo_url')
      .sort({ createdAt: -1 });

    return NextResponse.json({ orders }, { status: 200 });
  } catch (error) {
    console.error('Fetch Orders error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
