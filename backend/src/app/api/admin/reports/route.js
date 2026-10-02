import { NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import Report from '@/models/Report';
import User from '@/models/User';
import Item from '@/models/Item';
import { verifyAdminAuth } from '@/lib/auth';

export async function GET(request) {
  try {
    const adminCheck = await verifyAdminAuth(request);
    if (adminCheck.error) {
      return NextResponse.json({ error: adminCheck.error }, { status: adminCheck.status || 401 });
    }

    await connectDB();

    // Fetch reports and populate reporter
    const reports = await Report.find()
      .populate('reporter_id', 'full_name email')
      .sort({ createdAt: -1 })
      .lean();

    // Manually populate target details based on target_type
    const populatedReports = await Promise.all(reports.map(async (report) => {
      let targetInfo = null;
      if (report.target_type === 'user') {
        const user = await User.findById(report.target_id, 'full_name email role is_suspended profile_photo_url').lean();
        targetInfo = user ? { ...user, type: 'user' } : { error: 'User not found' };
      } else if (report.target_type === 'item') {
        const item = await Item.findById(report.target_id, 'name price is_active is_suspended').lean();
        targetInfo = item ? { ...item, type: 'item' } : { error: 'Item not found' };
      }
      return {
        ...report,
        target_info: targetInfo
      };
    }));

    return NextResponse.json(populatedReports);
  } catch (error) {
    console.error('Error in GET /api/admin/reports:', error);
    return NextResponse.json({ error: 'Server error fetching reports' }, { status: 500 });
  }
}
