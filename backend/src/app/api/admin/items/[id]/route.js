import { NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import Item from '@/models/Item';
import { verifyAdminAuth } from '@/lib/auth';

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

    return NextResponse.json({ 
      message: `Item ${is_active ? 're-published' : 'unpublished'} successfully`, 
      item: { id: item._id, name: item.name, is_active: item.is_active, is_suspended: item.is_suspended }
    });

  } catch (error) {
    console.error('Admin Item Update Error:', error);
    return NextResponse.json({ error: 'Internal server error updating item.' }, { status: 500 });
  }
}
