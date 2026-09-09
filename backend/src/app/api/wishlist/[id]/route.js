import { NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import Wishlist from '@/models/Wishlist';
import { verifyAuth } from '@/lib/auth';

export async function DELETE(request, { params }) {
  try {
    const authResult = await verifyAuth(request);
    if (authResult.error) return NextResponse.json({ error: authResult.error }, { status: 401 });

    const awaitedParams = await params;
    const { id } = awaitedParams;
    if (!id) return NextResponse.json({ error: 'Item ID is required' }, { status: 400 });

    await connectDB();
    const userId = authResult.user.id;

    const wishlist = await Wishlist.findOne({ user: userId });
    if (!wishlist) {
      return NextResponse.json({ error: 'Wishlist not found' }, { status: 404 });
    }

    wishlist.items = wishlist.items.filter(itemId => itemId.toString() !== id);
    await wishlist.save();

    return NextResponse.json({ message: 'Item removed from wishlist', wishlist });
  } catch (error) {
    console.error('Wishlist DELETE Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
