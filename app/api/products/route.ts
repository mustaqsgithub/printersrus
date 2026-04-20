import { NextRequest, NextResponse } from 'next/server';
import { dbHelpers } from '@/lib/database';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const category = searchParams.get('category') || undefined;
    const sale = searchParams.get('sale') === 'true' || undefined;
    const featured = searchParams.get('featured') === 'true' || undefined;
    const search = searchParams.get('search') || undefined;

    let products = await dbHelpers.getAllProducts({
      category,
      sale,
      search,
    });

    // Filter by featured if requested
    if (featured) {
      products = products.filter((p: any) => p.featured);
    }

    // Transform database format to API format
    const transformedProducts = products.map((product: any) => ({
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
    }));

    return NextResponse.json({
      products: transformedProducts,
      total: transformedProducts.length,
    });
  } catch (error) {
    console.error('Error fetching products:', error);
    return NextResponse.json(
      { error: 'Failed to fetch products' },
      { status: 500 }
    );
  }
}
