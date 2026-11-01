import { NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import Report from '@/models/Report';
import { verifyAdminAuth } from '@/lib/auth';
import { sendNotification } from '@/utils/notificationHelper';
import { pusherServer } from '@/lib/pusher';

export async function PUT(request, { params }) {
  try {
    const adminCheck = await verifyAdminAuth(request);
    if (adminCheck.error) {
      return NextResponse.json({ error: adminCheck.error }, { status: adminCheck.status || 401 });
    }

    const resolvedParams = await params;
    const { id } = resolvedParams;

    const { status, admin_notes } = await request.json();

    if (!status || !['pending', 'resolved', 'dismissed'].includes(status)) {
      return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
    }

    await connectDB();

    const report = await Report.findByIdAndUpdate(
      id,
      { status, admin_notes: admin_notes || '' },
      { returnDocument: 'after' }
    );

    if (!report) {
      return NextResponse.json({ error: 'Report not found' }, { status: 404 });
    }

    // Notify the student reporter of the moderation decision
    try {
      if (report.reporter_id) {
        const statusLabel = status === 'resolved' ? 'Resolved' : 'Dismissed';
        const bodyMsg = status === 'resolved'
          ? `Your report regarding "${report.reason}" has been reviewed and resolved by campus moderation.`
          : `Your report regarding "${report.reason}" has been reviewed and closed.`;

        await sendNotification({
          recipientId: report.reporter_id.toString(),
          senderId: adminCheck.user.id.toString(),
          type: 'REPORT',
          subType: 'REPORT_STATUS_UPDATE',
          title: `📋 Report ${statusLabel}`,
          body: bodyMsg,
          relatedId: report._id,
          actionUrl: {
            targetScreen: 'ReportDetails',
            params: { reportId: report._id.toString() },
          },
        });

        await pusherServer.trigger(`user-${report.reporter_id}`, 'report:updated', {
          reportId: report._id.toString(),
          status,
          report: report.toJSON ? report.toJSON() : report,
        });

        await pusherServer.trigger('admin-channel', 'report:updated', {
          reportId: report._id.toString(),
          status,
          report: report.toJSON ? report.toJSON() : report,
        });
      }
    } catch (reporterNotifErr) {
      console.warn('Failed to notify reporter of status update:', reporterNotifErr.message);
    }

    return NextResponse.json({ message: 'Report updated', report });
  } catch (error) {
    console.error('Error in PUT /api/admin/reports/[id]:', error);
    return NextResponse.json({ error: 'Server error updating report' }, { status: 500 });
  }
}
