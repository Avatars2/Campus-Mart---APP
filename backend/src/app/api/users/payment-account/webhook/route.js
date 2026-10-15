import { NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import User from '@/models/User';
import {
  getRazorpayLinkedAccountStatus,
  verifyRazorpayPartnerWebhookSignature,
} from '@/lib/razorpay';

export const runtime = 'nodejs';

const accountEventStatuses = {
  'account.activated': 'activated',
  'account.under_review': 'under_review',
  'account.needs_clarification': 'needs_clarification',
  'account.rejected': 'rejected',
  'account.suspended': 'suspended',
};

export async function POST(request) {
  try {
    const rawBody = await request.text();
    const signature = request.headers.get('x-razorpay-signature');
    if (!verifyRazorpayPartnerWebhookSignature(rawBody, signature)) {
      return NextResponse.json({ error: 'Invalid Partner webhook signature' }, { status: 400 });
    }

    const event = JSON.parse(rawBody);
    const eventStatus = accountEventStatuses[event.event];
    if (!eventStatus) return NextResponse.json({ received: true }, { status: 200 });

    const account = event.payload?.account?.entity;
    const accountId = event.account_id || account?.id;
    if (typeof accountId !== 'string' || !/^acc_[A-Za-z0-9]+$/.test(accountId)) {
      throw new Error('Partner webhook did not contain a valid linked account ID');
    }

    await connectDB();
    const seller = await User.findOne({
      role: 'student',
      razorpay_account_id: accountId,
    }).select('_id +razorpay_account_id +razorpay_product_id');
    if (!seller) {
      return NextResponse.json({ error: 'Seller account record is not available yet' }, { status: 500 });
    }

    const currentStatus = await getRazorpayLinkedAccountStatus(accountId, seller.razorpay_product_id);
    seller.razorpay_account_status = currentStatus;
    await seller.save();
    return NextResponse.json({ received: true }, { status: 200 });
  } catch (error) {
    console.error('Razorpay Partner account webhook processing error:', error);
    return NextResponse.json({ error: 'Could not process Partner account webhook' }, { status: 500 });
  }
}
