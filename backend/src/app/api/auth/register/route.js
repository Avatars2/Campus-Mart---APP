import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import connectDB from '@/lib/db';
import User from '@/models/User';
import { normalizeEmail, validateRegistrationInput } from '@/lib/authValidation';
import { createAndSendOtp } from '@/lib/otp';

export async function POST(request) {
  try {
    await connectDB();
    const { full_name, email, password, phone, student_id } = await request.json();
    const normalizedEmail = normalizeEmail(email);
    const validationError = validateRegistrationInput({ full_name, email: normalizedEmail, password, phone, student_id });
    if (validationError) return NextResponse.json({ error: validationError }, { status: 400 });

    const existingUser = await User.findOne({ email: normalizedEmail });
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
        { email: normalizedEmail },
        { full_name: full_name.trim(), password: hashedPassword, phone: phone.trim(), student_id: student_id.trim() }
      );
    } else if (existingStudentId && !existingStudentId.is_verified) {
      // If user with this student ID exists but not verified, update their info including email
      await User.findOneAndUpdate(
        { student_id: student_id.trim() },
        { full_name: full_name.trim(), email: normalizedEmail, password: hashedPassword, phone: phone.trim() }
      );
    } else {
      // Completely new user
      await User.create({
        full_name,
        email: normalizedEmail,
        password: hashedPassword,
        phone,
        student_id,
        is_verified: false,
      });
    }

    const otpResult = await createAndSendOtp(normalizedEmail, 'Registration');
    if (otpResult.error) {
      return NextResponse.json({ error: otpResult.error }, { status: otpResult.status });
    }

    return NextResponse.json({ message: 'OTP sent successfully to your college email.' });
  } catch (error) {
    console.error('Registration Error:', error);
    return NextResponse.json({ error: 'Internal server error during registration.' }, { status: 500 });
  }
}
