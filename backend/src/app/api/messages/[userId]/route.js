import { NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import Conversation from '@/models/Conversation';
import Message from '@/models/Message';
import User from '@/models/User';
import Item from '@/models/Item';
import BuyingRequest from '@/models/BuyingRequest';

export async function GET(req, { params }) {
  try {
    await connectDB();
    const { userId } = await params;

    if (!userId) {
      return NextResponse.json({ success: false, message: 'User ID is required' }, { status: 400 });
    }

    const rawConversations = await Conversation.find({ 
      participants: userId,
      deletedBy: { $ne: userId }
    })
      .populate('participants', 'full_name profile_photo_url')
      .populate('lastMessage')
      .sort({ updatedAt: -1 })
      .lean();

    const itemIds = rawConversations.map(c => c.item).filter(Boolean);
    const [items, buyingRequests] = await Promise.all([
      Item.find({ _id: { $in: itemIds } }).select('name images price seller_id').lean(),
      BuyingRequest.find({ _id: { $in: itemIds } }).select('title target_budget user_id request_type').lean(),
    ]);

    const itemMap = new Map(items.map(i => [String(i._id), i]));
    const requestMap = new Map(buyingRequests.map(r => [String(r._id), r]));

    const conversations = rawConversations.map(conv => {
      const idStr = String(conv.item);
      const foundItem = itemMap.get(idStr);
      if (foundItem) {
        return {
          ...conv,
          item: foundItem,
          isBuyingRequest: false,
        };
      }

      const foundRequest = requestMap.get(idStr);
      if (foundRequest) {
        // In a buying request:
        // foundRequest.user_id is the buyer who requested the item.
        // The other participant is the potential seller who messaged them!
        const requesterId = String(foundRequest.user_id);
        const otherParticipant = (conv.participants || []).find(p => String(p._id || p.id) !== requesterId);
        const sellerId = otherParticipant ? (otherParticipant._id || otherParticipant.id) : null;

        return {
          ...conv,
          item: {
            _id: foundRequest._id,
            id: foundRequest._id,
            name: `Request: ${foundRequest.title}`,
            price: foundRequest.target_budget || 0,
            seller_id: sellerId,
            requester_id: foundRequest.user_id,
            images: [],
            isBuyingRequest: true,
          },
          isBuyingRequest: true,
        };
      }

      return {
        ...conv,
        item: {
          _id: conv.item,
          id: conv.item,
          name: 'Item/Request',
          images: [],
          seller_id: null,
        },
      };
    });

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
