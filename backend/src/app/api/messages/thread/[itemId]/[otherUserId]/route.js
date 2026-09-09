import { NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import Message from '@/models/Message';

export async function GET(req, { params }) {
  try {
    await connectDB();
    const { itemId, otherUserId } = await params;
    
    const url = new URL(req.url);
    const userId = url.searchParams.get('userId'); // Current logged in user

    if (!itemId || !otherUserId || !userId) {
      return NextResponse.json({ success: false, message: 'Missing parameters' }, { status: 400 });
    }

    const messages = await Message.find({
      item: itemId,
      $or: [
        { sender: userId, receiver: otherUserId },
        { sender: otherUserId, receiver: userId }
      ]
    }).sort({ createdAt: 1 });

    return NextResponse.json({ success: true, messages }, { status: 200 });
  } catch (error) {
    console.error('Error in GET /api/messages/thread:', error);
    return NextResponse.json({ success: false, message: 'Server Error' }, { status: 500 });
  }
}
