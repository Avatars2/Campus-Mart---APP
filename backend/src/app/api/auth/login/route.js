import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import connectDB from '@/lib/db';
import User from '@/models/User';
import LoginAttempt from '@/models/LoginAttempt';
import { getJwtSecret, getRefreshSecret, isAllowedCollegeEmail, normalizeEmail } from '@/lib/authValidation';
import { sendAccountLockoutEmail } from '@/lib/emailService';

export async function POST(request) {
  try {
    await connectDB();
    const { email, password } = await request.json();
    const normalizedEmail = normalizeEmail(email);

    // Extract client IP address for IP rate limiting
    const forwardedHeader = request.headers.get('x-forwarded-for');
    const ip = forwardedHeader ? forwardedHeader.split(',')[0].trim() : (request.headers.get('x-real-ip') || '127.0.0.1');

    // 1. IP-Based Rate Limiting Check (Max 10 failed attempts from this IP within 15 minutes)
    const ipAttempt = await LoginAttempt.findOne({ identifier: `ip:${ip}` });
    if (ipAttempt && ipAttempt.attempts >= 10) {
      return NextResponse.json({
        error: 'Too many failed login attempts from this network. Please try again after 15 minutes.',
        isIpBlocked: true,
      }, { status: 429 });
    }

    if (!normalizedEmail || !password || !isAllowedCollegeEmail(normalizedEmail)) {
      return NextResponse.json({ error: 'Invalid email or password.' }, { status: 400 });
    }

    const user = await User.findOne({ email: normalizedEmail });

    // 2. Account Lockout Check
    if (user && user.lock_until && user.lock_until > new Date()) {
      const minutesRemaining = Math.max(1, Math.ceil((user.lock_until.getTime() - Date.now()) / (60 * 1000)));
      return NextResponse.json({
        error: `Account is temporarily locked due to multiple failed login attempts. Please try again in ${minutesRemaining} minute(s).`,
        isLocked: true,
        lockUntil: user.lock_until,
      }, { status: 429 });
    }

    if (!user) {
      // Record failed attempt against IP
      await LoginAttempt.findOneAndUpdate(
        { identifier: `ip:${ip}` },
        { $inc: { attempts: 1 } },
        { upsert: true, new: true, setDefaultsOnInsert: true }
      );
      return NextResponse.json({ error: 'Invalid email or password.' }, { status: 400 });
    }

    if (!user.is_verified) {
      return NextResponse.json({ error: 'Please verify your email before logging in.' }, { status: 400 });
    }

    if (user.is_suspended) {
      return NextResponse.json({ error: 'Your account has been suspended by the administrator.' }, { status: 403, isSuspended: true });
    }

    const isMatch = await bcrypt.compare(password, user.password);

    // 3. Failed Password Attempt Handling
    if (!isMatch) {
      // Record failed attempt against IP
      await LoginAttempt.findOneAndUpdate(
        { identifier: `ip:${ip}` },
        { $inc: { attempts: 1 } },
        { upsert: true, new: true, setDefaultsOnInsert: true }
      );

      const failedAttempts = (user.failed_login_attempts || 0) + 1;

      // Lock account after 5 consecutive failed attempts
      if (failedAttempts >= 5) {
        user.lock_until = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes lockout
        user.failed_login_attempts = 0;
        await user.save();

        // Dispatch security notification email asynchronously
        sendAccountLockoutEmail(user.email, user.full_name, 15).catch(err => {
          console.error('Failed to send lockout alert email:', err);
        });

        return NextResponse.json({
          error: 'Account locked for 15 minutes due to 5 consecutive failed login attempts. A security alert has been sent to your college email.',
          isLocked: true,
          lockUntil: user.lock_until,
        }, { status: 429 });
      }

      user.failed_login_attempts = failedAttempts;
      await user.save();

      const remainingAttempts = 5 - failedAttempts;
      return NextResponse.json({
        error: `Invalid email or password. You have ${remainingAttempts} attempt(s) remaining before account lockout.`,
        remainingAttempts,
      }, { status: 400 });
    }

    // 4. Successful Login - Reset Lockout & Counters
    user.failed_login_attempts = 0;
    user.lock_until = null;

    // Reset IP failed attempts upon successful login
    await LoginAttempt.deleteOne({ identifier: `ip:${ip}` });

    // 5. Short-lived Access Token (15 minutes)
    const accessToken = jwt.sign(
      { id: user._id, email: user.email, name: user.full_name, role: user.role },
      getJwtSecret(),
      { expiresIn: '15m' }
    );

    // 6. Long-lived Refresh Token (30 days) with token version
    const tokenVersion = (user.token_version || 0);
    const refreshToken = jwt.sign(
      { id: user._id, version: tokenVersion },
      getRefreshSecret(),
      { expiresIn: '30d' }
    );

    // Save refresh token on user document
    user.refresh_token = refreshToken;
    await user.save();

    // 7. Return tokens and set HTTP-only cookie for Web
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
      maxAge: 30 * 24 * 60 * 60, // 30 days
    });

    return response;
  } catch (error) {
    console.error('Login Error:', error);
    return NextResponse.json({ error: 'Internal server error during login.' }, { status: 500 });
  }
}
