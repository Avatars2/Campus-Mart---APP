import { NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import Message from '@/models/Message';
import { pusherServer } from '@/lib/pusher';

export async function POST(req) {
  try {
    await connectDB();
    const { messageId, userId } = await req.json();

    if (!messageId || !userId) {
      return NextResponse.json({ success: false, message: 'Missing fields' }, { status: 400 });
    }

    const message = await Message.findById(messageId).populate('sender receiver');
    if (!message) {
      return NextResponse.json({ success: false, message: 'Message not found' }, { status: 404 });
    }

    if (!message.isSystemMessage || !message.offer) {
      return NextResponse.json({ success: false, message: 'Not an offer message' }, { status: 400 });
    }

    if (message.receiver._id.toString() !== userId) {
      return NextResponse.json({ success: false, message: 'Only the receiver can accept the offer' }, { status: 403 });
    }

    if (message.offer.status !== 'PENDING') {
      return NextResponse.json({ success: false, message: `Offer is already ${message.offer.status.toLowerCase()}` }, { status: 400 });
    }

    if (new Date() > new Date(message.offer.expiresAt)) {
      message.offer.status = 'EXPIRED';
      await message.save();
      
      const sortedIds = [message.sender._id.toString(), message.receiver._id.toString()].sort();
      const channelName = `chat-${message.item.toString()}-${sortedIds.join('-')}`;
      await pusherServer.trigger(channelName, 'offer-updated', message);
      
      return NextResponse.json({ success: false, message: 'Offer has expired' }, { status: 400 });
    }

    // Accept the offer
    message.offer.status = 'ACCEPTED';
    await message.save();

    // Notify both parties of the update
    const sortedIds = [message.sender._id.toString(), message.receiver._id.toString()].sort();
    const channelName = `chat-${message.item.toString()}-${sortedIds.join('-')}`;
    await pusherServer.trigger(channelName, 'offer-updated', message);

    return NextResponse.json({ success: true, message }, { status: 200 });
  } catch (error) {
    console.error('Error in offer accept:', error);
    return NextResponse.json({ success: false, message: 'Server Error' }, { status: 500 });
  }
}
