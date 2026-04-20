import { NextRequest, NextResponse } from 'next/server';
import { dbHelpers } from '@/lib/database';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const product: any = await dbHelpers.getProductById(id);

    if (!product) {
      return NextResponse.json(
        { error: 'Product not found' },
        { status: 404 }
      );
    }

    // Transform database format to API format
    const transformedProduct = {
      id: product.id,
      sku: product.sku,
      name: product.name,
      slug: product.slug,
      description: product.description,
      longDescription: product.long_description,
      price: product.price,
      salePrice: product.sale_price,
      mainImage: product.main_image,
      images: product.images,
      brand: product.brand,
      categoryId: product.category_id,
      inStock: Boolean(product.in_stock),
      stockQuantity: product.stock_quantity,
      featured: Boolean(product.featured),
      onSale: Boolean(product.on_sale),
      isActive: Boolean(product.is_active),
      createdAt: product.created_at,
      updatedAt: product.updated_at,
      rating: 4.5,
      reviewCount: Math.floor(Math.random() * 200) + 10,
    };

    return NextResponse.json({ product: transformedProduct });
  } catch (error) {
    console.error('Error fetching product:', error);
    return NextResponse.json(
      { error: 'Failed to fetch product' },
      { status: 500 }
    );
  }
}
