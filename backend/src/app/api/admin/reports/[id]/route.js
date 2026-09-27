import { NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import Report from '@/models/Report';
import { verifyAdminAuth } from '@/lib/auth';

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
      { new: true }
    );

    if (!report) {
      return NextResponse.json({ error: 'Report not found' }, { status: 404 });
    }

    return NextResponse.json({ message: 'Report updated', report });
  } catch (error) {
    console.error('Error in PUT /api/admin/reports/[id]:', error);
    return NextResponse.json({ error: 'Server error updating report' }, { status: 500 });
  }
}
