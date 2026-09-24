import { NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import Message from '@/models/Message';
import Conversation from '@/models/Conversation';
import { pusherServer } from '@/lib/pusher';
import { cloudinary } from '@/lib/cloudinary';

const MAX_ATTACHMENT_BYTES = 10 * 1024 * 1024;
const ALLOWED_MIME_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'application/pdf',
  'text/plain',
  'text/csv',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/zip',
]);

export async function POST(req) {
  try {
    await connectDB();
    const isMultipart = req.headers.get('content-type')?.includes('multipart/form-data');
    let senderId;
    let receiverId;
    let itemId;
    let content = '';
    let attachments = [];

    if (isMultipart) {
      const formData = await req.formData();
      senderId = formData.get('senderId');
      receiverId = formData.get('receiverId');
      itemId = formData.get('itemId');
      content = formData.get('content') || '';
      const files = formData.getAll('attachment');

      for (const file of files) {
        if (!file || typeof file.arrayBuffer !== 'function' || file.size <= 0) continue;
        const mimeType = file.type || 'application/octet-stream';
        if (file.size > MAX_ATTACHMENT_BYTES || !ALLOWED_MIME_TYPES.has(mimeType)) {
          return NextResponse.json({ success: false, message: 'Unsupported file type or file larger than 10 MB' }, { status: 400 });
        }

        const buffer = Buffer.from(await file.arrayBuffer());
        const dataURI = `data:${mimeType};base64,${buffer.toString('base64')}`;
        const uploadResponse = await cloudinary.uploader.upload(dataURI, {
          folder: 'campusmart/messages',
          resource_type: mimeType.startsWith('image/') ? 'image' : 'raw',
        });

        attachments.push({
          url: uploadResponse.secure_url,
          downloadUrl: uploadResponse.secure_url,
          fileName: file.name || 'Attachment',
          mimeType,
          resourceType: uploadResponse.resource_type,
          bytes: file.size,
        });
      }
} else {
      const body = await req.json();
      
      // -- INJECTED OFFER LOGIC --
      if (body.action === 'create_offer') {
        const { senderId, receiverId, itemId, offerPrice } = body;
        if (!senderId || !receiverId || !itemId || !offerPrice) return NextResponse.json({ success: false, message: 'Missing fields' }, { status: 400 });
        const Item = require('@/models/Item').default || require('@/models/Item');
        const item = await Item.findById(itemId);
        if (!item) return NextResponse.json({ success: false, message: 'Item not found' }, { status: 404 });
        if (item.seller_id.toString() !== senderId) return NextResponse.json({ success: false, message: 'Only the seller can send an offer' }, { status: 403 });

        const expiresAt = new Date(Date.now() + 5 * 60 * 1000);
        const newMessage = await Message.create({
          sender: senderId, receiver: receiverId, item: itemId,
          content: `I've sent you a custom offer for ₹${offerPrice}!`,
          isSystemMessage: true,
          offer: { price: offerPrice, expiresAt, status: 'PENDING' }
        });
        
        let conversation = await Conversation.findOne({ participants: { $all: [senderId, receiverId] }, item: itemId });
        if (conversation) { conversation.lastMessage = newMessage._id; conversation.deletedBy = []; await conversation.save(); }
        else { await Conversation.create({ participants: [senderId, receiverId], item: itemId, lastMessage: newMessage._id }); }
        
        const channelName = `chat-${itemId}-${[senderId, receiverId].sort().join('-')}`;
        const populatedMessage = await Message.findById(newMessage._id).populate('sender', 'full_name profile_photo_url').populate('receiver', 'full_name profile_photo_url');
        await pusherServer.trigger(channelName, 'new-message', populatedMessage);
        await pusherServer.trigger(`user-${receiverId}`, 'conversation-update', { type: 'new_message', conversationId: conversation?._id });
        return NextResponse.json({ success: true, message: populatedMessage }, { status: 201 });
      }

      if (body.action === 'accept_offer') {
        const { messageId, userId } = body;
        if (!messageId || !userId) return NextResponse.json({ success: false, message: 'Missing fields' }, { status: 400 });
        const message = await Message.findById(messageId).populate('sender receiver');
        if (!message || !message.isSystemMessage || !message.offer) return NextResponse.json({ success: false, message: 'Invalid offer' }, { status: 400 });
        if (message.receiver._id.toString() !== userId) return NextResponse.json({ success: false, message: 'Only receiver can accept' }, { status: 403 });
        if (message.offer.status !== 'PENDING') return NextResponse.json({ success: false, message: `Offer is ${message.offer.status}` }, { status: 400 });
        
        if (new Date() > new Date(message.offer.expiresAt)) {
          message.offer.status = 'EXPIRED'; await message.save();
          const channelName = `chat-${message.item.toString()}-${[message.sender._id.toString(), message.receiver._id.toString()].sort().join('-')}`;
          await pusherServer.trigger(channelName, 'offer-updated', message);
          return NextResponse.json({ success: false, message: 'Expired' }, { status: 400 });
        }
        
        message.offer.status = 'ACCEPTED'; await message.save();
        const channelName = `chat-${message.item.toString()}-${[message.sender._id.toString(), message.receiver._id.toString()].sort().join('-')}`;
        await pusherServer.trigger(channelName, 'offer-updated', message);
        return NextResponse.json({ success: true, message }, { status: 200 });
      }
      // -- END INJECTED OFFER LOGIC --

      senderId = body.senderId;
      receiverId = body.receiverId;
      itemId = body.itemId;
      content = body.content || '';
    }

    if (!senderId || !receiverId || !itemId || (!content.trim() && attachments.length === 0)) {
      return NextResponse.json({ success: false, message: 'Missing required fields' }, { status: 400 });
    }

    const newMessage = await Message.create({
      sender: senderId,
      receiver: receiverId,
      item: itemId,
      content,
      attachment: attachments[0] || undefined,
      attachments,
    });
    const savedMessage = await Message.findById(newMessage._id).lean();
    const messageId = savedMessage._id.toString();
    savedMessage.attachments = (savedMessage.attachments || []).map((file, index) => ({
      ...file,
      openUrl: `/api/messages/attachments/${messageId}/${index}`,
    }));
    if (savedMessage.attachment?.url) {
      savedMessage.attachment = {
        ...savedMessage.attachment,
        openUrl: `/api/messages/attachments/${messageId}/0`,
      };
    }

    // Update or create conversation
    let conversation = await Conversation.findOne({
      participants: { $all: [senderId, receiverId] },
      item: itemId,
    });

    if (conversation) {
      conversation.lastMessage = newMessage._id;
      conversation.deletedBy = []; // Re-show conversation if it was deleted
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
      await pusherServer.trigger(channelName, 'new-message', savedMessage);
      
      // Also trigger to a user specific channel for the conversation list update
      await pusherServer.trigger(`user-${receiverId}`, 'conversation-update', {
        message: 'New message received',
        newMessage: savedMessage
      });
    } catch (pusherError) {
      console.warn('Pusher trigger failed (likely due to fake credentials), but message was saved:', pusherError.message);
    }

    return NextResponse.json({ success: true, message: savedMessage }, { status: 201 });
  } catch (error) {
    console.error('Error in POST /api/messages:', error);
    return NextResponse.json({ success: false, message: 'Server Error' }, { status: 500 });
  }
}


