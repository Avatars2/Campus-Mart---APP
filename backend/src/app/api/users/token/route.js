import { NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import User from '@/models/User';
import { verifyAuth } from '@/lib/auth';

export async function POST(request) {
  try {
    const authResult = await verifyAuth(request);
    if (authResult.error) {
      return NextResponse.json({ error: authResult.error }, { status: 401 });
    }

    await connectDB();
    const userId = authResult.user.id;
    const { fcmToken } = await request.json();

    if (!fcmToken) {
      return NextResponse.json({ error: 'FCM token is required' }, { status: 400 });
    }

    await User.findByIdAndUpdate(userId, { fcmToken });

    return NextResponse.json({ message: 'Token saved successfully' });
  } catch (error) {
    console.error('Save FCM Token Error:', error);
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 });
  }
}
