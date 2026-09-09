import { NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import User from '@/models/User';
import OTP from '@/models/OTP';
import { sendOTP } from '@/lib/emailService';

export async function POST(request) {
  try {
    await connectDB();
    const { email } = await request.json();

    const user = await User.findOne({ email });

    if (!user) {
      return NextResponse.json({ error: 'No account found with this email.' }, { status: 404 });
    }

    if (!user.is_verified) {
      return NextResponse.json({ error: 'Account is not verified yet.' }, { status: 400 });
    }

    const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 10 * 60000); // 10 minutes expiry

    await OTP.create({
      email,
      otp_code: otpCode,
      expires_at: expiresAt,
    });

    if (process.env.EMAIL_USER && process.env.EMAIL_PASS) {
      await sendOTP(email, otpCode);
    } else {
      console.log(`[DEV MODE] Login OTP for ${email} is ${otpCode}`);
    }

    return NextResponse.json({ message: 'Login OTP sent to your email.' });
  } catch (error) {
    console.error('Send Login OTP Error:', error);
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 });
  }
}
