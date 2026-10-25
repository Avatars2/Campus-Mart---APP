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

    const { searchParams } = new URL(request.url);
    const preset = searchParams.get('preset');
    const singleDate = searchParams.get('date');
    const paramStartDate = searchParams.get('startDate');
    const paramEndDate = searchParams.get('endDate');

    let start = new Date();
    let end = new Date();

    if (preset === 'today') {
      start.setHours(0, 0, 0, 0);
      end.setHours(23, 59, 59, 999);
    } else if (preset === 'yesterday') {
      start.setDate(start.getDate() - 1);
      start.setHours(0, 0, 0, 0);
      end.setDate(end.getDate() - 1);
      end.setHours(23, 59, 59, 999);
    } else if (preset === '7d') {
      start.setDate(start.getDate() - 6);
      start.setHours(0, 0, 0, 0);
      end.setHours(23, 59, 59, 999);
    } else if (preset === '30d') {
      start.setDate(start.getDate() - 29);
      start.setHours(0, 0, 0, 0);
      end.setHours(23, 59, 59, 999);
    } else if (preset === 'this_month') {
      start.setDate(1);
      start.setHours(0, 0, 0, 0);
      end.setHours(23, 59, 59, 999);
    } else if (singleDate) {
      const parsedDate = new Date(singleDate);
      if (!isNaN(parsedDate.getTime())) {
        start = new Date(parsedDate);
        start.setHours(0, 0, 0, 0);
        end = new Date(parsedDate);
        end.setHours(23, 59, 59, 999);
      } else {
        start.setHours(0, 0, 0, 0);
        end.setHours(23, 59, 59, 999);
      }
    } else if (paramStartDate && paramEndDate) {
      const parsedStart = new Date(paramStartDate);
      const parsedEnd = new Date(paramEndDate);
      if (!isNaN(parsedStart.getTime()) && !isNaN(parsedEnd.getTime())) {
        start = new Date(parsedStart);
        start.setHours(0, 0, 0, 0);
        end = new Date(parsedEnd);
        end.setHours(23, 59, 59, 999);
      } else {
        start.setHours(0, 0, 0, 0);
        end.setHours(23, 59, 59, 999);
      }
    } else {
      // Default to today
      start.setHours(0, 0, 0, 0);
      end.setHours(23, 59, 59, 999);
    }

    const dateFilter = { createdAt: { $gte: start, $lte: end } };

    // 1. New Users
    const newUsers = await User.find(dateFilter)
      .select('full_name email role createdAt is_verified')
      .sort({ createdAt: -1 })
      .lean();

    // 2. Items Listed
    const newItems = await Item.find(dateFilter)
      .populate('seller_id', 'full_name email')
      .populate('category_id', 'name')
      .sort({ createdAt: -1 })
      .lean();

    // 3. Orders Placed
    const orders = await Order.find(dateFilter)
      .populate('buyer_id', 'full_name email')
      .populate('seller_id', 'full_name email')
      .populate('item_id', 'name price images')
      .sort({ createdAt: -1 })
      .lean();

    // 4. Reports Filed
    const reports = await Report.find(dateFilter)
      .populate('reporter_id', 'full_name')
      .sort({ createdAt: -1 })
      .lean();

    // Breakdown counts
    const confirmedStatuses = ['completed', 'delivered', 'rental_active'];
    const pendingStatuses = ['pending', 'cancel_requested'];
    const cancelledStatuses = ['cancelled'];
    const returnedStatuses = ['returned', 'return_requested'];

    let confirmedOrdersCount = 0;
    let pendingOrdersCount = 0;
    let cancelledOrdersCount = 0;
    let returnedOrdersCount = 0;
    let totalOrderVolume = 0;

    orders.forEach(order => {
      totalOrderVolume += Number(order.total_price) || 0;
      if (confirmedStatuses.includes(order.status)) {
        confirmedOrdersCount++;
      } else if (pendingStatuses.includes(order.status)) {
        pendingOrdersCount++;
      } else if (cancelledStatuses.includes(order.status)) {
        cancelledOrdersCount++;
      } else if (returnedStatuses.includes(order.status)) {
        returnedOrdersCount++;
      }
    });

    return NextResponse.json({
      success: true,
      timeframe: {
        startDate: start.toISOString(),
        endDate: end.toISOString(),
      },
      summary: {
        totalNewUsers: newUsers.length,
        totalItemsAdded: newItems.length,
        totalOrders: orders.length,
        confirmedOrders: confirmedOrdersCount,
        pendingOrders: pendingOrdersCount,
        cancelledOrders: cancelledOrdersCount,
        returnedOrders: returnedOrdersCount,
        totalOrderVolume,
        totalReports: reports.length,
      },
      items: newItems.map(item => ({
        _id: item._id,
        name: item.name,
        price: item.price,
        listing_type: item.listing_type || 'sell',
        category: item.category_id?.name || 'General',
        seller: item.seller_id?.full_name || 'Unknown',
        createdAt: item.createdAt,
        image: item.images?.[0] || null,
      })),
      orders: orders.map(order => ({
        _id: order._id,
        item_name: order.item_id?.name || 'Item Unavailable',
        item_image: order.item_id?.images?.[0] || null,
        buyer_name: order.buyer_id?.full_name || 'Anonymous',
        seller_name: order.seller_id?.full_name || 'Anonymous',
        total_price: order.total_price,
        status: order.status,
        payment_method: order.payment_method || 'Cash',
        payment_status: order.payment_status || 'unpaid',
        createdAt: order.createdAt,
      })),
      users: newUsers.map(user => ({
        _id: user._id,
        full_name: user.full_name,
        email: user.email,
        role: user.role,
        createdAt: user.createdAt,
      })),
      reports: reports.map(report => ({
        _id: report._id,
        reporter_name: report.reporter_id?.full_name || 'Anonymous',
        reason: report.reason,
        status: report.status,
        createdAt: report.createdAt,
      }))
    });
  } catch (error) {
    console.error('Admin Analytics Route Error:', error);
    return NextResponse.json({ error: 'Failed to fetch admin activity analytics.' }, { status: 500 });
  }
}

