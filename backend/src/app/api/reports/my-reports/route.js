import { NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import Report from '@/models/Report';
import User from '@/models/User';
import Item from '@/models/Item';
import { verifyAuth } from '@/lib/auth';

export async function GET(request) {
  try {
    const authResult = await verifyAuth(request);
    if (authResult.error) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status || 401 });
    }

    await connectDB();

    const reports = await Report.find({ reporter_id: authResult.user.id })
      .sort({ createdAt: -1 })
      .lean();

    const populatedReports = await Promise.all(reports.map(async (report) => {
      let targetInfo = null;
      if (report.target_type === 'user') {
        const user = await User.findById(report.target_id, 'full_name profile_photo_url').lean();
        targetInfo = user ? { full_name: user.full_name } : { full_name: 'Unknown User' };
      } else if (report.target_type === 'item') {
        const item = await Item.findById(report.target_id, 'name').lean();
        targetInfo = item ? { name: item.name } : { name: 'Unknown Item' };
      }
      return {
        ...report,
        target_info: targetInfo
      };
    }));

    return NextResponse.json(populatedReports);
  } catch (error) {
    console.error('Error in GET /api/reports/my-reports:', error);
    return NextResponse.json({ error: 'Server error while fetching reports.' }, { status: 500 });
  }
}
