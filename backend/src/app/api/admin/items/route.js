import { NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import Item from '@/models/Item';
import { verifyAdminAuth } from '@/lib/auth';

export async function GET(request) {
  try {
    const adminCheck = await verifyAdminAuth(request);
    if (adminCheck.error) {
      return NextResponse.json({ error: adminCheck.error }, { status: adminCheck.status || 401 });
    }

    await connectDB();

    // Retrieve all non-sold items, latest first
    const items = await Item.find({ marked_sold_at: null })
      .populate('seller_id', 'full_name email student_id is_suspended phone profile_photo_url')
      .populate('category_id', 'name')
      .sort({ createdAt: -1 });

    return NextResponse.json(items);
  } catch (error) {
    console.error('Admin Items Error:', error);
    return NextResponse.json({ error: 'Internal server error fetching items.' }, { status: 500 });
  }
}
