import { NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import Item from '@/models/Item';
import User from '@/models/User';
import { getRazorpayLinkedAccountStatus } from '@/lib/razorpay';
import { verifyAuth } from '@/lib/auth';
import { cloudinary } from '@/lib/cloudinary';

export async function PUT(request, { params }) {
  try {
    const authResult = await verifyAuth(request);
    if (authResult.error) {
      return NextResponse.json({ error: authResult.error }, { status: 401 });
    }

    const resolvedParams = await params;
    const { id } = resolvedParams;
    const seller_id = authResult.user.id;

    await connectDB();
    const item = await Item.findOne({ _id: id, seller_id });

    if (!item) {
      return NextResponse.json({ error: 'Item not found or unauthorized' }, { status: 404 });
    }

    const formData = await request.formData();
    const name = formData.get('name');
    const description = formData.get('description');
    const price = formData.get('price');
    const condition_rating = formData.get('condition_rating');
    const category_id = formData.get('category_id');
    const listing_type = formData.get('listing_type');
    const rental_period = formData.get('rental_period');
    const quantity = formData.get('quantity');
    const is_active = formData.get('is_active');

    const willBeActive = is_active !== null && is_active !== undefined ? is_active === 'true' : item.is_active;

    if (willBeActive) {
      const seller = await User.findById(seller_id)
        .select('+razorpay_account_id razorpay_account_status bank_account upi_id');
      const isPayoutReady = Boolean(
        (seller?.bank_account?.account_number && seller?.bank_account?.ifsc_code)
        || seller?.upi_id
        || seller?.razorpay_account_status === 'activated'
        || seller?.razorpay_account_id
      );
      if (!isPayoutReady) {
        return NextResponse.json({ error: 'Add your payout details (Bank Account or UPI ID) in Profile > Payment before publishing a listing.' }, { status: 403 });
      }
    }

    if (listing_type === 'rent' && !['hour', 'day', 'month'].includes(rental_period)) {
      return NextResponse.json({ error: 'Please select a rental period' }, { status: 400 });
    }

    if (name) item.name = name;
    if (description) item.description = description;
    if (price) item.price = Number(price);
    if (condition_rating) item.condition_rating = Number(condition_rating);
    if (category_id) item.category_id = category_id;
    if (listing_type) {
      item.listing_type = listing_type;
      item.rental_period = listing_type === 'rent' ? rental_period : null;
    }

    const currentListingType = listing_type || item.listing_type;

    if (quantity !== null && quantity !== undefined) {
      const parsedQty = Number(quantity);
      item.quantity = parsedQty;

      if (currentListingType !== 'rent') {
        if (parsedQty > 0) {
          // Restocked: clear marked_sold_at and activate if requested
          item.marked_sold_at = null;
          if (is_active !== null && is_active !== undefined) {
            item.is_active = is_active === 'true';
          } else {
            item.is_active = true;
          }
        } else {
          // Zero quantity: item is sold out
          item.is_active = false;
          if (!item.marked_sold_at) {
            item.marked_sold_at = new Date();
          }
        }
      } else {
        // Rental items
        if (is_active !== null && is_active !== undefined) {
          item.is_active = is_active === 'true';
        }
      }
    } else if (is_active !== null && is_active !== undefined) {
      // Quantity was not passed, only visibility changed
      const activeBool = is_active === 'true';
      item.is_active = activeBool;
      if (activeBool && (currentListingType === 'rent' || item.quantity > 0)) {
        item.marked_sold_at = null;
      }
    }

    const files = formData.getAll('images');
    if (files && files.length > 0) {
      const uploadPromises = files.map(async (file) => {
        if (typeof file === 'string' && file.startsWith('http')) {
          return file;
        }
        if (file && typeof file.arrayBuffer === 'function') {
          const bytes = await file.arrayBuffer();
          const buffer = Buffer.from(bytes);
          const dataURI = `data:${file.type || 'image/jpeg'};base64,${buffer.toString('base64')}`;
          
          const uploadResponse = await cloudinary.uploader.upload(dataURI, {
            folder: 'campusmart/items',
          });
          return uploadResponse.secure_url;
        }
        return null;
      });
      const imageUrls = (await Promise.all(uploadPromises)).filter(Boolean);
      if (imageUrls.length > 0) {
        item.images = imageUrls;
      }
    }

    await item.save();

    return NextResponse.json(item);
  } catch (error) {
    console.error('Error updating item:', error);
    return NextResponse.json({ error: 'Server error updating item' }, { status: 500 });
  }
}

export async function DELETE(request, { params }) {
  try {
    const authResult = await verifyAuth(request);
    if (authResult.error) {
      return NextResponse.json({ error: authResult.error }, { status: 401 });
    }

    const resolvedParams = await params;
    const { id } = resolvedParams;
    const seller_id = authResult.user.id;

    await connectDB();
    const item = await Item.findOne({ _id: id, seller_id });

    if (!item) {
      return NextResponse.json({ error: 'Item not found or unauthorized' }, { status: 404 });
    }

    // Delete images from Cloudinary
    if (item.images && item.images.length > 0) {
      const deletePromises = item.images.map((url) => {
        const parts = url.split('/');
        const fileWithExt = parts[parts.length - 1];
        const publicId = `campusmart/items/${fileWithExt.split('.')[0]}`;
        return cloudinary.uploader.destroy(publicId).catch(() => {});
      });
      await Promise.all(deletePromises);
    }

    await Item.findByIdAndDelete(id);

    return NextResponse.json({ message: 'Item deleted successfully' });
  } catch (error) {
    console.error('Error deleting item:', error);
    return NextResponse.json({ error: 'Server error deleting item' }, { status: 500 });
  }
}
