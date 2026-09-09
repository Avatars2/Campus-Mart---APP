import { NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import Message from '@/models/Message';
import { pusherServer } from '@/lib/pusher';

export async function PUT(req) {
  try {
    await connectDB();
    const { messageId } = await req.json();

    if (!messageId) {
      return NextResponse.json({ success: false, message: 'Missing messageId' }, { status: 400 });
    }

    const message = await Message.findById(messageId);
    if (!message) {
      return NextResponse.json({ success: false, message: 'Message not found' }, { status: 404 });
    }

    message.delivered = true;
    await message.save();

    // Trigger a pusher event to notify the sender that their message was delivered
    const channelName = `chat-${message.item.toString()}-${[message.sender.toString(), message.receiver.toString()].sort().join('-')}`;
    
    try {
      await pusherServer.trigger(channelName, 'messages-delivered', {
        messageId: message._id.toString()
      });
    } catch (pusherError) {
      console.warn('Pusher trigger failed in deliver:', pusherError.message);
    }

    return NextResponse.json({ success: true, message: 'Message delivered' }, { status: 200 });
  } catch (error) {
    console.error('Error in PUT /api/messages/deliver:', error);
    return NextResponse.json({ success: false, message: 'Server Error' }, { status: 500 });
  }
}
