import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import connectDB from '@/lib/db';
import User from '@/models/User';
import { isAllowedCollegeEmail, normalizeEmail, validatePassword } from '@/lib/authValidation';
import { verifyOtp } from '@/lib/otp';

export async function POST(request) {
  try {
    const { email, otp, newPassword } = await request.json();
    const normalizedEmail = normalizeEmail(email);

    if (!isAllowedCollegeEmail(normalizedEmail)) {
      return NextResponse.json({ error: 'Please use an approved college email address.' }, { status: 400 });
    }
    if (!validatePassword(newPassword)) {
      return NextResponse.json({ error: 'Password must be at least 8 characters and contain a letter and a number.' }, { status: 400 });
    }

    await connectDB();
    const user = await User.findOne({ email: normalizedEmail, is_verified: true });
    if (!user) {
      return NextResponse.json({ error: 'No verified account found with this email.' }, { status: 404 });
    }

    const otpResult = await verifyOtp(normalizedEmail, otp);
    if (otpResult.error) {
      return NextResponse.json({ error: otpResult.error }, { status: otpResult.status });
    }

    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(newPassword, salt);
    await user.save();

    return NextResponse.json({ message: 'Password reset successfully. You can now log in.' }, { status: 200 });
  } catch (error) {
    console.error('Reset password error:', error);
    return NextResponse.json({ error: 'Unable to reset password.' }, { status: 500 });
  }
}