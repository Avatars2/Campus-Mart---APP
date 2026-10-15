import { NextResponse } from 'next/server';
import mongoose from 'mongoose';
import connectDB from '@/lib/db';
import Order from '@/models/Order';
import Payment from '@/models/Payment';
import { verifyAuth } from '@/lib/auth';
import { expirePaymentIfNeeded, reconcilePayment } from '@/lib/paymentLifecycle';

export async function GET(request, { params }) {
  try {
    const authResult = await verifyAuth(request);
    if (authResult.error) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status || 401 });
    }
    const { paymentId } = await params;
    if (!mongoose.Types.ObjectId.isValid(paymentId)) {
      return NextResponse.json({ error: 'Invalid payment ID' }, { status: 400 });
    }
    await connectDB();
    let payment = await Payment.findOne({ _id: paymentId, buyer_id: authResult.user.id });
    if (!payment) return NextResponse.json({ error: 'Payment not found' }, { status: 404 });

    payment = await reconcilePayment(payment);
    payment = await expirePaymentIfNeeded(payment);
    const orders = await Order.find({ payment_id: payment._id });
    return NextResponse.json({
      payment: {
        id: payment._id,
        status: payment.status,
        amount: payment.amount,
        currency: payment.currency,
        settlements: payment.settlements.map((entry) => ({
          status: entry.status,
          amount: entry.amount,
        })),
      },
      orders,
    }, { status: 200 });
  } catch (error) {
    console.error('Payment status error:', error);
    return NextResponse.json({ error: 'Could not retrieve payment status' }, { status: 500 });
  }
}
