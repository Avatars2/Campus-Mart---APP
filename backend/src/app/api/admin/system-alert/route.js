import { NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import User from '@/models/User';
import { verifyAuth } from '@/lib/auth';
import { sendNotification } from '@/utils/notificationHelper';

export async function POST(request) {
  try {
    const authResult = await verifyAuth(request);
    if (authResult.error) {
      return NextResponse.json({ error: authResult.error }, { status: 401 });
    }

    await connectDB();
    const adminUser = await User.findById(authResult.user.id);

    if (adminUser.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized. Admin only.' }, { status: 403 });
    }

    const { title, body } = await request.json();

    if (!title || !body) {
      return NextResponse.json({ error: 'Title and body are required' }, { status: 400 });
    }

    // Get all users
    const users = await User.find({ _id: { $ne: adminUser._id } }).select('_id');
    
    // Send notification to all users (In a real production app, this should be a background job/queue)
    const promises = users.map(user => 
      sendNotification({
        recipientId: user._id.toString(),
        senderId: adminUser._id.toString(),
        type: 'SYSTEM',
        title,
        body,
      }).catch(e => console.error(`Failed to send to ${user._id}:`, e)) // catch individual errors so loop doesn't break
    );

    await Promise.all(promises);

    return NextResponse.json({ message: `System alert sent to ${users.length} users` });
  } catch (error) {
    console.error('Send System Alert Error:', error);
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 });
  }
}
