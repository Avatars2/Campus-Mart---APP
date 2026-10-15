import { NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import Payment from '@/models/Payment';
import { verifyAuth } from '@/lib/auth';

export async function GET(request) {
  try {
    const authResult = await verifyAuth(request);
    if (authResult.error) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status || 401 });
    }
    await connectDB();
    const payments = await Payment.find({
      'settlements.seller_id': authResult.user.id,
      status: { $in: ['captured', 'needs_review'] },
    })
      .select('amount currency status settlements createdAt')
      .sort({ createdAt: -1 })
      .limit(100)
      .lean();

    const transfers = payments.flatMap((payment) => payment.settlements
      .filter((settlement) => settlement.seller_id.toString() === authResult.user.id)
      .map((settlement) => ({
        payment_id: payment._id,
        amount: settlement.amount,
        currency: payment.currency,
        payment_status: payment.status,
        payout_status: payment.status === 'needs_review' ? 'review' : settlement.status,
        transfer_id: settlement.razorpay_transfer_id,
        created_at: payment.createdAt,
      })));
    return NextResponse.json({ transfers }, { status: 200 });
  } catch (error) {
    console.error('Seller transfer status error:', error);
    return NextResponse.json({ error: 'Could not retrieve seller transfer status' }, { status: 500 });
  }
}
