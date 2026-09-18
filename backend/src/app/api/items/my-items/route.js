import { NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import Item from '@/models/Item';
import Category from '@/models/Category';
import Order from '@/models/Order';
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

    const rentalItemIds = items.filter(item => item.listing_type === 'rent').map(item => item._id);
    const rentedItemIds = await Order.find({
      item_id: { $in: rentalItemIds },
      status: { $in: ['pending', 'delivered', 'rental_active', 'return_requested'] },
    }).distinct('item_id');
    const rentedItemIdSet = new Set(rentedItemIds.map(id => id.toString()));

    const formattedItems = items.map(item => ({
      ...item.toJSON(),
      category_name: item.category_id?.name,
      is_currently_rented: item.listing_type === 'rent' && rentedItemIdSet.has(item._id.toString()),
    }));

    return NextResponse.json(formattedItems);
  } catch (error) {
    console.error('Error fetching my items:', error);
    return NextResponse.json({ error: 'Server error fetching items' }, { status: 500 });
  }
}
