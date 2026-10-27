import { NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import ReportReason from '@/models/ReportReason';

export async function DELETE(request, { params }) {
  try {
    await connectDB();

    const { id } = await params;
    const deleted = await ReportReason.findByIdAndDelete(id);

    if (!deleted) {
      return NextResponse.json({ error: 'Report reason not found.' }, { status: 404 });
    }

    return NextResponse.json({ message: 'Report reason deleted successfully.' });
  } catch (error) {
    console.error('Error deleting report reason:', error);
    return NextResponse.json({ error: 'Server error deleting report reason.' }, { status: 500 });
  }
}

