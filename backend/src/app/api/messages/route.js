import { NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import Message from '@/models/Message';
import Conversation from '@/models/Conversation';
import { pusherServer } from '@/lib/pusher';
import mongoose from 'mongoose';

export async function POST(req) {
  try {
    await connectDB();
    const { senderId, receiverId, itemId, content } = await req.json();

    if (!senderId || !receiverId || !itemId || !content) {
      return NextResponse.json({ success: false, message: 'Missing required fields' }, { status: 400 });
    }

    const newMessage = await Message.create({
      sender: senderId,
      receiver: receiverId,
      item: itemId,
      content,
    });

    // Update or create conversation
    let conversation = await Conversation.findOne({
      participants: { $all: [senderId, receiverId] },
      item: itemId,
    });

    if (conversation) {
      conversation.lastMessage = newMessage._id;
      await conversation.save();
    } else {
      await Conversation.create({
        participants: [senderId, receiverId],
        item: itemId,
        lastMessage: newMessage._id,
      });
    }

    try {
      // Trigger pusher event to a specific channel based on item and participants
      const channelName = `chat-${itemId}-${[senderId, receiverId].sort().join('-')}`;
      await pusherServer.trigger(channelName, 'new-message', newMessage);
      
      // Also trigger to a user specific channel for the conversation list update
      await pusherServer.trigger(`user-${receiverId}`, 'conversation-update', {
        message: 'New message received',
        newMessage: newMessage
      });
    } catch (pusherError) {
      console.warn('Pusher trigger failed (likely due to fake credentials), but message was saved:', pusherError.message);
    }

    return NextResponse.json({ success: true, message: newMessage }, { status: 201 });
  } catch (error) {
    console.error('Error in POST /api/messages:', error);
    return NextResponse.json({ success: false, message: 'Server Error' }, { status: 500 });
  }
}
