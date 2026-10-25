import { NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import Notification from '@/models/Notification';
import { verifyAuth } from '@/lib/auth';

export async function PUT(request, { params }) {
  try {
    const authResult = await verifyAuth(request);
    if (authResult.error) {
      return NextResponse.json({ error: authResult.error }, { status: 401 });
    }

    await connectDB();
    const userId = authResult.user.id;
    const resolvedParams = await params;
    const id = resolvedParams?.id || params?.id;

    const notification = await Notification.findOneAndUpdate(
      { _id: id, recipient: userId },
      { read: true },
      { new: true }
    );

    if (!notification) {
      return NextResponse.json({ error: 'Notification not found' }, { status: 404 });
    }

    return NextResponse.json({ message: 'Marked as read', notification });
  } catch (error) {
    console.error('Update Notification Error:', error);
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 });
  }
}

export async function DELETE(request, { params }) {
  try {
    const authResult = await verifyAuth(request);
    if (authResult.error) {
      return NextResponse.json({ error: authResult.error }, { status: 401 });
    }

    await connectDB();
    const userId = authResult.user.id;
    const resolvedParams = await params;
    const id = resolvedParams?.id || params?.id;

    const notification = await Notification.findOneAndDelete({
      _id: id,
      recipient: userId,
    });

    if (!notification) {
      return NextResponse.json({ error: 'Notification not found' }, { status: 404 });
    }

    return NextResponse.json({ message: 'Notification deleted successfully' });
  } catch (error) {
    console.error('Delete Notification Error:', error);
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 });
  }
}
