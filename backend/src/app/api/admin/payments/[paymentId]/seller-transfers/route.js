import { NextResponse } from 'next/server';
import mongoose from 'mongoose';
import connectDB from '@/lib/db';
import Payment from '@/models/Payment';
import { verifyAdminAuth } from '@/lib/auth';
import { retryUnconfiguredSellerTransfers } from '@/lib/paymentLifecycle';

export const runtime = 'nodejs';

export async function POST(request, { params }) {
  try {
    const authResult = await verifyAdminAuth(request);
    if (authResult.error) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status || 401 });
    }
    const { paymentId } = await params;
    if (!mongoose.Types.ObjectId.isValid(paymentId)) {
      return NextResponse.json({ error: 'Invalid payment ID' }, { status: 400 });
    }

    await connectDB();
    const payment = await Payment.findById(paymentId);
    if (!payment) return NextResponse.json({ error: 'Payment not found' }, { status: 404 });
    const updatedPayment = await retryUnconfiguredSellerTransfers(payment);
    return NextResponse.json({
      message: 'Unconfigured seller transfers were processed',
      settlements: updatedPayment.settlements.map((settlement) => ({
        seller_id: settlement.seller_id,
        amount: settlement.amount,
        status: settlement.status,
        transfer_id: settlement.razorpay_transfer_id,
      })),
    }, { status: 200 });
  } catch (error) {
    console.error('Seller transfer retry error:', error);
    return NextResponse.json({ error: error.message || 'Could not process seller transfers' }, { status: 400 });
  }
}
