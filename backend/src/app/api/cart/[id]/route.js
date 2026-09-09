import { NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import Cart from '@/models/Cart';
import { verifyAuth } from '@/lib/auth';

export async function DELETE(request, { params }) {
  try {
    const authResult = await verifyAuth(request);
    if (authResult.error) return NextResponse.json({ error: authResult.error }, { status: 401 });

    const awaitedParams = await params;
    const { id } = awaitedParams; // This is the item id
    if (!id) return NextResponse.json({ error: 'Item ID is required' }, { status: 400 });

    await connectDB();
    const userId = authResult.user.id;

    const cart = await Cart.findOne({ user: userId });
    if (!cart) {
      return NextResponse.json({ error: 'Cart not found' }, { status: 404 });
    }

    cart.items = cart.items.filter(ci => ci.item.toString() !== id);
    await cart.save();
    
    const populatedCart = await Cart.findById(cart._id).populate({
      path: 'items.item',
      populate: { path: 'seller_id', select: 'full_name profile_photo_url' }
    });

    return NextResponse.json({ message: 'Item removed from cart', cart: populatedCart });
  } catch (error) {
    console.error('Cart DELETE Item Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
