import { NextResponse } from 'next/server';
import mongoose from 'mongoose';
import connectDB from '@/lib/db';
import User from '@/models/User';
import Order from '@/models/Order';
import Conversation from '@/models/Conversation';
import Item from '@/models/Item'; // required for mongoose model registration
import { verifyAuth } from '@/lib/auth';

export async function GET(request) {
  try {
    const authResult = await verifyAuth(request);
    if (authResult.error) {
      return NextResponse.json({ error: authResult.error }, { status: 401 });
    }

    const currentUserId = authResult.user.id;
    const userObjectId = mongoose.Types.ObjectId.isValid(currentUserId)
      ? new mongoose.Types.ObjectId(currentUserId)
      : currentUserId;

    const { searchParams } = new URL(request.url);
    const query = (searchParams.get('q') || '').trim();

    await connectDB();

    const candidateMap = new Map();

    // 1. Fetch recent buyers from orders where the current user was the seller
    try {
      const sellerOrders = await Order.find({ seller_id: userObjectId })
        .populate('buyer_id', 'full_name email phone student_id department year_semester profile_photo_url role')
        .populate('item_id', 'name')
        .sort({ createdAt: -1 })
        .limit(20)
        .lean();

      for (const order of sellerOrders) {
        const buyer = order.buyer_id;
        if (buyer && buyer._id.toString() !== currentUserId && buyer.role !== 'admin') {
          const idStr = buyer._id.toString();
          if (!candidateMap.has(idStr)) {
            candidateMap.set(idStr, {
              _id: idStr,
              full_name: buyer.full_name,
              email: buyer.email,
              student_id: buyer.student_id,
              department: buyer.department,
              profile_photo_url: buyer.profile_photo_url,
              role: buyer.role,
              badge: 'Recent Buyer',
              context: order.item_id?.name ? `Bought: ${order.item_id.name}` : 'Buyer on your listing',
            });
          }
        }
      }
    } catch (orderErr) {
      console.warn('Error fetching buyer candidates from orders:', orderErr.message);
    }

    // 2. Fetch contacts from chat conversations
    try {
      const conversations = await Conversation.find({ participants: userObjectId })
        .populate('participants', 'full_name email phone student_id department year_semester profile_photo_url role')
        .populate('item', 'name')
        .sort({ updatedAt: -1 })
        .limit(20)
        .lean();

      for (const conv of conversations) {
        if (!Array.isArray(conv.participants)) continue;
        for (const p of conv.participants) {
          if (p && p._id.toString() !== currentUserId && p.role !== 'admin') {
            const idStr = p._id.toString();
            if (!candidateMap.has(idStr)) {
              candidateMap.set(idStr, {
                _id: idStr,
                full_name: p.full_name,
                email: p.email,
                student_id: p.student_id,
                department: p.department,
                profile_photo_url: p.profile_photo_url,
                role: p.role,
                badge: 'In Messages',
                context: conv.item?.name ? `Discussed: ${conv.item.name}` : 'Chat participant',
              });
            }
          }
        }
      }
    } catch (convErr) {
      console.warn('Error fetching conversation candidates:', convErr.message);
    }

    // 3. If a search query is provided, search across all student users
    if (query) {
      const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const regex = new RegExp(escaped, 'i');

      const searchedUsers = await User.find({
        _id: { $ne: userObjectId },
        role: { $ne: 'admin' },
        $or: [
          { full_name: regex },
          { email: regex },
          { student_id: regex },
          { department: regex },
        ],
      })
        .select('full_name email student_id department year_semester profile_photo_url role')
        .limit(25)
        .lean();

      for (const u of searchedUsers) {
        const idStr = u._id.toString();
        if (!candidateMap.has(idStr)) {
          candidateMap.set(idStr, {
            _id: idStr,
            full_name: u.full_name,
            email: u.email,
            student_id: u.student_id,
            department: u.department,
            profile_photo_url: u.profile_photo_url,
            role: u.role,
            badge: 'Student',
            context: u.department || u.student_id || 'Campus Student',
          });
        }
      }
    }

    // 4. If query is empty and candidateMap has few candidates, supply recent students
    if (!query && candidateMap.size < 6) {
      const otherStudents = await User.find({
        _id: { $ne: userObjectId },
        role: { $ne: 'admin' },
      })
        .select('full_name email student_id department year_semester profile_photo_url role')
        .sort({ createdAt: -1 })
        .limit(10)
        .lean();

      for (const u of otherStudents) {
        const idStr = u._id.toString();
        if (!candidateMap.has(idStr)) {
          candidateMap.set(idStr, {
            _id: idStr,
            full_name: u.full_name,
            email: u.email,
            student_id: u.student_id,
            department: u.department,
            profile_photo_url: u.profile_photo_url,
            role: u.role,
            badge: 'Student',
            context: u.department || u.student_id || 'Campus Student',
          });
        }
      }
    }

    let candidates = Array.from(candidateMap.values());

    if (query) {
      const qLower = query.toLowerCase();
      candidates = candidates.filter((c) =>
        c.full_name?.toLowerCase().includes(qLower) ||
        c.email?.toLowerCase().includes(qLower) ||
        c.student_id?.toLowerCase().includes(qLower) ||
        c.department?.toLowerCase().includes(qLower)
      );
    }

    return NextResponse.json({ success: true, candidates });
  } catch (error) {
    console.error('Error fetching report candidate students:', error);
    return NextResponse.json({ error: 'Failed to fetch candidate students' }, { status: 500 });
  }
}
