import { NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import Payment from '@/models/Payment';
import {
  markPaymentCaptured,
  markPaymentFailed,
} from '@/lib/paymentLifecycle';
import { razorpayRequest, verifyWebhookSignature } from '@/lib/razorpay';

export const runtime = 'nodejs';

export async function POST(request) {
  try {
    const rawBody = await request.text();
    const signature = request.headers.get('x-razorpay-signature');
    if (!verifyWebhookSignature(rawBody, signature)) {
      return NextResponse.json({ error: 'Invalid webhook signature' }, { status: 400 });
    }
    const event = JSON.parse(rawBody);
    const eventId = request.headers.get('x-razorpay-event-id');
    await connectDB();

    const paymentEntity = event.payload?.payment?.entity;
    const paymentLinkEntity = event.payload?.payment_link?.entity;
    const payment = await Payment.findOne({
      $or: [
        ...(paymentEntity?.order_id ? [{ razorpay_order_id: paymentEntity.order_id }] : []),
        ...(paymentEntity?.payment_link_id ? [{ razorpay_payment_link_id: paymentEntity.payment_link_id }] : []),
        ...(paymentLinkEntity?.id ? [{ razorpay_payment_link_id: paymentLinkEntity.id }] : []),
        ...(paymentLinkEntity?.reference_id ? [{ _id: paymentLinkEntity.reference_id }] : []),
      ],
    });
    if (!payment) return NextResponse.json({ received: true }, { status: 200 });
    if (eventId && payment.processed_webhook_ids.includes(eventId)) {
      return NextResponse.json({ received: true, duplicate: true }, { status: 200 });
    }

    if (event.event === 'payment.captured') {
      await markPaymentCaptured(payment, paymentEntity);
    } else if (event.event === 'payment_link.paid' && payment.razorpay_payment_link_id) {
      const response = await razorpayRequest(
        `/payment_links/${encodeURIComponent(payment.razorpay_payment_link_id)}/payments`
      );
      const capturedPayment = (response.items || []).find((entry) => entry.status === 'captured');
      if (capturedPayment) await markPaymentCaptured(payment, capturedPayment);
    } else if (event.event === 'payment.failed') {
      await markPaymentFailed(payment, paymentEntity?.error_description || 'Razorpay reported payment failure');
    } else if (event.event === 'payment_link.expired') {
      await markPaymentFailed(payment, 'Razorpay payment link expired', 'expired');
    }

    if (eventId) {
      await Payment.updateOne({ _id: payment._id }, { $addToSet: { processed_webhook_ids: eventId } });
    }
    return NextResponse.json({ received: true }, { status: 200 });
  } catch (error) {
    console.error('Razorpay webhook processing error:', error);
    return NextResponse.json({ error: 'Could not process Razorpay webhook' }, { status: 500 });
  }
}
