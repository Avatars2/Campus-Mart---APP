import { NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import User from '@/models/User';
import { verifyAuth } from '@/lib/auth';
import { razorpayPartnerRequest } from '@/lib/razorpay';

export const runtime = 'nodejs';

const allowedDocumentTypes = new Set([
  'aadhar_front',
  'aadhar_back',
  'passport_front',
  'passport_back',
  'voter_id_front',
  'voter_id_back',
]);

const maxImageSize = 4 * 1024 * 1024;
const maxPdfSize = 2 * 1024 * 1024;

export async function POST(request) {
  try {
    const authResult = await verifyAuth(request);
    if (authResult.error) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status || 401 });
    }
    if (authResult.user.role !== 'student') {
      return NextResponse.json({ error: 'Only sellers can upload KYC documents' }, { status: 403 });
    }

    const contentLength = Number(request.headers.get('content-length'));
    if (Number.isFinite(contentLength) && contentLength > maxImageSize + 64 * 1024) {
      return NextResponse.json({ error: 'KYC document exceeds the 4 MB upload limit' }, { status: 413 });
    }

    const formData = await request.formData();
    const documentType = formData.get('document_type');
    const file = formData.get('file');
    if (typeof documentType !== 'string' || !allowedDocumentTypes.has(documentType)) {
      return NextResponse.json({ error: 'Choose a supported front or back identity document' }, { status: 400 });
    }
    if (!(file instanceof File) || file.size === 0) {
      return NextResponse.json({ error: 'Select a KYC document to upload' }, { status: 400 });
    }
    const maxSize = file.type === 'application/pdf' ? maxPdfSize : maxImageSize;
    if (!['image/jpeg', 'image/png', 'application/pdf'].includes(file.type) || file.size > maxSize) {
      return NextResponse.json({
        error: 'Upload a JPG or PNG up to 4 MB, or a PDF up to 2 MB',
      }, { status: 400 });
    }

    await connectDB();
    const user = await User.findById(authResult.user.id)
      .select('role razorpay_account_status +razorpay_account_id +razorpay_stakeholder_id');
    if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });
    if (!user.razorpay_account_id || !user.razorpay_stakeholder_id) {
      return NextResponse.json({ error: 'Submit your seller details before uploading KYC documents' }, { status: 409 });
    }
    const upstreamForm = new FormData();
    const extension = file.type === 'application/pdf' ? 'pdf' : file.type === 'image/png' ? 'png' : 'jpg';
    upstreamForm.append('file', file, `seller-proof-${documentType}.${extension}`);
    upstreamForm.append('document_type', documentType);
    await razorpayPartnerRequest(
      `/accounts/${encodeURIComponent(user.razorpay_account_id)}/stakeholders/${encodeURIComponent(user.razorpay_stakeholder_id)}/documents`,
      'POST',
      upstreamForm
    );

    return NextResponse.json({ message: 'KYC document securely uploaded to Razorpay' }, { status: 200 });
  } catch (error) {
    console.error('Seller KYC document upload failed:', error.message);
    return NextResponse.json({
      error: 'Could not upload the KYC document to Razorpay. Check the file and try again.',
    }, { status: 502 });
  }
}
