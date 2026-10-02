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

    // 1. Basic Stats
    const totalUsers = await User.countDocuments();
    const activeItemsCount = await Item.countDocuments({ is_active: true });
    const soldItemsCount = await Order.countDocuments({ status: 'completed' });
    const totalOrders = await Order.countDocuments();
    
    // Order Detailed Counts
    const pendingOrdersCount = await Order.countDocuments({ status: { $in: ['pending', 'cancel_requested'] } });
    const confirmedOrdersCount = await Order.countDocuments({ status: { $in: ['delivered', 'completed', 'rental_active'] } });
    const cancelledOrdersCount = await Order.countDocuments({ status: 'cancelled' });
    const returnedOrdersCount = await Order.countDocuments({ status: { $in: ['returned', 'return_requested'] } });

    const totalCategories = await Category.countDocuments();
    const pendingReports = await Report.countDocuments({ status: 'pending' });

    // 2. Trend Calculations (Last 7 days count)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const newUsersWeek = await User.countDocuments({ createdAt: { $gte: sevenDaysAgo } });
    const newItemsWeek = await Item.countDocuments({ createdAt: { $gte: sevenDaysAgo } });
    const newOrdersWeek = await Order.countDocuments({ createdAt: { $gte: sevenDaysAgo } });
    const newCategoriesWeek = await Category.countDocuments({ createdAt: { $gte: sevenDaysAgo } });

    // 3. Platform Activity (Dynamic Range)
    const range = request.nextUrl.searchParams.get('range') || '7d';

    let activityStartDate = new Date();
    let numPoints = 7;
    let isMonthly = false;

    if (range === '30d') {
      activityStartDate.setDate(activityStartDate.getDate() - 29);
      numPoints = 30;
    } else if (range === '1y') {
      activityStartDate.setMonth(activityStartDate.getMonth() - 11);
      activityStartDate.setDate(1);
      numPoints = 12;
      isMonthly = true;
    } else {
      activityStartDate.setDate(activityStartDate.getDate() - 6);
      numPoints = 7;
    }
    activityStartDate.setHours(0, 0, 0, 0);

    const dateFormat = isMonthly ? "%Y-%m" : "%Y-%m-%d";

    const dailyUsers = await User.aggregate([
      { $match: { createdAt: { $gte: activityStartDate } } },
      {
        $group: {
          _id: { $dateToString: { format: dateFormat, date: "$createdAt" } },
          count: { $sum: 1 }
        }
      }
    ]);

    const dailyItems = await Item.aggregate([
      { $match: { createdAt: { $gte: activityStartDate } } },
      {
        $group: {
          _id: { $dateToString: { format: dateFormat, date: "$createdAt" } },
          count: { $sum: 1 }
        }
      }
    ]);

    const activityData = {
      labels: [],
      newUsers: [],
      newItems: []
    };

    if (isMonthly) {
      for (let i = 11; i >= 0; i--) {
        const d = new Date();
        d.setMonth(d.getMonth() - i);
        const monthStr = d.toISOString().substring(0, 7);
        const shortMonth = d.toLocaleDateString('en-US', { month: 'short' });
        activityData.labels.push(shortMonth);
        
        const uCount = dailyUsers.find(x => x._id === monthStr)?.count || 0;
        const iCount = dailyItems.find(x => x._id === monthStr)?.count || 0;
        
        activityData.newUsers.push(uCount);
        activityData.newItems.push(iCount);
      }
    } else {
      for (let i = numPoints - 1; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        const dateStr = d.toISOString().split('T')[0];
        // For 30d, just use the day number to save space, or "M/D"
        const shortDate = numPoints === 30 
          ? d.toLocaleDateString('en-US', { month: 'numeric', day: 'numeric' })
          : d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        activityData.labels.push(shortDate);
        
        const uCount = dailyUsers.find(x => x._id === dateStr)?.count || 0;
        const iCount = dailyItems.find(x => x._id === dateStr)?.count || 0;
        
        activityData.newUsers.push(uCount);
        activityData.newItems.push(iCount);
      }
    }

    // 4. Item Distribution (by category)
    const categoryDistribution = await Item.aggregate([
      { $match: { is_active: true } },
      {
        $group: {
          _id: "$category_id",
          count: { $sum: 1 }
        }
      }
    ]);

    const categories = await Category.find();
    const distributionData = categoryDistribution.map(cd => {
      const cat = categories.find(c => c._id.toString() === cd._id.toString());
      return {
        name: cat ? cat.name : 'Unknown',
        count: cd.count,
        color: cat ? cat.color || '#3B82F6' : '#9CA3AF'
      };
    }).sort((a, b) => b.count - a.count);

    const defaultColors = ['#3B82F6', '#10B981', '#F59E0B', '#8B5CF6', '#EC4899', '#6B7280'];
    distributionData.forEach((d, i) => {
      if (d.color === '#3B82F6' || d.color === '#9CA3AF') d.color = defaultColors[i % defaultColors.length];
    });

    // 5. Recent Users
    const recentUsers = await User.find()
      .sort({ createdAt: -1 })
      .limit(5)
      .select('full_name email createdAt role');

    // 6. Recent Activities Feed
    const latestItems = await Item.find().sort({ createdAt: -1 }).limit(3).select('name createdAt');
    const latestOrders = await Order.find().sort({ createdAt: -1 }).limit(3).select('_id createdAt status');
    const latestReports = await Report.find().sort({ createdAt: -1 }).limit(3).select('reason createdAt');

    let recentActivities = [
      ...latestItems.map(i => ({ type: 'item', title: 'New item added', desc: i.name, date: i.createdAt })),
      ...latestOrders.map(o => ({ type: 'order', title: 'Order placed', desc: `Order #${o._id.toString().slice(-6)}`, date: o.createdAt })),
      ...latestReports.map(r => ({ type: 'report', title: 'User reported', desc: r.reason, date: r.createdAt })),
      ...recentUsers.slice(0,3).map(u => ({ type: 'user', title: 'New user registered', desc: u.full_name, date: u.createdAt }))
    ];

    recentActivities.sort((a, b) => new Date(b.date) - new Date(a.date));
    recentActivities = recentActivities.slice(0, 5);

    return NextResponse.json({
      stats: {
        totalUsers,
        activeItems: activeItemsCount,
        soldItems: soldItemsCount,
        totalOrders,
        pendingOrders: pendingOrdersCount,
        confirmedOrders: confirmedOrdersCount,
        cancelledOrders: cancelledOrdersCount,
        returnedOrders: returnedOrdersCount,
        totalCategories,
        pendingReports,
      },
      trends: {
        users: `+${newUsersWeek} this week`,
        items: `+${newItemsWeek} this week`,
        orders: `+${newOrdersWeek} this week`,
        categories: `+${newCategoriesWeek} this week`,
      },
      activityData,
      distributionData,
      recentUsers,
      recentActivities
    });
  } catch (error) {
    console.error('Admin Dashboard Error:', error);
    return NextResponse.json({ error: 'Internal server error fetching admin stats.' }, { status: 500 });
  }
}
