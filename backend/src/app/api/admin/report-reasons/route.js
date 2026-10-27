import { NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import ReportReason from '@/models/ReportReason';
import { verifyAdminAuth } from '@/lib/auth';

const DEFAULT_USER_REASONS = [
  { title: 'Harassment/Abuse', target_type: 'user' },
  { title: 'Scam/Fraud', target_type: 'user' },
  { title: 'Spam', target_type: 'user' },
  { title: 'Inappropriate Profile', target_type: 'user' },
  { title: 'Other', target_type: 'user' },
];

export async function GET(request) {
  try {
    const adminCheck = await verifyAdminAuth(request);
    if (adminCheck.error) {
      return NextResponse.json({ error: adminCheck.error }, { status: adminCheck.status || 401 });
    }

    await connectDB();

    // Clean up any old item-only reasons
    await ReportReason.deleteMany({ target_type: 'item' });

    const count = await ReportReason.countDocuments();
    if (count === 0) {
      await ReportReason.insertMany(DEFAULT_USER_REASONS);
    }

    const reasons = await ReportReason.find({ is_active: true }).sort({ createdAt: -1 });
    return NextResponse.json(reasons);
  } catch (error) {
    console.error('Error fetching admin report reasons:', error);
    return NextResponse.json({ error: 'Server error fetching report reasons.' }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const adminCheck = await verifyAdminAuth(request);
    if (adminCheck.error) {
      return NextResponse.json({ error: adminCheck.error }, { status: adminCheck.status || 401 });
    }

    await connectDB();

    const body = await request.json();
    const { title } = body;

    if (!title || !title.trim()) {
      return NextResponse.json({ error: 'Reason title is required.' }, { status: 400 });
    }

    const trimmedTitle = title.trim();

    // Check if reason already exists (case-insensitive)
    const existing = await ReportReason.findOne({
      title: { $regex: new RegExp(`^${trimmedTitle}$`, 'i') },
    });

    if (existing) {
      return NextResponse.json({ error: 'This report reason already exists.' }, { status: 400 });
    }

    const newReason = new ReportReason({
      title: trimmedTitle,
      target_type: 'user',
      is_active: true,
    });

    await newReason.save();

    return NextResponse.json(
      { message: 'Report reason added successfully.', reason: newReason },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error adding report reason:', error);
    return NextResponse.json({ error: 'Server error adding report reason.' }, { status: 500 });
  }
}
