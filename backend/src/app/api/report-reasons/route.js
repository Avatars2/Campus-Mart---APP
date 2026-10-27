import { NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import ReportReason from '@/models/ReportReason';

const DEFAULT_USER_REASONS = [
  { title: 'Harassment/Abuse', target_type: 'user' },
  { title: 'Scam/Fraud', target_type: 'user' },
  { title: 'Spam', target_type: 'user' },
  { title: 'Inappropriate Profile', target_type: 'user' },
  { title: 'Other', target_type: 'user' },
];

export async function GET() {
  try {
    await connectDB();

    // Clean up any old item-only reasons since reports are now user-only
    await ReportReason.deleteMany({ target_type: 'item' });

    // Seed defaults if empty
    const count = await ReportReason.countDocuments();
    if (count === 0) {
      await ReportReason.insertMany(DEFAULT_USER_REASONS);
    }

    const reasons = await ReportReason.find({ is_active: true }).sort({ createdAt: 1 });
    return NextResponse.json(reasons);
  } catch (error) {
    console.error('Error fetching report reasons:', error);
    return NextResponse.json({ error: 'Server error fetching report reasons.' }, { status: 500 });
  }
}
