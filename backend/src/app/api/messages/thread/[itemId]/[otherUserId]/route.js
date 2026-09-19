import { NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import Message from '@/models/Message';
import Conversation from '@/models/Conversation';

const withDownloadUrl = (attachment) => {
  if (!attachment?.url) return attachment;
  return {
    ...attachment,
    downloadUrl: attachment.url,
  };
};

export async function GET(req, { params }) {
  try {
    await connectDB();
    const { itemId, otherUserId } = await params;
    
    const url = new URL(req.url);
    const userId = url.searchParams.get('userId'); // Current logged in user

    if (!itemId || !otherUserId || !userId) {
      return NextResponse.json({ success: false, message: 'Missing parameters' }, { status: 400 });
    }

    const messages = await Message.find({
      item: itemId,
      deletedBy: { $ne: userId },
      $or: [
        { sender: userId, receiver: otherUserId },
        { sender: otherUserId, receiver: userId }
      ]
    }).sort({ createdAt: 1 }).lean();

    return NextResponse.json({
      success: true,
      messages: messages.map(message => ({
        ...message,
        attachment: message.attachment?.url ? withDownloadUrl({
          url: message.attachment.url,
          downloadUrl: message.attachment.downloadUrl,
          fileName: message.attachment.fileName,
          mimeType: message.attachment.mimeType,
          resourceType: message.attachment.resourceType,
          bytes: message.attachment.bytes,
        }) : null,
        attachments: message.attachments?.length
          ? message.attachments.map((attachment, index) => ({
            ...withDownloadUrl(attachment),
            openUrl: `/api/messages/attachments/${message._id}/${index}`,
          }))
          : (message.attachment?.url ? [{
            ...withDownloadUrl(message.attachment),
            openUrl: `/api/messages/attachments/${message._id}/0`,
          }] : []),
      })),
    }, { status: 200 });
  } catch (error) {
    console.error('Error in GET /api/messages/thread:', error);
    return NextResponse.json({ success: false, message: 'Server Error' }, { status: 500 });
  }
}

export async function DELETE(req, { params }) {
  try {
    await connectDB();
    const { itemId, otherUserId } = await params;
    
    const url = new URL(req.url);
    const userId = url.searchParams.get('userId'); // Current logged in user

    if (!itemId || !otherUserId || !userId) {
      return NextResponse.json({ success: false, message: 'Missing parameters' }, { status: 400 });
    }

    // Find all messages in this thread
    const messages = await Message.find({
      item: itemId,
      $or: [
        { sender: userId, receiver: otherUserId },
        { sender: otherUserId, receiver: userId }
      ]
    });

    // Add userId to deletedBy array for each message safely
    const updatePromises = messages.map(async (msg) => {
      if (!msg.deletedBy) {
        msg.deletedBy = [];
      }
      if (!msg.deletedBy.map(id => id.toString()).includes(userId)) {
        msg.deletedBy.push(userId);
        return msg.save();
      }
    });

    await Promise.all(updatePromises);

    // Also hide the Conversation document from the user's Inbox
    const conversation = await Conversation.findOne({
      item: itemId,
      participants: { $all: [userId, otherUserId] }
    });

    if (conversation) {
      if (!conversation.deletedBy) {
        conversation.deletedBy = [];
      }
      if (!conversation.deletedBy.map(id => id.toString()).includes(userId)) {
        conversation.deletedBy.push(userId);
        await conversation.save();
      }
    }

    return NextResponse.json({ success: true, message: 'Chat cleared successfully' }, { status: 200 });
  } catch (error) {
    console.error('Error in DELETE /api/messages/thread:', error);
    return NextResponse.json({ success: false, message: 'Server Error' }, { status: 500 });
  }
}
