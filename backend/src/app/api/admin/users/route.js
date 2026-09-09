import { NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import User from '@/models/User';
import { verifyAuth } from '@/lib/auth';

export async function GET(request) {
  try {
    const authResult = await verifyAuth(request);
    
    // Check if user is authenticated
    if (authResult.error) {
      return NextResponse.json({ error: authResult.error }, { status: 401 });
    }

    await connectDB();
    const userId = authResult.user.id;

    // Retrieve the full user to verify role
    const user = await User.findById(userId);
    if (!user || user.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

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
