import { NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import User from '@/models/User';
import { normalizeEmail } from '@/lib/authValidation';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    await connectDB();
    const configuredAdminEmail = normalizeEmail(process.env.EXPO_PUBLIC_ADMIN_EMAIL);

    // Look for admin user by configured admin email or admin role
    let admin = null;
    if (configuredAdminEmail) {
      admin = await User.findOne({ email: configuredAdminEmail }).select('full_name email phone role');
    }
    if (!admin) {
      admin = await User.findOne({ role: 'admin' }).select('full_name email phone role');
    }

    const email = admin?.email || process.env.EXPO_PUBLIC_ADMIN_EMAIL || 'avatars2610@gmail.com';
    const phone = admin?.phone || '1234567890';
    const name = admin?.full_name || 'CampusMart Admin';

    return NextResponse.json({
      name,
      email,
      phone,
    });
  } catch (error) {
    console.error('Support Contact Fetch Error:', error);
    return NextResponse.json({
      name: 'CampusMart Admin',
      email: process.env.EXPO_PUBLIC_ADMIN_EMAIL || 'avatars2610@gmail.com',
      phone: '1234567890',
    });
  }
}

