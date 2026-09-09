import { NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import Message from '@/models/Message';
import { pusherServer } from '@/lib/pusher';

export async function PUT(req) {
  try {
    await connectDB();
    const { itemId, senderId, receiverId } = await req.json();

    if (!itemId || !senderId || !receiverId) {
      return NextResponse.json({ success: false, message: 'Missing required fields' }, { status: 400 });
    }

    // We mark all messages AS READ where:
    // the current user (receiverId) is the receiver, and the other user (senderId) is the sender.
    const result = await Message.updateMany(
      { item: itemId, sender: senderId, receiver: receiverId, read: false },
      { $set: { read: true, delivered: true } }
    );

    if (result.modifiedCount > 0) {
      // Trigger a pusher event to notify the sender that their messages were read
      const channelName = `chat-${itemId}-${[senderId, receiverId].sort().join('-')}`;
      await pusherServer.trigger(channelName, 'messages-read', {
        readerId: receiverId
      });
      
      // We can also trigger user specific channel to update the badge count
      await pusherServer.trigger([`user-${senderId}`, `user-${receiverId}`], 'conversation-update', {
        message: 'Messages read'
      });
    }

    return NextResponse.json({ success: true, modifiedCount: result.modifiedCount }, { status: 200 });
  } catch (error) {
    console.error('Error in PUT /api/messages/read:', error);
    return NextResponse.json({ success: false, message: 'Server Error' }, { status: 500 });
  }
}
