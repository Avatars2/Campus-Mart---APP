import { NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import User from '@/models/User';
import { verifyAdminAuth } from '@/lib/auth';

export async function GET(request) {
  try {
    const adminCheck = await verifyAdminAuth(request);
    if (adminCheck.error) {
      return NextResponse.json({ error: adminCheck.error }, { status: adminCheck.status || 401 });
    }

    await connectDB();

    // Retrieve all users
    const users = await User.find()
      .sort({ createdAt: -1 })
      .select('-password -__v');

    return NextResponse.json(users);
  } catch (error) {
    console.error('Admin Users Error:', error);
    return NextResponse.json({ error: 'Internal server error fetching users.' }, { status: 500 });
  }
}
