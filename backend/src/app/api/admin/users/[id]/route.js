import { NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import User from '@/models/User';
import { verifyAdminAuth } from '@/lib/auth';

// Suspend or ban a user
export async function PUT(request, { params }) {
  try {
    const adminCheck = await verifyAdminAuth(request);
    if (adminCheck.error) {
      return NextResponse.json({ error: adminCheck.error }, { status: adminCheck.status || 401 });
    }

    const resolvedParams = await params;
    const { id } = resolvedParams;
    const body = await request.json();
    const { is_suspended } = body;

    if (is_suspended === undefined) {
      return NextResponse.json({ error: 'Missing is_suspended status' }, { status: 400 });
    }

    await connectDB();
    
    // Prevent admin from suspending themselves
    if (id === adminCheck.dbUser._id.toString()) {
      return NextResponse.json({ error: 'Cannot suspend your own admin account.' }, { status: 403 });
    }

    const user = await User.findById(id);
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    user.is_suspended = is_suspended;
    await user.save();

    return NextResponse.json({ 
      message: `User ${is_suspended ? 'suspended' : 'reactivated'} successfully`, 
      user: { id: user._id, full_name: user.full_name, is_suspended: user.is_suspended }
    });

  } catch (error) {
    console.error('Admin User Update Error:', error);
    return NextResponse.json({ error: 'Internal server error updating user.' }, { status: 500 });
  }
}
