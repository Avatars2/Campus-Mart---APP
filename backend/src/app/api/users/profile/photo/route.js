import { NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import User from '@/models/User';
import { verifyAuth } from '@/lib/auth';
import { cloudinary } from '@/lib/cloudinary';

export async function POST(request) {
  try {
    const authResult = await verifyAuth(request);
    if (authResult.error) {
      return NextResponse.json({ error: authResult.error }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get('image') || formData.get('photo'); // Handle both names

    if (!file) {
      return NextResponse.json({ error: 'No image file provided.' }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const dataURI = `data:${file.type || 'image/jpeg'};base64,${buffer.toString('base64')}`;

    // Upload to Cloudinary
    const uploadResult = await cloudinary.uploader.upload(dataURI, {
      folder: 'campus_mart_profiles',
      transformation: [{ width: 500, height: 500, crop: 'limit' }]
    });

    const photoUrl = uploadResult.secure_url;

    await connectDB();
    const userId = authResult.user.id;
    
    const user = await User.findByIdAndUpdate(
      userId,
      { profile_photo_url: photoUrl },
      { new: true }
    );

    if (!user) {
      return NextResponse.json({ error: 'User not found.' }, { status: 404 });
    }

    return NextResponse.json({ 
      message: 'Profile photo uploaded successfully',
      photoUrl: user.profile_photo_url 
    });
  } catch (error) {
    console.error('Upload Photo Error:', error);
    return NextResponse.json({ error: 'Failed to upload photo: ' + error.message }, { status: 500 });
  }
}
