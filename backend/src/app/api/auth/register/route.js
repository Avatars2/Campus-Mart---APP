import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import connectDB from '@/lib/db';
import User from '@/models/User';
import OTP from '@/models/OTP';
import { sendOTP } from '@/lib/emailService';

export async function POST(request) {
  try {
    await connectDB();
    const { full_name, email, password, phone, student_id } = await request.json();

    const existingUser = await User.findOne({ email });
    const existingStudentId = await User.findOne({ student_id });

    if (existingUser && existingUser.is_verified) {
      return NextResponse.json({ error: 'User with this email already exists and is verified.' }, { status: 400 });
    }

    if (existingStudentId && existingStudentId.is_verified) {
      return NextResponse.json({ error: 'User with this student ID already exists.' }, { status: 400 });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    if (existingUser && !existingUser.is_verified) {
      // If user with this email exists but not verified, update their info
      await User.findOneAndUpdate(
        { email },
        { full_name, password: hashedPassword, phone, student_id }
      );
    } else if (existingStudentId && !existingStudentId.is_verified) {
      // If user with this student ID exists but not verified, update their info including email
      await User.findOneAndUpdate(
        { student_id },
        { full_name, email, password: hashedPassword, phone }
      );
    } else {
      // Completely new user
      await User.create({
        full_name,
        email,
        password: hashedPassword,
        phone,
        student_id,
        is_verified: false,
      });
    }

    const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 10 * 60000);

    await OTP.create({
      email,
      otp_code: otpCode,
      expires_at: expiresAt,
    });

    if (process.env.EMAIL_USER && process.env.EMAIL_PASS) {
      await sendOTP(email, otpCode);
    } else {
      console.log(`[DEV MODE] OTP for ${email} is ${otpCode}`);
    }

    return NextResponse.json({ message: 'OTP sent successfully to your college email.' });
  } catch (error) {
    console.error('Registration Error:', error);
    return NextResponse.json({ error: 'Internal server error during registration.' }, { status: 500 });
  }
}
