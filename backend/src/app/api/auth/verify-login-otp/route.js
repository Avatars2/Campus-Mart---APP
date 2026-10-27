import { NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import connectDB from '@/lib/db';
import User from '@/models/User';
import { getJwtSecret, getRefreshSecret, normalizeEmail } from '@/lib/authValidation';
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

    if (user.is_suspended) {
      return NextResponse.json({ error: 'Your account has been suspended by the administrator.' }, { status: 403, isSuspended: true });
    }

    // Reset lockout counters on successful OTP verification
    user.failed_login_attempts = 0;
    user.lock_until = null;

    // Short-lived Access Token (15 minutes)
    const accessToken = jwt.sign(
      { id: user._id, email: user.email, name: user.full_name, role: user.role },
      getJwtSecret(),
      { expiresIn: '15m' }
    );

    // Long-lived Refresh Token (30 days)
    const tokenVersion = (user.token_version || 0);
    const refreshToken = jwt.sign(
      { id: user._id, version: tokenVersion },
      getRefreshSecret(),
      { expiresIn: '30d' }
    );

    user.refresh_token = refreshToken;
    await user.save();

    const response = NextResponse.json({
      message: 'Logged in successfully',
      token: accessToken,
      refreshToken,
      user: { id: user._id, name: user.full_name, email: user.email, role: user.role }
    });

    response.cookies.set('refreshToken', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 30 * 24 * 60 * 60,
    });

    return response;
  } catch (error) {
    console.error('Verify Login OTP Error:', error);
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 });
  }
}
