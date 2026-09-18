import { NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import connectDB from '@/lib/db';
import User from '@/models/User';
import { getJwtSecret, normalizeEmail } from '@/lib/authValidation';
import { verifyOtp } from '@/lib/otp';

export async function POST(request) {
  try {
    await connectDB();
    const { email, otp } = await request.json();
    const normalizedEmail = normalizeEmail(email);
    const otpResult = await verifyOtp(normalizedEmail, otp);
    if (otpResult.error) return NextResponse.json({ error: otpResult.error }, { status: otpResult.status });

    const user = await User.findOne({ email: normalizedEmail });
    if (!user) {
      return NextResponse.json({ error: 'User not found.' }, { status: 404 });
    }

    const token = jwt.sign(
      { id: user._id, email: user.email, name: user.full_name, role: user.role },
      getJwtSecret(),
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
