import { NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import Notification from '@/models/Notification';
import { verifyAuth } from '@/lib/auth';

export async function GET(request) {
  try {
    const authResult = await verifyAuth(request);
    if (authResult.error) {
      return NextResponse.json({ error: authResult.error }, { status: 401 });
    }

    await connectDB();
    const userId = authResult.user.id;

    const notifications = await Notification.find({ recipient: userId })
      .sort({ createdAt: -1 })
      .populate('sender', 'full_name profile_photo_url');

    return NextResponse.json({ notifications });
  } catch (error) {
    console.error('Get Notifications Error:', error);
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 });
  }
}
