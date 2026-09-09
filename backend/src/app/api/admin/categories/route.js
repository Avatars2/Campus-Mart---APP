import { NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import Category from '@/models/Category';
import User from '@/models/User';
import { verifyAuth } from '@/lib/auth';

export async function POST(request) {
  try {
    const authResult = await verifyAuth(request);
    
    if (authResult.error) {
      return NextResponse.json({ error: authResult.error }, { status: 401 });
    }

    await connectDB();
    const userId = authResult.user.id;

    // Verify admin role
    const user = await User.findById(userId);
    if (!user || user.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const { name, description, icon_url } = await request.json();

    if (!name) {
      return NextResponse.json({ error: 'Category name is required.' }, { status: 400 });
    }

    // Check if category already exists
    const existingCategory = await Category.findOne({ name: { $regex: new RegExp(`^${name}$`, 'i') } });
    if (existingCategory) {
      return NextResponse.json({ error: 'Category with this name already exists.' }, { status: 400 });
    }

    const newCategory = new Category({
      name,
      description: description || `All ${name.toLowerCase()}`,
      icon_url: icon_url || null,
    });

    await newCategory.save();

    return NextResponse.json(
      { message: 'Category created successfully.', category: newCategory },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error creating category:', error);
    return NextResponse.json({ error: 'Internal server error creating category.' }, { status: 500 });
  }
}
