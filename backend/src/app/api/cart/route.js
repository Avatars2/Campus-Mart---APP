import { NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import Cart from '@/models/Cart';
import Item from '@/models/Item';
import { verifyAuth } from '@/lib/auth';

export async function GET(request) {
  try {
    const authResult = await verifyAuth(request);
    if (authResult.error) return NextResponse.json({ error: authResult.error }, { status: 401 });

    await connectDB();
    const userId = authResult.user.id;

    let cart = await Cart.findOne({ user: userId }).populate({
      path: 'items.item',
      populate: { path: 'seller_id', select: 'full_name profile_photo_url' }
    });
    
    if (!cart) {
      cart = await Cart.create({ user: userId, items: [] });
    }

    // Check if any items have been marked sold (is_active: false). The frontend should know this.
    // We could filter them out, or leave them so the user knows they went out of stock.
    // The user requested: "that are not cart expire but that are status chenge of that items"
    // So we just return them, but maybe add a flag to tell frontend they are inactive.
    
    return NextResponse.json({ cart });
  } catch (error) {
    console.error('Cart GET Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const authResult = await verifyAuth(request);
    if (authResult.error) return NextResponse.json({ error: authResult.error }, { status: 401 });

    const { item_id, quantity = 1 } = await request.json();
    if (!item_id) return NextResponse.json({ error: 'Item ID is required' }, { status: 400 });

    await connectDB();
    const userId = authResult.user.id;

    const item = await Item.findById(item_id);
    if (!item) return NextResponse.json({ error: 'Item not found' }, { status: 404 });
    if (!item.is_active) return NextResponse.json({ error: 'Item is no longer available' }, { status: 400 });
    if (item.seller_id.toString() === userId) return NextResponse.json({ error: 'Cannot add your own item to cart' }, { status: 400 });

    let cart = await Cart.findOne({ user: userId });
    if (!cart) {
      cart = new Cart({ user: userId, items: [] });
    }

    const existingItemIndex = cart.items.findIndex(ci => ci.item.toString() === item_id);
    if (existingItemIndex > -1) {
      cart.items[existingItemIndex].quantity += quantity;
    } else {
      cart.items.push({ item: item_id, quantity });
    }

    await cart.save();
    
    // Return populated cart
    const populatedCart = await Cart.findById(cart._id).populate({
      path: 'items.item',
      populate: { path: 'seller_id', select: 'full_name profile_photo_url' }
    });

    return NextResponse.json({ message: 'Item added to cart', cart: populatedCart });
  } catch (error) {
    console.error('Cart POST Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function DELETE(request) {
  // Clear entirely if no id is provided
  try {
    const authResult = await verifyAuth(request);
    if (authResult.error) return NextResponse.json({ error: authResult.error }, { status: 401 });

    await connectDB();
    const userId = authResult.user.id;

    await Cart.findOneAndUpdate({ user: userId }, { items: [] });
    return NextResponse.json({ message: 'Cart cleared successfully' });
  } catch (error) {
    console.error('Cart Clear Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
