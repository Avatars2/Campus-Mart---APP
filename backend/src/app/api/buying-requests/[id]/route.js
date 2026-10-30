import { NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import BuyingRequest from '@/models/BuyingRequest';
import BuyingRequestReply from '@/models/BuyingRequestReply';
import User from '@/models/User';
import Category from '@/models/Category';
import Item from '@/models/Item';
import { verifyAuth } from '@/lib/auth';
import { pusherServer } from '@/lib/pusher';

export async function GET(request, { params }) {
  try {
    const resolvedParams = await params;
    const { id } = resolvedParams;

    await connectDB();

    const buyingReq = await BuyingRequest.findById(id)
      .populate('user_id', 'full_name profile_photo_url department year_semester phone')
      .populate('category_id', 'name')
      .populate({
        path: 'fulfilled_item_id',
        select: 'name price images listing_type rental_period seller_id',
        populate: {
          path: 'seller_id',
          select: 'full_name profile_photo_url'
        }
      });

    if (!buyingReq) {
      return NextResponse.json({ error: 'Request not found' }, { status: 404 });
    }

    const replies = await BuyingRequestReply.find({ request_id: id })
      .populate('sender_id', 'full_name profile_photo_url department year_semester phone')
      .populate({
        path: 'item_id',
        select: 'name price original_price images listing_type rental_period is_active is_currently_rented seller_id',
        populate: {
          path: 'seller_id',
          select: 'full_name profile_photo_url'
        }
      })
      .sort({ createdAt: 1 });

    const formattedReplies = replies.map(r => ({
      ...r.toJSON(),
      sender_name: r.sender_id?.full_name || 'Seller',
      sender_photo: r.sender_id?.profile_photo_url || null,
      sender_department: r.sender_id?.department || '',
      item: r.item_id ? r.item_id.toJSON() : null,
    }));

    return NextResponse.json({
      ...buyingReq.toJSON(),
      user_name: buyingReq.user_id?.full_name || 'Student',
      user_photo: buyingReq.user_id?.profile_photo_url || null,
      user_department: buyingReq.user_id?.department || '',
      user_phone: buyingReq.user_id?.phone || null,
      category_name: buyingReq.category_id?.name || 'General',
      replies: formattedReplies,
    });
  } catch (error) {
    console.error('Error fetching buying request details:', error);
    return NextResponse.json({ error: 'Server error fetching request details' }, { status: 500 });
  }
}

export async function PATCH(request, { params }) {
  try {
    const authResult = await verifyAuth(request);
    if (authResult.error) {
      return NextResponse.json({ error: authResult.error }, { status: 401 });
    }

    const resolvedParams = await params;
    const { id } = resolvedParams;
    const body = await request.json();
    const { status, fulfilled_item_id } = body;

    await connectDB();

    const buyingReq = await BuyingRequest.findById(id);
    if (!buyingReq) {
      return NextResponse.json({ error: 'Request not found' }, { status: 404 });
    }

    const currentAuthId = authResult.user.id || authResult.user._id;
    const isAuthor = String(buyingReq.user_id) === String(currentAuthId);
    const isAdmin = authResult.user.role === 'admin';
    if (!isAuthor && !isAdmin) {
      return NextResponse.json({ error: 'Unauthorized to update this request' }, { status: 403 });
    }

    if (status) buyingReq.status = status;
    if (fulfilled_item_id !== undefined) buyingReq.fulfilled_item_id = fulfilled_item_id;

    await buyingReq.save();

    const updated = await BuyingRequest.findById(id)
      .populate('user_id', 'full_name profile_photo_url department year_semester phone')
      .populate('category_id', 'name')
      .populate('fulfilled_item_id');

    const formatted = {
      ...updated.toJSON(),
      user_name: updated.user_id?.full_name || 'Student',
      user_photo: updated.user_id?.profile_photo_url || null,
      user_department: updated.user_id?.department || '',
      user_phone: updated.user_id?.phone || null,
      category_name: updated.category_id?.name || 'General',
    };

    try {
      await pusherServer.trigger('group-buying-requests', 'buying-request:updated', {
        request: formatted,
      });
    } catch (pushErr) {
      console.error('Pusher trigger error on update request:', pushErr);
    }

    return NextResponse.json(formatted);
  } catch (error) {
    console.error('Error updating buying request:', error);
    return NextResponse.json({ error: 'Server error updating request' }, { status: 500 });
  }
}

export async function DELETE(request, { params }) {
  try {
    const authResult = await verifyAuth(request);
    if (authResult.error) {
      return NextResponse.json({ error: authResult.error }, { status: 401 });
    }

    const resolvedParams = await params;
    const { id } = resolvedParams;

    await connectDB();

    const buyingReq = await BuyingRequest.findById(id);
    if (!buyingReq) {
      return NextResponse.json({ error: 'Request not found' }, { status: 404 });
    }

    const currentAuthId = authResult.user.id || authResult.user._id;
    const isAuthor = String(buyingReq.user_id) === String(currentAuthId);
    const isAdmin = authResult.user.role === 'admin';
    if (!isAuthor && !isAdmin) {
      return NextResponse.json({ error: 'Unauthorized to delete this request' }, { status: 403 });
    }

    await BuyingRequestReply.deleteMany({ request_id: id });
    await BuyingRequest.findByIdAndDelete(id);

    try {
      await pusherServer.trigger('group-buying-requests', 'buying-request:deleted', {
        requestId: id,
      });
    } catch (pushErr) {
      console.error('Pusher trigger error on delete request:', pushErr);
    }

    return NextResponse.json({ message: 'Request deleted successfully' });
  } catch (error) {
    console.error('Error deleting buying request:', error);
    return NextResponse.json({ error: 'Server error deleting request' }, { status: 500 });
  }
}

