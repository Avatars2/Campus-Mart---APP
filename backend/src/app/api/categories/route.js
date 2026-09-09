import { NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import Category from '@/models/Category';

export async function GET() {
  try {
    await connectDB();
    const categories = await Category.find().sort({ name: 1 });
    
    // Seed default categories if empty
    if (categories.length === 0) {
      const defaultCategories = ['Electronics', 'Books', 'Furniture', 'Clothing', 'Others'];
      const insertedCategories = [];
      
      for (const name of defaultCategories) {
        const newCat = await Category.create({
          name,
          description: `All ${name.toLowerCase()}`,
          icon_url: null,
        });
        insertedCategories.push(newCat);
      }
      return NextResponse.json(insertedCategories);
    }

    return NextResponse.json(categories);
  } catch (error) {
    console.error('Error in getCategories:', error);
    return NextResponse.json({ error: 'Server error fetching categories.' }, { status: 500 });
  }
}
