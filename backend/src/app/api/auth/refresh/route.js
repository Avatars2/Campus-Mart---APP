import { NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import connectDB from '@/lib/db';
import User from '@/models/User';
import { getJwtSecret, getRefreshSecret } from '@/lib/authValidation';

export async function POST(request) {
  try {
    let refreshToken = request.cookies.get('refreshToken')?.value;

    if (!refreshToken) {
      try {
        const body = await request.json();
        refreshToken = body?.refreshToken;
      } catch (e) {
        // Body was empty or not JSON
      }
    }

    if (!refreshToken) {
      refreshToken = request.headers.get('x-refresh-token');
    }

    if (!refreshToken) {
      return NextResponse.json({ error: 'No refresh token provided.' }, { status: 401 });
    }

    // Verify Refresh Token
    let decoded;
    try {
      decoded = jwt.verify(refreshToken, getRefreshSecret());
    } catch (err) {
      return NextResponse.json({ error: 'Invalid or expired refresh token. Please sign in again.' }, { status: 401 });
    }

    await connectDB();
    const user = await User.findById(decoded.id);

    if (!user) {
      return NextResponse.json({ error: 'User no longer exists.' }, { status: 401 });
    }

    if (user.is_suspended) {
      return NextResponse.json({
        error: 'Your account has been suspended by the administrator.',
        isSuspended: true
      }, { status: 403 });
    }

    // Check token version to allow global logout / revocation
    if (decoded.version !== undefined && user.token_version !== undefined && decoded.version !== user.token_version) {
      return NextResponse.json({ error: 'Session has been invalidated. Please sign in again.' }, { status: 401 });
    }

    // Refresh Token Rotation: issue a new access token (7 days) and a new refresh token (30 days)
    const newAccessToken = jwt.sign(
      { id: user._id, email: user.email, name: user.full_name, role: user.role },
      getJwtSecret(),
      { expiresIn: '7d' } // 7 days
    );

    const tokenVersion = (user.token_version || 0);
    const newRefreshToken = jwt.sign(
      { id: user._id, version: tokenVersion },
      getRefreshSecret(),
      { expiresIn: '30d' } // 30 days
    );

    user.refresh_token = newRefreshToken;
    await user.save();

    const response = NextResponse.json({
      message: 'Token refreshed successfully',
      token: newAccessToken,
      refreshToken: newRefreshToken,
      user: { id: user._id, name: user.full_name, email: user.email, role: user.role }
    });

    response.cookies.set('refreshToken', newRefreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 30 * 24 * 60 * 60,
    });

    return response;
  } catch (error) {
    console.error('Refresh Token Error:', error);
    return NextResponse.json({ error: 'Server error while refreshing session.' }, { status: 500 });
  }
}

