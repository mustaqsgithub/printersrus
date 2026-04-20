import { NextResponse } from 'next/server';
import { dbHelpers } from '@/lib/database';

export async function GET() {
  try {
    const categories = await dbHelpers.getAllCategories();

    // Transform database format to API format
    const transformedCategories = categories.map((category: any) => ({
      id: category.id,
      name: category.name,
      slug: category.slug,
      description: category.description,
      image: category.image,
      parentId: category.parent_id,
      createdAt: category.created_at,
      updatedAt: category.updated_at,
    }));

    return NextResponse.json({
      categories: transformedCategories,
      total: transformedCategories.length,
    });
  } catch (error) {
    console.error('Error fetching categories:', error);
    return NextResponse.json(
      { error: 'Failed to fetch categories' },
      { status: 500 }
    );
  }
}
