import { NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import Payment from '@/models/Payment';
import { expirePaymentIfNeeded } from '@/lib/paymentLifecycle';

export const runtime = 'nodejs';

export async function POST(request) {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) {
    return NextResponse.json({ error: 'Payment expiry job is not configured' }, { status: 503 });
  }
  if (request.headers.get('authorization') !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    await connectDB();
    const payments = await Payment.find({
      status: { $in: ['created', 'processing', 'pending_verification'] },
      expires_at: { $lte: new Date() },
    }).sort({ expires_at: 1 }).limit(50);
    const results = await Promise.allSettled(payments.map((payment) => expirePaymentIfNeeded(payment)));
    const failures = results.filter((result) => result.status === 'rejected');
    for (const failure of failures) console.error('Payment expiry reconciliation failed:', failure.reason);
    return NextResponse.json({
      processed: results.length,
      failed: failures.length,
    }, { status: failures.length ? 207 : 200 });
  } catch (error) {
    console.error('Payment expiry job failed:', error);
    return NextResponse.json({ error: 'Could not process expired payments' }, { status: 500 });
  }
}
