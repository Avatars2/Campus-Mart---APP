import { NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import Message from '@/models/Message';
import { verifyAuth } from '@/lib/auth';

export async function GET(request, { params }) {
  try {
    // Verify user is authenticated
    const auth = await verifyAuth(request);
    if (auth.error) {
      return NextResponse.json({ error: auth.error }, { status: 401 });
    }

    await connectDB();
    const { messageId, index } = await params;
    const message = await Message.findById(messageId).lean();
    const attachmentIndex = Number(index);
    const attachments = message?.attachments?.length
      ? message.attachments
      : (message?.attachment?.url ? [message.attachment] : []);
    const attachment = attachments[attachmentIndex];

    if (!attachment?.url || !Number.isInteger(attachmentIndex)) {
      return NextResponse.json({ error: 'Attachment not found' }, { status: 404 });
    }

    // Verify the requesting user is the sender or receiver of this message
    const userId = auth.user.id || auth.user._id;
    if (String(message.sender) !== String(userId) && String(message.receiver) !== String(userId)) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    const response = await fetch(attachment.url);
    if (!response.ok || !response.body) {
      return NextResponse.json({ error: 'Unable to fetch attachment' }, { status: 502 });
    }

    const fileName = (attachment.fileName || 'Attachment').replace(/[^a-zA-Z0-9._-]/g, '_');
    return new Response(response.body, {
      status: 200,
      headers: {
        'Content-Type': attachment.mimeType || response.headers.get('content-type') || 'application/octet-stream',
        'Content-Disposition': `inline; filename="${fileName}"`,
        'Cache-Control': 'private, max-age=3600',
      },
    });
  } catch (error) {
    console.error('Error opening message attachment:', error);
    return NextResponse.json({ error: 'Unable to open attachment' }, { status: 500 });
  }
}