import { NextResponse } from 'next/server';
import mongoose from 'mongoose';
import connectDB from '@/lib/db';
import Payment from '@/models/Payment';
import { verifyAuth } from '@/lib/auth';
import { markPaymentCaptured, markPaymentFailed } from '@/lib/paymentLifecycle';
import { razorpayRequest } from '@/lib/razorpay';

export const runtime = 'nodejs';

export async function POST(request) {
  try {
    const authResult = await verifyAuth(request);
    if (authResult.error) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status || 401 });
    }
    const { payment_id } = await request.json();
    if (!mongoose.Types.ObjectId.isValid(payment_id)) {
      return NextResponse.json({ error: 'A valid payment ID is required' }, { status: 400 });
    }

    await connectDB();
    const payment = await Payment.findOne({ _id: payment_id, buyer_id: authResult.user.id });
    if (!payment) return NextResponse.json({ error: 'Payment not found' }, { status: 404 });
    if (payment.status !== 'created' || (!payment.razorpay_order_id && !payment.razorpay_payment_link_id)) {
      return NextResponse.json({ status: payment.status }, { status: 200 });
    }

    if (payment.razorpay_payment_link_id) {
      const paymentLink = await razorpayRequest(
        `/payment_links/${encodeURIComponent(payment.razorpay_payment_link_id)}`
      );
      if (paymentLink.status === 'paid') {
        const providerPayments = await razorpayRequest(
          `/payment_links/${encodeURIComponent(payment.razorpay_payment_link_id)}/payments`
        );
        const capturedPayment = (providerPayments.items || []).find((entry) => entry.status === 'captured');
        if (!capturedPayment) {
          return NextResponse.json({ status: 'created' }, { status: 202 });
        }
        const updatedPayment = await markPaymentCaptured(payment, capturedPayment);
        return NextResponse.json({ status: updatedPayment.status }, { status: 200 });
      }
      if (['cancelled', 'expired'].includes(paymentLink.status)) {
        const updatedPayment = await markPaymentFailed(payment, `Razorpay payment link ${paymentLink.status}`);
        return NextResponse.json({ status: updatedPayment.status }, { status: 200 });
      }

      const cancelledLink = await razorpayRequest(
        `/payment_links/${encodeURIComponent(payment.razorpay_payment_link_id)}/cancel`,
        'POST',
        { cancellation_reason: 'Buyer closed checkout' }
      );
      if (['cancelled', 'expired'].includes(cancelledLink.status)) {
        const updatedPayment = await markPaymentFailed(payment, 'Buyer closed the payment screen');
        return NextResponse.json({ status: updatedPayment.status }, { status: 200 });
      }
      return NextResponse.json({ status: 'created' }, { status: 202 });
    }

    const providerResult = await razorpayRequest(
      `/orders/${encodeURIComponent(payment.razorpay_order_id)}/payments`
    );
    const providerPayments = providerResult.items || [];
    const captured = providerPayments.find((entry) => entry.status === 'captured');
    if (captured) {
      const updatedPayment = await markPaymentCaptured(payment, captured);
      return NextResponse.json({ status: updatedPayment.status }, { status: 200 });
    }

    const authorized = providerPayments.find((entry) => entry.status === 'authorized');
    if (authorized) {
      if (payment.expires_at <= new Date()) {
        return NextResponse.json({
          status: 'created',
          message: 'Payment remains under provider confirmation after the checkout deadline',
        }, { status: 202 });
      }
      try {
        const capturedPayment = await razorpayRequest(
          `/payments/${encodeURIComponent(authorized.id)}/capture`,
          'POST',
          { amount: payment.amount, currency: payment.currency }
        );
        const updatedPayment = await markPaymentCaptured(payment, capturedPayment);
        return NextResponse.json({ status: updatedPayment.status }, { status: 200 });
      } catch (error) {
        console.error('Could not capture payment while closing checkout:', error);
        return NextResponse.json({ status: 'created', message: 'Payment remains under provider confirmation' }, { status: 202 });
      }
    }

    if (providerPayments.length > 0 && !providerPayments.every((entry) => entry.status === 'failed')) {
      return NextResponse.json({ status: 'created', message: 'Payment remains under provider confirmation' }, { status: 202 });
    }
    const updatedPayment = await markPaymentFailed(payment, 'Buyer closed the payment screen');
    return NextResponse.json({ status: updatedPayment.status }, { status: 200 });
  } catch (error) {
    console.error('Payment cancellation check error:', error);
    return NextResponse.json({ error: error.message || 'Could not check payment before closing checkout' }, { status: 500 });
  }
}
