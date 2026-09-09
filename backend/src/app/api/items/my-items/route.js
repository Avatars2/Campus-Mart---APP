import { NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import Item from '@/models/Item';
import Category from '@/models/Category';
import { verifyAuth } from '@/lib/auth';

export async function GET(request) {
  try {
    const authResult = await verifyAuth(request);
    if (authResult.error) {
      return NextResponse.json({ error: authResult.error }, { status: 401 });
    }

    const seller_id = authResult.user.id;
    await connectDB();

    const items = await Item.find({ seller_id })
      .populate('category_id', 'name')
      .sort({ createdAt: -1 });

    const formattedItems = items.map(item => ({
      ...item.toJSON(),
      category_name: item.category_id?.name,
    }));

    return NextResponse.json(formattedItems);
  } catch (error) {
    console.error('Error fetching my items:', error);
    return NextResponse.json({ error: 'Server error fetching items' }, { status: 500 });
  }
}
