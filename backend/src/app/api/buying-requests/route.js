import { NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import BuyingRequest from '@/models/BuyingRequest';
import User from '@/models/User';
import Category from '@/models/Category';
import Item from '@/models/Item';
import { verifyAuth } from '@/lib/auth';
import { pusherServer } from '@/lib/pusher';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search');
    const category = searchParams.get('category');
    const request_type = searchParams.get('request_type');
    const status = searchParams.get('status');

    await connectDB();

    let query = {};

    if (status && status !== 'all') {
      query.status = status;
    } else if (!status) {
      query.status = { $ne: 'closed' };
    }

    if (request_type && request_type !== 'all') {
      query.request_type = { $in: [request_type, 'either'] };
    }

    if (category && category !== 'All') {
      const catDoc = await Category.findOne({ name: category });
      if (catDoc) {
        query.category_id = catDoc._id;
      }
    }

    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } }
      ];
    }

    const requests = await BuyingRequest.find(query)
      .populate('user_id', 'full_name profile_photo_url department year_semester phone')
      .populate('category_id', 'name')
      .populate({
        path: 'fulfilled_item_id',
        select: 'name price images listing_type rental_period seller_id',
        populate: {
          path: 'seller_id',
          select: 'full_name profile_photo_url'
        }
      })
      .sort({ createdAt: -1 });

    const formattedRequests = requests.map(req => ({
      ...req.toJSON(),
      user_name: req.user_id?.full_name || 'Student',
      user_photo: req.user_id?.profile_photo_url || null,
      user_department: req.user_id?.department || '',
      user_phone: req.user_id?.phone || null,
      category_name: req.category_id?.name || 'General',
    }));

    return NextResponse.json(formattedRequests);
  } catch (error) {
    console.error('Error fetching buying requests:', error);
    return NextResponse.json({ error: 'Server error fetching requests' }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const authResult = await verifyAuth(request);
    if (authResult.error) {
      return NextResponse.json({ error: authResult.error }, { status: 401 });
    }

    const body = await request.json();
    const { title, description, category_id, request_type, target_budget, rental_period } = body;

    if (!title || !title.trim()) {
      return NextResponse.json({ error: 'Title is required' }, { status: 400 });
    }

    await connectDB();

    let resolvedCategoryId = null;
    if (category_id) {
      if (category_id.match(/^[0-9a-fA-F]{24}$/)) {
        resolvedCategoryId = category_id;
      } else {
        const catDoc = await Category.findOne({ name: category_id });
        if (catDoc) resolvedCategoryId = catDoc._id;
      }
    }

    const newRequest = await BuyingRequest.create({
      user_id: authResult.user.id,
      title: title.trim(),
      description: description ? description.trim() : '',
      category_id: resolvedCategoryId,
      request_type: request_type || 'buy',
      target_budget: target_budget ? Number(target_budget) : null,
      rental_period: request_type === 'rent' ? (rental_period || 'day') : null,
      status: 'open',
    });

    const populatedRequest = await BuyingRequest.findById(newRequest._id)
      .populate('user_id', 'full_name profile_photo_url department year_semester phone')
      .populate('category_id', 'name');

    const formatted = {
      ...populatedRequest.toJSON(),
      user_name: populatedRequest.user_id?.full_name || 'Student',
      user_photo: populatedRequest.user_id?.profile_photo_url || null,
      user_department: populatedRequest.user_id?.department || '',
      user_phone: populatedRequest.user_id?.phone || null,
      category_name: populatedRequest.category_id?.name || 'General',
    };

    // Broadcast live event on community group channel
    try {
      await pusherServer.trigger('group-buying-requests', 'buying-request:new', {
        request: formatted,
      });
    } catch (pushErr) {
      console.error('Pusher trigger error on new request:', pushErr);
    }

    return NextResponse.json(formatted, { status: 201 });
  } catch (error) {
    console.error('Error creating buying request:', error);
    return NextResponse.json({ error: 'Server error creating request' }, { status: 500 });
  }
}

