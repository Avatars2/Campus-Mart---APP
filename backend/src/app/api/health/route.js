import { NextResponse } from 'next/server';
import connectDB from '@/lib/db';

export async function GET() {
  try {
    await connectDB();
    return NextResponse.json({ status: 'success', message: 'API is running and connected to DB' });
  } catch (error) {
    return NextResponse.json({ status: 'error', message: 'API is running but DB connection failed' }, { status: 500 });
  }
}
