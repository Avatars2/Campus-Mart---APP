import { NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import User from '@/models/User';
import AdminNotification from '@/models/AdminNotification';
import { verifyAdminAuth } from '@/lib/auth';
import { cloudinary } from '@/lib/cloudinary';
import { sendNotification } from '@/utils/notificationHelper';

export const dynamic = 'force-dynamic';

export async function GET(request) {
  try {
    const adminCheck = await verifyAdminAuth(request);
    if (adminCheck.error) {
      return NextResponse.json({ error: adminCheck.error }, { status: adminCheck.status || 401 });
    }

    await connectDB();

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '20', 10);
    const search = searchParams.get('search') || '';
    const targetType = searchParams.get('targetType') || '';

    const query = {};
    if (targetType && ['ALL', 'SPECIFIC'].includes(targetType.toUpperCase())) {
      query.targetType = targetType.toUpperCase();
    }
    if (search.trim()) {
      query.$or = [
        { title: { $regex: search.trim(), $options: 'i' } },
        { body: { $regex: search.trim(), $options: 'i' } },
      ];
    }

    const skip = (page - 1) * limit;

    const [notifications, total] = await Promise.all([
      AdminNotification.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate('sender', 'full_name email')
        .populate('targetUser', 'full_name email role profile_photo_url')
        .lean(),
      AdminNotification.countDocuments(query),
    ]);

    return NextResponse.json({
      notifications,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit) || 1,
      },
    });
  } catch (error) {
    console.error('Fetch Admin Notifications Error:', error);
    return NextResponse.json({ error: 'Internal server error fetching notifications.' }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const adminCheck = await verifyAdminAuth(request);
    if (adminCheck.error) {
      return NextResponse.json({ error: adminCheck.error }, { status: adminCheck.status || 401 });
    }

    await connectDB();
    const adminUser = adminCheck.dbUser || (await User.findById(adminCheck.user.id));

    const contentType = request.headers.get('content-type') || '';
    let title = '';
    let body = '';
    let targetType = 'ALL';
    let targetUserId = null;
    let attachmentData = null;

    if (contentType.includes('multipart/form-data')) {
      const formData = await request.formData();
      title = formData.get('title') || '';
      body = formData.get('body') || '';
      targetType = (formData.get('targetType') || 'ALL').toUpperCase();
      targetUserId = formData.get('targetUserId') || null;

      const file = formData.get('attachment') || formData.get('pdf');
      if (file && typeof file !== 'string' && file.size > 0) {
        if (file.size > 10 * 1024 * 1024) {
          return NextResponse.json({ error: 'Attached document exceeds 10MB limit.' }, { status: 400 });
        }

        const mimeType = file.type || 'application/pdf';
        const fileName = file.name || 'document.pdf';

        const bytes = await file.arrayBuffer();
        const buffer = Buffer.from(bytes);
        const dataURI = `data:${mimeType};base64,${buffer.toString('base64')}`;

        const uploadResult = await cloudinary.uploader.upload(dataURI, {
          folder: 'campusmart/admin_notifications',
          resource_type: 'raw',
        });

        attachmentData = {
          url: uploadResult.secure_url,
          name: fileName,
          mimeType,
          size: file.size,
        };
      }
    } else {
      const json = await request.json();
      title = json.title || '';
      body = json.body || '';
      targetType = (json.targetType || 'ALL').toUpperCase();
      targetUserId = json.targetUserId || null;
      if (json.attachment) {
        attachmentData = json.attachment;
      }
    }

    if (!title.trim() || !body.trim()) {
      return NextResponse.json({ error: 'Title and message body are required.' }, { status: 400 });
    }

    if (!['ALL', 'SPECIFIC'].includes(targetType)) {
      return NextResponse.json({ error: 'Invalid target type. Must be ALL or SPECIFIC.' }, { status: 400 });
    }

    let recipientUsers = [];
    let populatedTargetUser = null;

    if (targetType === 'SPECIFIC') {
      if (!targetUserId) {
        return NextResponse.json({ error: 'Specific student ID is required.' }, { status: 400 });
      }

      populatedTargetUser = await User.findById(targetUserId).select('full_name email role profile_photo_url');
      if (!populatedTargetUser) {
        return NextResponse.json({ error: 'Selected student not found.' }, { status: 404 });
      }
      recipientUsers = [populatedTargetUser];
    } else {
      // Send to all students / non-admin users
      recipientUsers = await User.find({
        role: { $ne: 'admin' },
        is_suspended: { $ne: true },
      }).select('_id full_name email');
    }

    // Save Admin Notification record
    const adminNotification = new AdminNotification({
      sender: adminUser._id,
      title: title.trim(),
      body: body.trim(),
      targetType,
      targetUser: populatedTargetUser ? populatedTargetUser._id : null,
      recipientCount: recipientUsers.length,
      attachment: attachmentData,
    });
    const savedAdminNotification = await adminNotification.save();

    // Dispatch notifications in background promises
    const promises = recipientUsers.map((recipient) =>
      sendNotification({
        recipientId: recipient._id.toString(),
        senderId: adminUser._id.toString(),
        type: 'SYSTEM',
        title: title.trim(),
        body: body.trim(),
        relatedId: savedAdminNotification._id,
        attachment: attachmentData,
      }).catch((err) => {
        console.error(`Failed to send notification to recipient ${recipient._id}:`, err);
      })
    );

    await Promise.all(promises);

    return NextResponse.json({
      success: true,
      message:
        targetType === 'ALL'
          ? `Notification successfully sent to all ${recipientUsers.length} students.`
          : `Notification successfully sent to ${populatedTargetUser.full_name}.`,
      notification: savedAdminNotification,
    });
  } catch (error) {
    console.error('Create Admin Notification Error:', error);
    return NextResponse.json({ error: error.message || 'Failed to dispatch notification.' }, { status: 500 });
  }
}

