import { NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import Item from '@/models/Item';
import Category from '@/models/Category';
import User from '@/models/User';
import Order from '@/models/Order';
import { verifyAuth } from '@/lib/auth';
import { cloudinary } from '@/lib/cloudinary';
import { getRazorpayLinkedAccountStatus } from '@/lib/razorpay';

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

    await connectDB();
    const user = await User.findById(seller_id)
      .select('+razorpay_account_id razorpay_account_status bank_account upi_id');
    const isPayoutReady = Boolean(
      (user?.bank_account?.account_number && user?.bank_account?.ifsc_code)
      || user?.upi_id
      || user?.razorpay_account_status === 'activated'
      || user?.razorpay_account_id
    );
    if (!isPayoutReady) {
      return NextResponse.json({ 
        error: 'Please add your payout details (Bank Account or UPI ID) in Profile > Payment before listing items so you can receive payments.' 
      }, { status: 403 });
    }

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
      quantity: listing_type === 'rent' ? 1 : Math.max(1, Number(quantity) || 1),
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

    let query = {
      is_active: true,
      is_suspended: { $ne: true },
      marked_sold_at: null,
      $nor: [
        { listing_type: { $ne: 'rent' }, quantity: { $lte: 0 } }
      ]
    };

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

    const min_price = searchParams.get('min_price');
    const max_price = searchParams.get('max_price');
    if (min_price || max_price) {
      query.price = {};
      if (min_price) query.price.$gte = Number(min_price);
      if (max_price) query.price.$lte = Number(max_price);
    }

    const condition_rating = searchParams.get('condition_rating');
    if (condition_rating) {
      // Support comma-separated condition ratings e.g. "4,5"
      const conditions = condition_rating.split(',').map(Number);
      query.condition_rating = { $in: conditions };
    }

    const min_rating = searchParams.get('min_rating');
    if (min_rating) {
      query.average_rating = { $gte: Number(min_rating) };
    }

    const seller_id = searchParams.get('seller_id');
    if (seller_id) {
      query.seller_id = seller_id;
    }

    const sort = searchParams.get('sort');
    let sortOptions = { createdAt: -1 };
    let trendingItemIds = [];

    if (sort === 'trending') {
      // Find items ordered in the previous 48 hours
      const fortyEightHoursAgo = new Date(Date.now() - 48 * 60 * 60 * 1000);
      const recentOrders = await Order.aggregate([
        {
          $match: {
            createdAt: { $gte: fortyEightHoursAgo },
            status: { $ne: 'cancelled' },
          },
        },
        {
          $group: {
            _id: '$item_id',
            orderCount: { $sum: 1 },
            latestOrderDate: { $max: '$createdAt' },
          },
        },
        {
          $sort: { orderCount: -1, latestOrderDate: -1 },
        },
      ]);

      trendingItemIds = recentOrders.map((r) => r._id);
      query._id = { $in: trendingItemIds };
    } else if (sort === 'price_asc') {
      sortOptions = { price: 1, createdAt: -1 };
    } else if (sort === 'price_desc') {
      sortOptions = { price: -1, createdAt: -1 };
    } else if (sort === 'recent' || sort === 'newest') {
      sortOptions = { createdAt: -1 };
    }

    const limitParam = searchParams.get('limit');
    let itemsQuery = Item.find(query)
      .populate('category_id', 'name')
      .populate('seller_id', 'full_name profile_photo_url phone');

    if (sort !== 'trending') {
      itemsQuery = itemsQuery.sort(sortOptions);
    }

    if (limitParam) {
      itemsQuery = itemsQuery.limit(parseInt(limitParam, 10));
    }

    let items = await itemsQuery;

    // For trending items, sort by order frequency and recency in the last 48 hours
    if (sort === 'trending' && trendingItemIds.length > 0) {
      const rankMap = new Map();
      trendingItemIds.forEach((id, idx) => {
        rankMap.set(id.toString(), idx);
      });
      items.sort((a, b) => {
        const rankA = rankMap.has(a._id.toString()) ? rankMap.get(a._id.toString()) : 99999;
        const rankB = rankMap.has(b._id.toString()) ? rankMap.get(b._id.toString()) : 99999;
        return rankA - rankB;
      });
    }

    const rentalItemIds = items.filter(item => item.listing_type === 'rent').map(item => item._id);
    const rentedItemIds = await Order.find({
      item_id: { $in: rentalItemIds },
      status: { $in: ['pending', 'delivered', 'rental_active', 'return_requested'] },
    }).distinct('item_id');
    const rentedItemIdSet = new Set(rentedItemIds.map(id => id.toString()));

    const now = Date.now();
    const formattedItems = items.map(item => {
      const createdAtMs = item.createdAt ? new Date(item.createdAt).getTime() : 0;
      const isNewlyAdded = createdAtMs > 0 && (now - createdAtMs) <= 24 * 60 * 60 * 1000 && (now - createdAtMs) >= 0;

      return {
        ...item.toJSON(),
        category_name: item.category_id?.name,
        seller_name: item.seller_id?.full_name,
        seller_image: item.seller_id?.profile_photo_url,
        is_currently_rented: item.listing_type === 'rent' && rentedItemIdSet.has(item._id.toString()),
        is_newly_added: isNewlyAdded,
      };
    });

    return NextResponse.json(formattedItems);
  } catch (error) {
    console.error('Error fetching all items:', error);
    return NextResponse.json({ error: 'Server error fetching items' }, { status: 500 });
  }
}
