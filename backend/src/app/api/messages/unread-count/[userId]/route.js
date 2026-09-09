import { NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import Message from '@/models/Message';

export async function GET(req, { params }) {
  try {
    await connectDB();
    const { userId } = await params;

    if (!userId) {
      return NextResponse.json({ success: false, message: 'User ID is required' }, { status: 400 });
    }

    const unreadCount = await Message.countDocuments({
      receiver: userId,
      read: false
    });

    return NextResponse.json({ success: true, count: unreadCount }, { status: 200 });
  } catch (error) {
    console.error('Error in GET /api/messages/unread-count:', error);
    return NextResponse.json({ success: false, message: 'Server Error' }, { status: 500 });
  }
}
