import { NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import Item from '@/models/Item';
import Category from '@/models/Category';
import User from '@/models/User';
import Order from '@/models/Order';
import { verifyAuth } from '@/lib/auth';
import { cloudinary } from '@/lib/cloudinary';

export async function POST(request) {
  try {
    const authResult = await verifyAuth(request);
    if (authResult.error) {
      return NextResponse.json({ error: authResult.error }, { status: 401 });
    }

    const formData = await request.formData();
    const name = formData.get('name');
    const description = formData.get('description');
    const price = formData.get('price');
    const condition_rating = formData.get('condition_rating');
    const category_id = formData.get('category_id');
    const listing_type = formData.get('listing_type');
    const rental_period = formData.get('rental_period');
    const quantity = formData.get('quantity') || 1;

    if (!name || !description || !price || !condition_rating || !category_id || !listing_type) {
      return NextResponse.json({ error: 'All required fields must be provided' }, { status: 400 });
    }

    if (listing_type === 'rent' && !['hour', 'day', 'month'].includes(rental_period)) {
      return NextResponse.json({ error: 'Please select a rental period' }, { status: 400 });
    }

    const seller_id = authResult.user.id;
    let images = [];

    const files = formData.getAll('images');
    if (files && files.length > 0) {
      const uploadPromises = files.map(async (file) => {
        const bytes = await file.arrayBuffer();
        const buffer = Buffer.from(bytes);
        const dataURI = `data:${file.type || 'image/jpeg'};base64,${buffer.toString('base64')}`;
        
        const uploadResponse = await cloudinary.uploader.upload(dataURI, {
          folder: 'campusmart/items',
        });
        return uploadResponse.secure_url;
      });
      images = await Promise.all(uploadPromises);
    }

    await connectDB();
    const newItem = await Item.create({
      seller_id,
      category_id,
      name,
      description,
      price: Number(price),
      condition_rating: Number(condition_rating),
      quantity: Number(quantity),
      listing_type,
      rental_period: listing_type === 'rent' ? rental_period : null,
      images,
    });

    return NextResponse.json(newItem, { status: 201 });
  } catch (error) {
    console.error('Error creating item:', error);
    return NextResponse.json({ error: 'Server error creating item' }, { status: 500 });
  }
}

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search');
    const category = searchParams.get('category');
    const listing_type = searchParams.get('listing_type');

    await connectDB();

    let query = { is_active: true };

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } }
      ];
    }

    if (listing_type && listing_type !== 'all') {
      query.listing_type = listing_type;
    }

    if (category) {
      const categoryDoc = await Category.findOne({ name: category });
      if (categoryDoc) {
        query.category_id = categoryDoc._id;
      }
    }

    const items = await Item.find(query)
      .populate('category_id', 'name')
      .populate('seller_id', 'full_name profile_photo_url')
      .sort({ createdAt: -1 });

    const rentalItemIds = items.filter(item => item.listing_type === 'rent').map(item => item._id);
    const rentedItemIds = await Order.find({
      item_id: { $in: rentalItemIds },
      status: { $in: ['pending', 'delivered', 'rental_active', 'return_requested'] },
    }).distinct('item_id');
    const rentedItemIdSet = new Set(rentedItemIds.map(id => id.toString()));

    const formattedItems = items.map(item => ({
      ...item.toJSON(),
      category_name: item.category_id?.name,
      seller_name: item.seller_id?.full_name,
      seller_image: item.seller_id?.profile_photo_url,
      is_currently_rented: item.listing_type === 'rent' && rentedItemIdSet.has(item._id.toString()),
    }));

    return NextResponse.json(formattedItems);
  } catch (error) {
    console.error('Error fetching all items:', error);
    return NextResponse.json({ error: 'Server error fetching items' }, { status: 500 });
  }
}
