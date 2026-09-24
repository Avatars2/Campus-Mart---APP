import { NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import Message from '@/models/Message';
import Conversation from '@/models/Conversation';
import Item from '@/models/Item';
import { pusherServer } from '@/lib/pusher';

export async function POST(req) {
  try {
    await connectDB();
    const { senderId, receiverId, itemId, offerPrice } = await req.json();

    if (!senderId || !receiverId || !itemId || !offerPrice) {
      return NextResponse.json({ success: false, message: 'Missing fields' }, { status: 400 });
    }

    const item = await Item.findById(itemId);
    if (!item) {
      return NextResponse.json({ success: false, message: 'Item not found' }, { status: 404 });
    }

    // Verify sender is the seller
    if (item.seller_id.toString() !== senderId) {
      return NextResponse.json({ success: false, message: 'Only the seller can send an offer' }, { status: 403 });
    }

    // Create the system message with offer details
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes
    
    const message = await Message.create({
      sender: senderId,
      receiver: receiverId,
      item: itemId,
      content: `I've sent you a custom offer for ?${offerPrice}!`,
      isSystemMessage: true,
      offer: {
        price: offerPrice,
        expiresAt: expiresAt,
        status: 'PENDING'
      }
    });

    let conversation = await Conversation.findOne({
      participants: { $all: [senderId, receiverId] },
      item: itemId
    });

    if (!conversation) {
      conversation = await Conversation.create({
        participants: [senderId, receiverId],
        item: itemId,
        lastMessage: message._id
      });
    } else {
      conversation.lastMessage = message._id;
      // Also undo deletion for both if they deleted it previously
      conversation.deletedBy = [];
      await conversation.save();
    }

    // Trigger Pusher events
    const sortedIds = [senderId, receiverId].sort();
    const channelName = `chat-${itemId}-${sortedIds.join('-')}`;
    
    const populatedMessage = await Message.findById(message._id)
      .populate('sender', 'full_name profile_photo_url')
      .populate('receiver', 'full_name profile_photo_url');

    await pusherServer.trigger(channelName, 'new-message', populatedMessage);

    // Notify receiver's global channel
    await pusherServer.trigger(`user-${receiverId}`, 'conversation-update', {
      type: 'new_message',
      conversationId: conversation._id
    });

    return NextResponse.json({ success: true, message: populatedMessage }, { status: 201 });
  } catch (error) {
    console.error('Error in offer create:', error);
    return NextResponse.json({ success: false, message: 'Server Error' }, { status: 500 });
  }
}
