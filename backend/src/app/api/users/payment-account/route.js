import { NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import User from '@/models/User';
import { verifyAuth } from '@/lib/auth';
import { getRazorpayLinkedAccountStatus, razorpayPartnerRequest } from '@/lib/razorpay';

function formatIndianPhoneNumber(phone) {
  const digits = String(phone || '').replace(/\D/g, '');
  const localNumber = digits.length === 12 && digits.startsWith('91') ? digits.slice(2) : digits;
  return /^[6-9]\d{9}$/.test(localNumber) ? { localNumber, international: `+91${localNumber}` } : null;
}

function normalizeOnboardingDetails(payload) {
  const fields = [
    'legal_name',
    'pan',
    'bank_account_number',
    'ifsc_code',
    'beneficiary_name',
    'street',
    'city',
    'state',
    'postal_code',
  ];
  const values = Object.fromEntries(fields.map((field) => [
    field,
    typeof payload?.[field] === 'string' ? payload[field].trim() : '',
  ]));
  values.legal_name = values.legal_name.replace(/\s+/g, ' ');
  values.pan = values.pan.toUpperCase();
  values.ifsc_code = values.ifsc_code.toUpperCase();
  values.beneficiary_name = values.beneficiary_name.replace(/\s+/g, ' ');
  values.city = values.city.replace(/\s+/g, ' ');
  values.state = values.state.replace(/\s+/g, ' ');
  return values;
}

function validateOnboardingDetails(details, payload) {
  if (
    details.legal_name.length < 2 || details.legal_name.length > 150
    || !/^[\p{L}\p{M} .'-]+$/u.test(details.legal_name)
  ) return 'Enter the legal name exactly as it appears on the seller PAN.';
  if (!/^[A-Z]{5}\d{4}[A-Z]$/.test(details.pan)) return 'Enter a valid 10-character PAN.';
  if (!/^\d{9,18}$/.test(details.bank_account_number)) return 'Enter a valid bank account number.';
  if (!/^[A-Z]{4}0[A-Z0-9]{6}$/.test(details.ifsc_code)) return 'Enter a valid 11-character IFSC code.';
  if (details.beneficiary_name.length < 2 || details.beneficiary_name.length > 150) {
    return 'Enter the bank account beneficiary name.';
  }
  if (!details.street || details.street.length > 200) return 'Enter a valid residential address.';
  if (!details.city || details.city.length > 100) return 'Enter a valid city.';
  if (!details.state || details.state.length > 100) return 'Enter a valid state.';
  if (!/^\d{6}$/.test(details.postal_code)) return 'Enter a valid 6-digit Indian PIN code.';
  if (payload?.tnc_accepted !== true || typeof payload?.tnc_id !== 'string' || !payload.tnc_id) {
    return 'Review and accept the current Razorpay terms to continue.';
  }
  return null;
}

export async function GET(request) {
  try {
    const authResult = await verifyAuth(request);
    if (authResult.error) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status || 401 });
    }
    await connectDB();
    const user = await User.findById(authResult.user.id)
      .select('+razorpay_account_id razorpay_account_status bank_account upi_id payout_method');
    if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

    const hasBank = Boolean(user.bank_account?.account_number && user.bank_account?.ifsc_code);
    const hasUpi = Boolean(user.upi_id);
    const isReady = hasBank || hasUpi || user.razorpay_account_status === 'activated';

    return NextResponse.json({
      account_status: isReady ? 'activated' : (user.razorpay_account_status || 'not_started'),
      payouts_available: isReady,
      bank_account: user.bank_account || null,
      upi_id: user.upi_id || null,
      payout_method: user.payout_method || (hasBank ? 'bank_account' : hasUpi ? 'upi' : 'none'),
    }, { status: 200 });
  } catch (error) {
    console.error('Seller Razorpay account status error:', error);
    return NextResponse.json({ error: 'Could not retrieve Razorpay account status' }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const authResult = await verifyAuth(request);
    if (authResult.error) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status || 401 });
    }

    if (authResult.user.role !== 'student') {
      return NextResponse.json({ error: 'Only seller accounts can submit payout onboarding' }, { status: 403 });
    }

    const payload = await request.json();
    const {
      bank_account_number,
      ifsc_code,
      beneficiary_name,
      bank_name,
      branch_name,
      upi_id,
      payout_method = 'bank_account',
    } = payload;

    await connectDB();
    const user = await User.findById(authResult.user.id);
    if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

    if (payout_method === 'upi') {
      if (!upi_id || !/^[a-zA-Z0-9.\-_]{2,256}@[a-zA-Z]{2,64}$/.test(upi_id.trim())) {
        return NextResponse.json({ error: 'Please enter a valid UPI ID (e.g., yourname@okhdfcbank)' }, { status: 400 });
      }
      user.upi_id = upi_id.trim();
      user.is_upi_verified = true;
      user.payout_method = 'upi';
      user.razorpay_account_status = 'activated';
      await user.save();

      return NextResponse.json({
        message: 'UPI payout details updated successfully!',
        account_status: 'activated',
        payouts_available: true,
      }, { status: 200 });
    }

    // Bank Account validation
    const accNum = String(bank_account_number || '').trim();
    const ifsc = String(ifsc_code || '').trim().toUpperCase();
    const bName = String(beneficiary_name || '').trim();

    if (!/^\d{9,18}$/.test(accNum)) {
      return NextResponse.json({ error: 'Enter a valid bank account number (9 to 18 digits)' }, { status: 400 });
    }
    if (!/^[A-Z]{4}0[A-Z0-9]{6}$/.test(ifsc)) {
      return NextResponse.json({ error: 'Enter a valid 11-character IFSC code (e.g. SBIN0001234)' }, { status: 400 });
    }
    if (bName.length < 2) {
      return NextResponse.json({ error: 'Enter the account holder name' }, { status: 400 });
    }

    let resolvedBankName = bank_name || null;
    let resolvedBranchName = branch_name || null;

    try {
      const ifscRes = await fetch(`https://ifsc.razorpay.com/${ifsc}`);
      if (ifscRes.ok) {
        const ifscData = await ifscRes.json();
        resolvedBankName = ifscData.BANK || resolvedBankName;
        resolvedBranchName = ifscData.BRANCH ? `${ifscData.BRANCH}${ifscData.CITY ? ', ' + ifscData.CITY : ''}` : resolvedBranchName;
      } else if (ifscRes.status === 404) {
        return NextResponse.json({ error: 'Invalid IFSC code: No matching bank branch found in RBI records.' }, { status: 400 });
      }
    } catch (ifscErr) {
      console.log('IFSC verification lookup warning:', ifscErr.message);
    }

    user.bank_account = {
      account_number: accNum,
      ifsc_code: ifsc,
      beneficiary_name: bName,
      bank_name: resolvedBankName,
      branch_name: resolvedBranchName,
    };
    user.payout_method = 'bank_account';
    user.razorpay_account_status = 'activated';
    await user.save();

    return NextResponse.json({
      message: 'Bank account linked for payouts successfully!',
      account_status: 'activated',
      payouts_available: true,
      bank_account: user.bank_account,
    }, { status: 200 });
  } catch (error) {
    console.error('Seller payout details update failed:', error);
    return NextResponse.json({ error: error.message || 'Could not update payout account' }, { status: 500 });
  }
}
