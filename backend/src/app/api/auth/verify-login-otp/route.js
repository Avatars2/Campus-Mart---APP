import { NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import connectDB from '@/lib/db';
import User from '@/models/User';
import OTP from '@/models/OTP';

export async function POST(request) {
  try {
    await connectDB();
    const { email, otp } = await request.json();

    const latestOtp = await OTP.findOne({ email }).sort({ createdAt: -1 });

    if (!latestOtp) {
      return NextResponse.json({ error: 'No OTP found for this email.' }, { status: 400 });
    }

    if (latestOtp.otp_code !== otp) {
      return NextResponse.json({ error: 'Invalid OTP code.' }, { status: 400 });
    }

    if (new Date() > latestOtp.expires_at) {
      return NextResponse.json({ error: 'OTP code has expired.' }, { status: 400 });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return NextResponse.json({ error: 'User not found.' }, { status: 404 });
    }

    const token = jwt.sign(
      { id: user._id, email: user.email, name: user.full_name, role: user.role },
      process.env.JWT_SECRET || 'secret_key',
      { expiresIn: '30d' }
    );

    return NextResponse.json({
      message: 'Logged in successfully',
      token,
      user: { id: user._id, name: user.full_name, email: user.email, role: user.role }
    });
  } catch (error) {
    console.error('Verify Login OTP Error:', error);
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 });
  }
}
