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

    const conversations = await Conversation.find({ 
      participants: userId,
      deletedBy: { $ne: userId }
    })
      .populate('participants', 'full_name profile_photo_url')
      .populate('item', 'name images price seller_id')
      .populate('lastMessage')
      .sort({ updatedAt: -1 });

    return NextResponse.json({ success: true, conversations }, { status: 200 });
  } catch (error) {
    console.error('Error in GET /api/messages/[userId]:', error);
    return NextResponse.json({ success: false, message: 'Server Error' }, { status: 500 });
  }
}

export async function DELETE(req, { params }) {
  try {
    await connectDB();
    const { userId: id } = await params; // This is the message ID in the DELETE context

    const url = new URL(req.url);
    const userId = url.searchParams.get('userId');
    const type = url.searchParams.get('type'); // 'for_me' or 'for_everyone'

    if (!id || !userId || !type) {
      return NextResponse.json({ success: false, message: 'Missing parameters' }, { status: 400 });
    }

    const message = await Message.findById(id);
    if (!message) {
      return NextResponse.json({ success: false, message: 'Message not found' }, { status: 404 });
    }

    if (type === 'for_everyone') {
      // Only sender can delete for everyone
      if (message.sender.toString() !== userId) {
        return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 403 });
      }
      await Message.findByIdAndDelete(id);
      return NextResponse.json({ success: true, action: 'deleted' }, { status: 200 });
    } else if (type === 'for_me') {
      // Add userId to deletedBy array
      if (!message.deletedBy.includes(userId)) {
        message.deletedBy.push(userId);
        await message.save();
      }
      return NextResponse.json({ success: true, action: 'hidden' }, { status: 200 });
    } else {
      return NextResponse.json({ success: false, message: 'Invalid type' }, { status: 400 });
    }
  } catch (error) {
    console.error('Error in DELETE /api/messages/[userId]:', error);
    return NextResponse.json({ success: false, message: 'Server Error' }, { status: 500 });
  }
}
