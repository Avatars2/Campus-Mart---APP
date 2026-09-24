import { NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import Message from '@/models/Message';
import Conversation from '@/models/Conversation';
import { pusherServer } from '@/lib/pusher';

export async function DELETE(req, { params }) {
  try {
    await connectDB();
    const { messageId } = await params;
    
    const url = new URL(req.url);
    const userId = url.searchParams.get('userId');
    const type = url.searchParams.get('type'); // 'me' or 'everyone'

    if (!messageId || !userId || !type) {
      return NextResponse.json({ success: false, message: 'Missing parameters' }, { status: 400 });
    }

    const message = await Message.findById(messageId);
    if (!message) {
      return NextResponse.json({ success: false, message: 'Message not found' }, { status: 404 });
    }

    if (type === 'everyone') {
      if (message.sender.toString() !== userId) {
        return NextResponse.json({ success: false, message: 'Not authorized to delete for everyone' }, { status: 403 });
      }
      await Message.findByIdAndDelete(messageId);
      
      // Notify other user via Pusher
      try {
        const channelName = 'chat-' + message.item + '-' + [message.sender.toString(), message.receiver.toString()].sort().join('-');
        await pusherServer.trigger(channelName, 'message-deleted', { messageId });
      } catch (pusherError) {
        console.warn('Pusher trigger failed:', pusherError.message);
      }
    } else if (type === 'me') {
      if (!message.deletedBy) {
        message.deletedBy = [];
      }
      if (!message.deletedBy.map(id => id.toString()).includes(userId)) {
        message.deletedBy.push(userId);
        await message.save();
      }
    }

    // Update conversation's lastMessage
    const conversation = await Conversation.findOne({
      item: message.item,
      participants: { $all: [message.sender, message.receiver] }
    });

    if (conversation) {
      const lastMsg = await Message.findOne({
        item: message.item,
        $or: [
          { sender: message.sender, receiver: message.receiver },
          { sender: message.receiver, receiver: message.sender }
        ]
      }).sort({ createdAt: -1 });

      if (lastMsg) {
        conversation.lastMessage = lastMsg._id;
      } else {
        conversation.lastMessage = null;
      }
      await conversation.save();
    }

    return NextResponse.json({ success: true, message: 'Message deleted successfully' });
  } catch (error) {
    console.error('Error in DELETE /api/messages/delete:', error);
    return NextResponse.json({ success: false, message: 'Server Error' }, { status: 500 });
  }
}
