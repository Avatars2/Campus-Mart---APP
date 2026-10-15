import { NextResponse } from 'next/server';
import mongoose from 'mongoose';
import connectDB from '@/lib/db';
import Order from '@/models/Order';
import Payment from '@/models/Payment';
import { verifyAuth } from '@/lib/auth';
import { markPaymentCaptured, markPaymentFailed } from '@/lib/paymentLifecycle';
import { razorpayRequest, verifyCheckoutSignature } from '@/lib/razorpay';

export const runtime = 'nodejs';

const orderPopulate = [
  { path: 'item_id', select: 'name price images listing_type rental_period' },
  { path: 'seller_id', select: 'full_name email phone student_id department year_semester' },
  { path: 'buyer_id', select: 'full_name email phone student_id department year_semester' },
];

export async function POST(request) {
  try {
    const authResult = await verifyAuth(request);
    if (authResult.error) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status || 401 });
    }
    const { payment_id, razorpay_order_id, razorpay_payment_id, razorpay_signature } = await request.json();
    if (
      !mongoose.Types.ObjectId.isValid(payment_id)
      || !razorpay_order_id
      || !razorpay_payment_id
      || !razorpay_signature
    ) {
      return NextResponse.json({ error: 'Razorpay payment verification details are incomplete' }, { status: 400 });
    }

    await connectDB();
    const payment = await Payment.findOne({ _id: payment_id, buyer_id: authResult.user.id });
    if (!payment || payment.razorpay_order_id !== razorpay_order_id) {
      return NextResponse.json({ error: 'Payment was not found for this buyer or provider order' }, { status: 404 });
    }
    if (!verifyCheckoutSignature(razorpay_order_id, razorpay_payment_id, razorpay_signature)) {
      return NextResponse.json({ error: 'Payment signature verification failed' }, { status: 400 });
    }

    let providerPayment = await razorpayRequest(`/payments/${encodeURIComponent(razorpay_payment_id)}`);
    if (
      providerPayment.order_id !== payment.razorpay_order_id
      || providerPayment.amount !== payment.amount
      || providerPayment.currency !== payment.currency
    ) {
      return NextResponse.json({ error: 'Provider payment does not match the requested order and amount' }, { status: 409 });
    }

    if (providerPayment.status === 'authorized') {
      if (payment.expires_at <= new Date()) {
        return NextResponse.json({
          payment: { id: payment._id, status: payment.status },
          message: 'Payment is still being confirmed after the payment window; check order status shortly.',
        }, { status: 202 });
      }
      try {
        providerPayment = await razorpayRequest(
          `/payments/${encodeURIComponent(razorpay_payment_id)}/capture`,
          'POST',
          { amount: payment.amount, currency: payment.currency }
        );
      } catch (captureError) {
        providerPayment = await razorpayRequest(`/payments/${encodeURIComponent(razorpay_payment_id)}`);
        if (providerPayment.status !== 'captured') throw captureError;
      }
    }

    let updatedPayment;
    if (providerPayment.status === 'captured') {
      updatedPayment = await markPaymentCaptured(payment, providerPayment);
    } else if (providerPayment.status === 'failed') {
      updatedPayment = await markPaymentFailed(payment, providerPayment.error_description || 'Payment failed');
    } else {
      updatedPayment = payment;
    }
    const orders = await Order.find({ payment_id: payment._id }).populate(orderPopulate);
    return NextResponse.json({
      payment: {
        id: updatedPayment._id,
        status: updatedPayment.status,
        amount: updatedPayment.amount,
        currency: updatedPayment.currency,
      },
      orders,
    }, { status: updatedPayment.status === 'captured' ? 200 : 202 });
  } catch (error) {
    console.error('Payment verification error:', error);
    return NextResponse.json({ error: error.message || 'Could not verify payment' }, { status: 500 });
  }
}
