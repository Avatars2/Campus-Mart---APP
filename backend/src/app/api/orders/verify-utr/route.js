import { NextResponse } from 'next/server';
export async function POST(request) {
  return NextResponse.json(
    { error: 'UTR-based payment confirmation is disabled. Complete payment through Razorpay Checkout.' },
    { status: 410 }
  );
}
