import { NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import Cart from '@/models/Cart';
import Item from '@/models/Item';
import { verifyAuth } from '@/lib/auth';

const populateCart = (cartId) => Cart.findById(cartId).populate({
  path: 'items.item',
  populate: { path: 'seller_id', select: 'full_name profile_photo_url' }
});

export async function PATCH(request, { params }) {
  try {
    const authResult = await verifyAuth(request);
    if (authResult.error) return NextResponse.json({ error: authResult.error }, { status: 401 });

    const awaitedParams = await params;
    const { id } = awaitedParams;
    const { quantity } = await request.json();
    const nextQuantity = Number(quantity);

    if (!id || !Number.isInteger(nextQuantity) || nextQuantity < 1) {
      return NextResponse.json({ error: 'A valid item and quantity are required' }, { status: 400 });
    }

    await connectDB();
    const item = await Item.findById(id);
    if (!item) return NextResponse.json({ error: 'Item not found' }, { status: 404 });
    if (!item.is_active) return NextResponse.json({ error: 'Item is no longer available' }, { status: 400 });
    if (nextQuantity > item.quantity) {
      return NextResponse.json({ error: `Only ${item.quantity} item${item.quantity === 1 ? '' : 's'} available` }, { status: 400 });
    }

    const cart = await Cart.findOne({ user: authResult.user.id });
    if (!cart) return NextResponse.json({ error: 'Cart not found' }, { status: 404 });

    const cartItem = cart.items.find((entry) => entry.item.toString() === id);
    if (!cartItem) return NextResponse.json({ error: 'Item is not in your cart' }, { status: 404 });

    cartItem.quantity = nextQuantity;
    await cart.save();

    return NextResponse.json({ message: 'Cart quantity updated', cart: await populateCart(cart._id) }, { status: 200 });
  } catch (error) {
    console.error('Cart PATCH Item Error:', error);
    return NextResponse.json({ error: 'Unable to update cart quantity' }, { status: 500 });
  }
}

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
    
    const populatedCart = await populateCart(cart._id);

    return NextResponse.json({ message: 'Item removed from cart', cart: populatedCart });
  } catch (error) {
    console.error('Cart DELETE Item Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
