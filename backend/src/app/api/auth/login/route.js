import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import connectDB from '@/lib/db';
import User from '@/models/User';
import { getJwtSecret, isAllowedCollegeEmail, normalizeEmail } from '@/lib/authValidation';

export async function POST(request) {
  try {
    await connectDB();
    const { email, password } = await request.json();
    const normalizedEmail = normalizeEmail(email);
    if (!normalizedEmail || !password || !isAllowedCollegeEmail(normalizedEmail)) {
      return NextResponse.json({ error: 'Invalid email or password.' }, { status: 400 });
    }

    const user = await User.findOne({ email: normalizedEmail });

    if (!user) {
      return NextResponse.json({ error: 'Invalid email or password.' }, { status: 400 });
    }

    if (!user.is_verified) {
      return NextResponse.json({ error: 'Please verify your email before logging in.' }, { status: 400 });
    }

    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
      return NextResponse.json({ error: 'Invalid email or password.' }, { status: 400 });
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
    console.error('Login Error:', error);
    return NextResponse.json({ error: 'Internal server error during login.' }, { status: 500 });
  }
}
