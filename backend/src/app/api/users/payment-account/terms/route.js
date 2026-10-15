import { NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth';
import { razorpayPartnerRequest } from '@/lib/razorpay';

function trustedTermsUrl(value) {
  if (typeof value !== 'string') return null;
  try {
    const url = new URL(value);
    return url.protocol === 'https:' && (url.hostname === 'razorpay.com' || url.hostname.endsWith('.razorpay.com'))
      ? url.toString()
      : null;
  } catch {
    return null;
  }
}

export async function GET(request) {
  try {
    const authResult = await verifyAuth(request);
    if (authResult.error) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status || 401 });
    }
    if (!process.env.RAZORPAY_PARTNER_KEY_ID || !process.env.RAZORPAY_PARTNER_KEY_SECRET) {
      return NextResponse.json({ error: 'Razorpay Partner APIs are not configured' }, { status: 503 });
    }

    const terms = await razorpayPartnerRequest('/products/payments/tnc');
    const urls = {
      terms: trustedTermsUrl(terms.tnc?.terms),
      privacy: trustedTermsUrl(terms.tnc?.privacy),
      agreement: trustedTermsUrl(terms.tnc?.agreement),
    };
    if (!terms.id || Object.values(urls).some((url) => !url)) {
      throw new Error('Razorpay Partner API returned incomplete terms and conditions');
    }
    return NextResponse.json({ id: terms.id, urls }, { status: 200 });
  } catch (error) {
    console.error('Razorpay Partner terms retrieval failed:', error.message);
    return NextResponse.json({ error: 'Could not retrieve current Razorpay terms and conditions' }, { status: 502 });
  }
}
