import { NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import User from '@/models/User';
import Item from '@/models/Item';
import Order from '@/models/Order';
import { verifyAuth } from '@/lib/auth';

export async function GET(request) {
  try {
    const authResult = await verifyAuth(request);
    
    // Check if user is authenticated
    if (authResult.error) {
      return NextResponse.json({ error: authResult.error }, { status: 401 });
    }

    await connectDB();
    const userId = authResult.user.id;

    // Retrieve the full user to verify role
    const user = await User.findById(userId);
    if (!user || user.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    // Calculate Dashboard Stats
    const totalUsers = await User.countDocuments();
    
    const activeItemsCount = await Item.countDocuments({ is_active: true });
    const soldItemsCount = await Item.countDocuments({ is_active: false });
    
    const totalOrders = await Order.countDocuments();
    
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
      },
      recentUsers,
    });
  } catch (error) {
    console.error('Admin Dashboard Error:', error);
    return NextResponse.json({ error: 'Internal server error fetching admin stats.' }, { status: 500 });
  }
}
