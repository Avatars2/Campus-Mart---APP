import { NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import User from '@/models/User';
import { isAllowedCollegeEmail, normalizeEmail } from '@/lib/authValidation';
import { createAndSendOtp } from '@/lib/otp';

export async function POST(request) {
  try {
    const { email } = await request.json();
    const normalizedEmail = normalizeEmail(email);

    if (!isAllowedCollegeEmail(normalizedEmail)) {
      return NextResponse.json({ error: 'Please use an approved college email address.' }, { status: 400 });
    }

    await connectDB();
    const user = await User.findOne({ email: normalizedEmail });
    if (!user || !user.is_verified) {
      return NextResponse.json({ error: 'No verified account found with this email.' }, { status: 404 });
    }

    const otpResult = await createAndSendOtp(normalizedEmail, 'Password reset');
    if (otpResult.error) {
      return NextResponse.json({ error: otpResult.error }, { status: otpResult.status });
    }

    return NextResponse.json({ message: 'Password reset OTP sent to your email.' }, { status: 200 });
  } catch (error) {
    console.error('Forgot password error:', error);
    return NextResponse.json({ error: 'Unable to send password reset OTP.' }, { status: 500 });
  }
}