import { NextResponse } from 'next/server';
import mongoose from 'mongoose';
import connectDB from '@/lib/db';
import User from '@/models/User';
import { verifyAdminAuth } from '@/lib/auth';
import { getRazorpayLinkedAccountStatus } from '@/lib/razorpay';

export async function PATCH(request) {
  try {
    const authResult = await verifyAdminAuth(request);
    if (authResult.error) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status || 401 });
    }
    const { seller_id, razorpay_account_id } = await request.json();
    if (!mongoose.Types.ObjectId.isValid(seller_id) || (razorpay_account_id !== null && (
      typeof razorpay_account_id !== 'string' || !/^acc_[A-Za-z0-9]+$/.test(razorpay_account_id)
    ))) {
      return NextResponse.json({ error: 'Provide a valid seller ID and Razorpay linked account ID or null' }, { status: 400 });
    }

    await connectDB();
    let accountStatus = 'not_started';
    if (razorpay_account_id) {
      accountStatus = await getRazorpayLinkedAccountStatus(razorpay_account_id);
    }
    const seller = await User.findOneAndUpdate(
      { _id: seller_id, role: 'student' },
      { $set: {
        razorpay_account_id: razorpay_account_id || null,
        razorpay_account_status: accountStatus,
      } },
      { returnDocument: 'after', runValidators: true }
    ).select('_id full_name razorpay_account_status');
    if (!seller) return NextResponse.json({ error: 'Seller not found' }, { status: 404 });
    return NextResponse.json({ message: 'Seller payout account updated', seller }, { status: 200 });
  } catch (error) {
    console.error('Seller Razorpay account update error:', error);
    return NextResponse.json({ error: 'Could not update seller payout account' }, { status: 500 });
  }
}
