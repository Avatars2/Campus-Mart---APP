import { NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import Wishlist from '@/models/Wishlist';
import Item from '@/models/Item';
import { verifyAuth } from '@/lib/auth';

export async function GET(request) {
  try {
    const authResult = await verifyAuth(request);
    if (authResult.error) return NextResponse.json({ error: authResult.error }, { status: 401 });

    await connectDB();
    const userId = authResult.user.id;

    let wishlist = await Wishlist.findOne({ user: userId }).populate({
      path: 'items',
      populate: { path: 'seller_id', select: 'full_name profile_photo_url' }
    });
    
    if (!wishlist) {
      wishlist = await Wishlist.create({ user: userId, items: [] });
    }

    return NextResponse.json({ wishlist });
  } catch (error) {
    console.error('Wishlist GET Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const authResult = await verifyAuth(request);
    if (authResult.error) return NextResponse.json({ error: authResult.error }, { status: 401 });

    const { item_id } = await request.json();
    if (!item_id) return NextResponse.json({ error: 'Item ID is required' }, { status: 400 });

    await connectDB();
    const userId = authResult.user.id;

    const item = await Item.findById(item_id);
    if (!item) return NextResponse.json({ error: 'Item not found' }, { status: 404 });

    let wishlist = await Wishlist.findOne({ user: userId });
    if (!wishlist) {
      wishlist = new Wishlist({ user: userId, items: [] });
    }

    if (!wishlist.items.includes(item_id)) {
      wishlist.items.push(item_id);
      await wishlist.save();
    }

    return NextResponse.json({ message: 'Item added to wishlist', wishlist });
  } catch (error) {
    console.error('Wishlist POST Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
