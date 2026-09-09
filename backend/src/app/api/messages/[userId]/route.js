import { NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import Conversation from '@/models/Conversation';
import Message from '@/models/Message';
import User from '@/models/User';
import Item from '@/models/Item';

export async function GET(req, { params }) {
  try {
    await connectDB();
    const { userId } = await params;

    if (!userId) {
      return NextResponse.json({ success: false, message: 'User ID is required' }, { status: 400 });
    }

    const conversations = await Conversation.find({ participants: userId })
      .populate('participants', 'full_name profile_photo_url')
      .populate('item', 'name images price')
      .populate('lastMessage')
      .sort({ updatedAt: -1 });

    return NextResponse.json({ success: true, conversations }, { status: 200 });
  } catch (error) {
    console.error('Error in GET /api/messages/[userId]:', error);
    return NextResponse.json({ success: false, message: 'Server Error' }, { status: 500 });
  }
}
