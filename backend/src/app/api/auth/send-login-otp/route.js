import { NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import User from '@/models/User';
import OTP from '@/models/OTP';
import { isAllowedCollegeEmail, normalizeEmail } from '@/lib/authValidation';
import { createAndSendOtp } from '@/lib/otp';

export async function POST(request) {
  try {
    await connectDB();
    const { email } = await request.json();
    const normalizedEmail = normalizeEmail(email);
    if (!isAllowedCollegeEmail(normalizedEmail)) {
      return NextResponse.json({ error: 'Please use an approved college email address.' }, { status: 400 });
    }

    const user = await User.findOne({ email: normalizedEmail });

    if (!user) {
      return NextResponse.json({ error: 'No account found with this email.' }, { status: 404 });
    }

    if (!user.is_verified) {
      return NextResponse.json({ error: 'Account is not verified yet.' }, { status: 400 });
    }

    if (user.is_suspended) {
      return NextResponse.json({ error: 'Your account has been suspended by the administrator.' }, { status: 403 });
    }

    const otpResult = await createAndSendOtp(normalizedEmail, 'Login');
    if (otpResult.error) {
      return NextResponse.json({ error: otpResult.error }, { status: otpResult.status });
    }

    return NextResponse.json({ message: 'Login OTP sent to your email.' });
  } catch (error) {
    console.error('Send Login OTP Error:', error);
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 });
  }
}
