import { NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import connectDB from '@/lib/db';
import User from '@/models/User';
import { getRefreshSecret } from '@/lib/authValidation';

export async function POST(request) {
  try {
    let refreshToken = request.cookies.get('refreshToken')?.value;

    if (!refreshToken) {
      try {
        const body = await request.json();
        refreshToken = body?.refreshToken;
      } catch (e) {
        // No body
      }
    }

    if (refreshToken) {
      try {
        const decoded = jwt.verify(refreshToken, getRefreshSecret());
        if (decoded?.id) {
          await connectDB();
          const user = await User.findById(decoded.id);
          if (user) {
            user.refresh_token = null;
            user.token_version = (user.token_version || 0) + 1; // Invalidate all existing tokens
            await user.save();
          }
        }
      } catch (err) {
        // Token was invalid, still proceed with clearing cookie
      }
    }

    const response = NextResponse.json({ message: 'Logged out successfully' });

    // Clear refresh cookie
    response.cookies.set('refreshToken', '', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 0,
    });

    return response;
  } catch (error) {
    console.error('Logout Error:', error);
    return NextResponse.json({ error: 'Server error during logout.' }, { status: 500 });
  }
}

