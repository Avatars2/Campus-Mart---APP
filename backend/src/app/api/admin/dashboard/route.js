import { NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import User from '@/models/User';
import Item from '@/models/Item';
import Order from '@/models/Order';
import Report from '@/models/Report';
import Category from '@/models/Category';
import { verifyAdminAuth } from '@/lib/auth';

export async function GET(request) {
  try {
    const adminCheck = await verifyAdminAuth(request);
    if (adminCheck.error) {
      return NextResponse.json({ error: adminCheck.error }, { status: adminCheck.status || 401 });
    }

    await connectDB();

    // Calculate Dashboard Stats
    const totalUsers = await User.countDocuments();
    
    const activeItemsCount = await Item.countDocuments({ is_active: true });
    const soldItemsCount = await Item.countDocuments({ is_active: false });
    
    const totalOrders = await Order.countDocuments();
    const totalCategories = await Category.countDocuments();
    const pendingReports = await Report.countDocuments({ status: 'pending' });
    
    // Recent activities or data (e.g., last 5 users)
    const recentUsers = await User.find()
      .sort({ createdAt: -1 })
      .limit(5)
      .select('full_name email createdAt role');

    return NextResponse.json({
      stats: {
        totalUsers,
        activeItems: activeItemsCount,
        soldItems: soldItemsCount,
        totalOrders,
        totalCategories,
        pendingReports,
      },
      recentUsers,
    });
  } catch (error) {
    console.error('Admin Dashboard Error:', error);
    return NextResponse.json({ error: 'Internal server error fetching admin stats.' }, { status: 500 });
  }
}
