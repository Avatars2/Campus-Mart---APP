import { NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import User from '@/models/User';
import AdminNotification from '@/models/AdminNotification';
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

    // Create an AdminNotification record so it's tracked in the admin dashboard history
    const savedAdminNotification = await AdminNotification.create({
      sender: adminUser._id,
      title: title.trim(),
      body: body.trim(),
      targetType: 'ALL',
      recipientCount: users.length,
      attachment: null,
    });
    
    // Send notification in chunked batches
    const BATCH_SIZE = 50;
    for (let i = 0; i < users.length; i += BATCH_SIZE) {
      const batch = users.slice(i, i + BATCH_SIZE);
      await Promise.all(
        batch.map((user) =>
          sendNotification({
            recipientId: user._id.toString(),
            senderId: adminUser._id.toString(),
            type: 'SYSTEM',
            subType: 'ADMIN_ANNOUNCEMENT',
            title: title.trim(),
            body: body.trim(),
            relatedId: savedAdminNotification._id,
            actionUrl: {
              targetScreen: 'NotificationDetail',
              params: { notificationId: savedAdminNotification._id.toString() },
            },
          }).catch((e) => console.error(`Failed to send to ${user._id}:`, e))
        )
      );
    }

    return NextResponse.json({
      message: `System alert sent to ${users.length} users`,
      notification: savedAdminNotification,
    });
  } catch (error) {
    console.error('Send System Alert Error:', error);
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 });
  }
}
