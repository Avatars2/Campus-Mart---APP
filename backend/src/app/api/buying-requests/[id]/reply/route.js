import { NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import BuyingRequest from '@/models/BuyingRequest';
import BuyingRequestReply from '@/models/BuyingRequestReply';
import User from '@/models/User';
import Item from '@/models/Item';
import { verifyAuth } from '@/lib/auth';
import { pusherServer } from '@/lib/pusher';
import { sendNotification } from '@/utils/notificationHelper';

export async function GET(request, { params }) {
  try {
    const resolvedParams = await params;
    const { id } = resolvedParams;

    await connectDB();

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

    const formatted = replies.map(r => ({
      ...r.toJSON(),
      sender_name: r.sender_id?.full_name || 'Seller',
      sender_photo: r.sender_id?.profile_photo_url || null,
      sender_department: r.sender_id?.department || '',
      item: r.item_id ? r.item_id.toJSON() : null,
    }));

    return NextResponse.json(formatted);
  } catch (error) {
    console.error('Error fetching replies:', error);
    return NextResponse.json({ error: 'Server error fetching replies' }, { status: 500 });
  }
}

export async function POST(request, { params }) {
  try {
    const authResult = await verifyAuth(request);
    if (authResult.error) {
      return NextResponse.json({ error: authResult.error }, { status: 401 });
    }

    const resolvedParams = await params;
    const { id } = resolvedParams;
    const body = await request.json();
    const { message, item_id, offer_price } = body;

    if (!message || !message.trim()) {
      return NextResponse.json({ error: 'Message is required' }, { status: 400 });
    }

    await connectDB();

    const buyingReq = await BuyingRequest.findById(id);
    if (!buyingReq) {
      return NextResponse.json({ error: 'Request not found' }, { status: 404 });
    }

    const newReply = await BuyingRequestReply.create({
      request_id: id,
      sender_id: authResult.user.id,
      message: message.trim(),
      item_id: item_id || null,
      offer_price: offer_price ? Number(offer_price) : null,
    });

    // Increment replies count on the parent request
    buyingReq.replies_count = (buyingReq.replies_count || 0) + 1;
    await buyingReq.save();

    const populatedReply = await BuyingRequestReply.findById(newReply._id)
      .populate('sender_id', 'full_name profile_photo_url department year_semester phone')
      .populate({
        path: 'item_id',
        select: 'name price original_price images listing_type rental_period is_active is_currently_rented seller_id',
        populate: {
          path: 'seller_id',
          select: 'full_name profile_photo_url'
        }
      });

    const formattedReply = {
      ...populatedReply.toJSON(),
      sender_name: populatedReply.sender_id?.full_name || 'Seller',
      sender_photo: populatedReply.sender_id?.profile_photo_url || null,
      sender_department: populatedReply.sender_id?.department || '',
      item: populatedReply.item_id ? populatedReply.item_id.toJSON() : null,
    };

    // Broadcast reply event via Pusher
    try {
      await pusherServer.trigger('group-buying-requests', 'buying-request:reply', {
        requestId: id,
        reply: formattedReply,
      });
    } catch (pushErr) {
      console.error('Pusher trigger error on reply:', pushErr);
    }

    // Notify the student who created the request (if someone else replied)
    if (String(buyingReq.user_id) !== String(authResult.user.id)) {
      sendNotification({
        recipientId: buyingReq.user_id.toString(),
        senderId: authResult.user.id.toString(),
        type: 'BUYING_REQUEST',
        subType: 'BUYING_REQUEST_OFFER',
        title: 'New Offer on Your Request! 🛍️',
        body: `${populatedReply.sender_id?.full_name || 'A seller'} replied to your request: "${buyingReq.title}".`,
        relatedId: id,
        thumbnail: populatedReply.item_id?.images?.[0] || null,
        actionUrl: {
          targetScreen: 'BuyingRequestsGroup',
          params: { requestId: id },
        },
      }).catch(err => console.error('Error sending request notification:', err));
    }

    return NextResponse.json(formattedReply, { status: 201 });
  } catch (error) {
    console.error('Error creating reply:', error);
    return NextResponse.json({ error: 'Server error creating reply' }, { status: 500 });
  }
}

