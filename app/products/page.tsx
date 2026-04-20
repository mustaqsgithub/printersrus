import { Suspense } from 'react';
import { ProductGrid } from '@/components/ProductGrid';
import { ProductFilters } from '@/components/ProductFilters';
import { ProductSort } from '@/components/ProductSort';
import { dbHelpers } from '@/lib/database';

interface SearchParams {
  category?: string;
  sale?: string;
  search?: string;
  sort?: string;
}

export const metadata = {
  title: 'Products',
  description: 'Browse our wide selection of printers, ink, toner, and accessories',
};

export default async function ProductsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params = await searchParams;
  const { category, sale, search, sort } = params;

  // Fetch products based on filters
  const dbProducts = await dbHelpers.getAllProducts({
    category,
    sale: sale === 'true',
    search,
  });

  // Transform database products to component format
  const products = dbProducts.map((p: any) => ({
    id: p.id,
    sku: p.sku,
    name: p.name,
    slug: p.slug,
    description: p.description,
    longDescription: p.long_description,
    price: p.price,
    salePrice: p.sale_price,
    mainImage: p.main_image,
    images: p.images,
    brand: p.brand,
    categoryId: p.category_id,
    inStock: Boolean(p.in_stock),
    stockQuantity: p.stock_quantity,
    featured: Boolean(p.featured),
    onSale: Boolean(p.on_sale),
    isActive: Boolean(p.is_active),
    createdAt: p.created_at,
    updatedAt: p.updated_at,
    rating: 4.5,
    reviewCount: Math.floor(Math.random() * 200) + 10,
  }));

  // Sort products
  let sortedProducts = [...products];
  if (sort === 'featured' || !sort) {
    // Sort by featured first, then by created date
    sortedProducts.sort((a, b) => {
      if (a.featured && !b.featured) return -1;
      if (!a.featured && b.featured) return 1;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
  } else if (sort === 'price-asc') {
    sortedProducts.sort((a, b) => {
      const priceA = a.salePrice || a.price;
      const priceB = b.salePrice || b.price;
      return priceA - priceB;
    });
  } else if (sort === 'price-desc') {
    sortedProducts.sort((a, b) => {
      const priceA = a.salePrice || a.price;
      const priceB = b.salePrice || b.price;
      return priceB - priceA;
    });
  } else if (sort === 'name') {
    sortedProducts.sort((a, b) => a.name.localeCompare(b.name));
  } else if (sort === 'rating') {
    sortedProducts.sort((a, b) => (b.rating || 0) - (a.rating || 0));
  }

  // Get category name if filtered
  const categoryObj: any = category ? await dbHelpers.getCategoryBySlug(category) : null;

  // Get all categories for filters
  const allCategories = (await dbHelpers.getAllCategories()).map((c: any) => ({
    id: c.id,
    name: c.name,
    slug: c.slug,
  }));

  return (
    <div className="container mx-auto px-4 py-8 bg-white">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-4xl font-bold mb-2 text-gray-900">
          {sale === 'true' ? 'Sale Items - Save Big!' : categoryObj?.name || 'All Products'}
        </h1>
        {categoryObj?.description && (
          <p className="text-gray-900">{categoryObj.description}</p>
        )}
        {search && (
          <p className="text-gray-900 mt-2">
            Search results for: <strong>&quot;{search}&quot;</strong>
          </p>
        )}
      </div>

      <div className="flex flex-col lg:flex-row gap-8">
        {/* Filters Sidebar */}
        <aside className="lg:w-64 flex-shrink-0">
          <ProductFilters categories={allCategories} />
        </aside>

        {/* Products Grid */}
        <div className="flex-1">
          {/* Results count and sort */}
          <div className="flex justify-between items-center mb-6">
            <p className="text-gray-900">
              Showing {sortedProducts.length} {sortedProducts.length === 1 ? 'product' : 'products'}
            </p>
            <ProductSort />
          </div>

          <Suspense fallback={<div className="text-gray-900">Loading products...</div>}>
            <ProductGrid products={sortedProducts} />
          </Suspense>
        </div>
      </div>
    </div>
  );
}
