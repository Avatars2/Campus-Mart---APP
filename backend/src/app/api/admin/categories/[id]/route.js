import { NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import Category from '@/models/Category';
import User from '@/models/User';
import { verifyAuth } from '@/lib/auth';

export async function PUT(request, { params }) {
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

    const { id } = await params;
    const { name, description, icon_url } = await request.json();

    if (!name) {
      return NextResponse.json({ error: 'Category name is required.' }, { status: 400 });
    }

    // Check if category exists
    const categoryToUpdate = await Category.findById(id);
    if (!categoryToUpdate) {
      return NextResponse.json({ error: 'Category not found.' }, { status: 404 });
    }

    // Check if new name conflicts with another category
    if (name.toLowerCase() !== categoryToUpdate.name.toLowerCase()) {
      const existingCategory = await Category.findOne({ name: { $regex: new RegExp(`^${name}$`, 'i') } });
      if (existingCategory && existingCategory._id.toString() !== id) {
        return NextResponse.json({ error: 'Another category with this name already exists.' }, { status: 400 });
      }
    }

    categoryToUpdate.name = name;
    categoryToUpdate.description = description || categoryToUpdate.description;
    categoryToUpdate.icon_url = icon_url || categoryToUpdate.icon_url;

    await categoryToUpdate.save();

    return NextResponse.json(
      { message: 'Category updated successfully.', category: categoryToUpdate },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error updating category:', error);
    return NextResponse.json({ error: 'Internal server error updating category.' }, { status: 500 });
  }
}

export async function DELETE(request, { params }) {
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

    const { id } = await params;

    // Optional: check if items exist in this category before deleting
    // For now, allow force delete

    const deletedCategory = await Category.findByIdAndDelete(id);
    
    if (!deletedCategory) {
      return NextResponse.json({ error: 'Category not found.' }, { status: 404 });
    }

    return NextResponse.json(
      { message: 'Category deleted successfully.' },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error deleting category:', error);
    return NextResponse.json({ error: 'Internal server error deleting category.' }, { status: 500 });
  }
}
