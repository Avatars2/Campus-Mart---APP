import { NextResponse } from 'next/server';

export async function POST() {
  return NextResponse.json(
    { error: 'UPI format checks are not seller account verification. Complete Razorpay Route onboarding to receive payouts.' },
    { status: 410 }
  );
}
