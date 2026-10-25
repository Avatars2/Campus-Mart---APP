import { NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import AdminNotification from '@/models/AdminNotification';
import Notification from '@/models/Notification';
import { verifyAdminAuth } from '@/lib/auth';

export async function DELETE(request, { params }) {
  try {
    const adminCheck = await verifyAdminAuth(request);
    if (adminCheck.error) {
      return NextResponse.json({ error: adminCheck.error }, { status: adminCheck.status || 401 });
    }

    await connectDB();
    const resolvedParams = await params;
    const id = resolvedParams?.id || params?.id;

    if (!id) {
      return NextResponse.json({ error: 'Notification ID is required.' }, { status: 400 });
    }

    const deleted = await AdminNotification.findByIdAndDelete(id);
    if (!deleted) {
      return NextResponse.json({ error: 'Notification not found in database.' }, { status: 404 });
    }

    // Also remove all associated user inbox notifications dispatched with this notification
    await Notification.deleteMany({ relatedId: id });

    return NextResponse.json({ success: true, message: 'Notification deleted successfully.' });
  } catch (error) {
    console.error('Delete Admin Notification Error:', error);
    return NextResponse.json({ error: 'Internal server error deleting notification.' }, { status: 500 });
  }
}
