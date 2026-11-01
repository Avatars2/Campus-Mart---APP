import { NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import Item from '@/models/Item';
import { verifyAdminAuth } from '@/lib/auth';
import { pusherServer } from '@/lib/pusher';

// Delete an item (Moderation)
export async function DELETE(request, { params }) {
  try {
    const adminCheck = await verifyAdminAuth(request);
    if (adminCheck.error) {
      return NextResponse.json({ error: adminCheck.error }, { status: adminCheck.status || 401 });
    }

    const resolvedParams = await params;
    const { id } = resolvedParams;

    await connectDB();
    
    const item = await Item.findById(id);
    if (!item) {
      return NextResponse.json({ error: 'Item not found' }, { status: 404 });
    }

    // Fully delete the item from the DB
    await Item.findByIdAndDelete(id);

    try {
      await pusherServer.trigger('market-items', 'item:deleted', { itemId: id.toString() });
      await pusherServer.trigger('admin-channel', 'item:deleted', { itemId: id.toString() });
      if (item.seller_id) {
        await pusherServer.trigger(`user-${item.seller_id}`, 'item:deleted', { itemId: id.toString() });
      }
    } catch (pErr) {
      console.warn('[Pusher] admin delete item error:', pErr.message);
    }

    return NextResponse.json({ 
      message: 'Item deleted successfully by admin'
    });

  } catch (error) {
    console.error('Admin Item Delete Error:', error);
    return NextResponse.json({ error: 'Internal server error deleting item.' }, { status: 500 });
  }
}

// Unpublish/Hide an item without deleting it
export async function PUT(request, { params }) {
  try {
    const adminCheck = await verifyAdminAuth(request);
    if (adminCheck.error) {
      return NextResponse.json({ error: adminCheck.error }, { status: adminCheck.status || 401 });
    }

    const resolvedParams = await params;
    const { id } = resolvedParams;
    const { is_active } = await request.json();

    if (is_active === undefined) {
      return NextResponse.json({ error: 'Missing is_active status' }, { status: 400 });
    }

    await connectDB();
    
    const item = await Item.findById(id);
    if (!item) {
      return NextResponse.json({ error: 'Item not found' }, { status: 404 });
    }

    item.is_active = is_active;
    item.is_suspended = !is_active; // If not active, it's suspended by admin
    await item.save();

    try {
      const itemPayload = item.toJSON ? item.toJSON() : item;
      await pusherServer.trigger('market-items', 'item:updated', { itemId: item._id.toString(), item: itemPayload });
      await pusherServer.trigger('admin-channel', 'item:updated', { itemId: item._id.toString(), item: itemPayload });
      if (item.seller_id) {
        await pusherServer.trigger(`user-${item.seller_id}`, 'item:updated', { itemId: item._id.toString(), item: itemPayload });
      }
    } catch (pErr) {
      console.warn('[Pusher] admin update item error:', pErr.message);
    }

    return NextResponse.json({ 
      message: `Item ${is_active ? 're-published' : 'unpublished'} successfully`, 
      item: { id: item._id, name: item.name, is_active: item.is_active, is_suspended: item.is_suspended }
    });

  } catch (error) {
    console.error('Admin Item Update Error:', error);
    return NextResponse.json({ error: 'Internal server error updating item.' }, { status: 500 });
  }
}
