import { NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import Report from '@/models/Report';
import User from '@/models/User';
import { verifyAuth } from '@/lib/auth';
import { cloudinary } from '@/lib/cloudinary';
import { sendNotification } from '@/utils/notificationHelper';
import { pusherServer } from '@/lib/pusher';

export async function POST(request) {
  try {
    const authResult = await verifyAuth(request);
    if (authResult.error) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status || 401 });
    }

    const contentType = request.headers.get('content-type') || '';
    let target_type, target_id, reason, description, proof_url = '';

    if (contentType.includes('multipart/form-data')) {
      const formData = await request.formData();
      target_type = formData.get('target_type');
      target_id = formData.get('target_id');
      reason = formData.get('reason');
      description = formData.get('description');
      
      const file = formData.get('proof_image');
      if (file && typeof file !== 'string' && file.size > 0) {
        const bytes = await file.arrayBuffer();
        const buffer = Buffer.from(bytes);
        const dataURI = 'data:' + (file.type || 'image/jpeg') + ';base64,' + buffer.toString('base64');
        
        const uploadResult = await cloudinary.uploader.upload(dataURI, {
          folder: 'campus_mart_reports',
          transformation: [{ width: 800, crop: 'limit' }]
        });
        proof_url = uploadResult.secure_url;
      }
    } else {
      const body = await request.json();
      target_type = body.target_type;
      target_id = body.target_id;
      reason = body.reason;
      description = body.description;
    }

    if (!target_type || !['item', 'user'].includes(target_type)) {
      return NextResponse.json({ error: 'Invalid target type' }, { status: 400 });
    }
    if (!target_id || !reason) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    await connectDB();

    const report = new Report({
      reporter_id: authResult.user.id,
      target_type,
      target_id,
      reason,
      description: description || '',
      proof_image: proof_url || null,
      status: 'pending',
    });

    await report.save();

    // Notify admins of new pending report for immediate moderation
    try {
      const adminUsers = await User.find({ role: 'admin' }).select('_id');
      const reporterUser = await User.findById(authResult.user.id).select('full_name');
      const reporterName = reporterUser?.full_name || 'A student';

      for (const admin of adminUsers) {
        sendNotification({
          recipientId: admin._id.toString(),
          senderId: authResult.user.id.toString(),
          type: 'REPORT',
          subType: 'ADMIN_REPORT_ALERT',
          title: `⚠️ New Report: ${reason}`,
          body: `${reporterName} submitted a report against a ${target_type}. Review in Admin Reports.`,
          relatedId: report._id,
          thumbnail: proof_url || null,
          actionUrl: {
            targetScreen: 'AdminReports',
            params: { reportId: report._id.toString() },
          },
        }).catch((err) => console.error('Admin report notification failed:', err));
      }
    } catch (adminNotifErr) {
      console.warn('Failed to notify admins of new report:', adminNotifErr.message);
    }

    try {
      await pusherServer.trigger('admin-channel', 'report:new', {
        reportId: report._id.toString(),
        report: report.toJSON ? report.toJSON() : report,
      });
    } catch (pusherErr) {
      console.warn('[Pusher] admin report:new warning:', pusherErr.message);
    }

    return NextResponse.json({ message: 'Report submitted successfully', report }, { status: 201 });
  } catch (error) {
    console.error('Error in POST /api/reports:', error);
    return NextResponse.json({ error: 'Server error while submitting report.' }, { status: 500 });
  }
}
