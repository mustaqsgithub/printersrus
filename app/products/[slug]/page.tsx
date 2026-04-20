import { notFound } from 'next/navigation';
import { Star, ShoppingCart, Truck, Shield, ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { dbHelpers } from '@/lib/database';
import { AddToCartButton } from '@/components/AddToCartButton';
import { ProductCard } from '@/components/ProductCard';
import { ProductImageGallery } from '@/components/ProductImageGallery';

interface ProductPageProps {
  params: Promise<{
    slug: string;
  }>;
}

export async function generateMetadata({ params }: ProductPageProps) {
  const { slug } = await params;
  const dbProduct: any = dbHelpers.getProductBySlug(slug);

  if (!dbProduct) {
    return {
      title: 'Product Not Found',
    };
  }

  return {
    title: dbProduct.name,
    description: dbProduct.description,
  };
}

export async function generateStaticParams() {
  const allProducts = await dbHelpers.getAllProducts();
  return allProducts.map((product: any) => ({
    slug: product.slug,
  }));
}

export default async function ProductPage({ params }: ProductPageProps) {
  const { slug } = await params;
  const dbProduct: any = await dbHelpers.getProductBySlug(slug);

  if (!dbProduct) {
    notFound();
  }

  // Transform database product to component format
  const product = {
    id: dbProduct.id,
    sku: dbProduct.sku,
    name: dbProduct.name,
    slug: dbProduct.slug,
    description: dbProduct.description,
    longDescription: dbProduct.long_description,
    price: dbProduct.price,
    salePrice: dbProduct.sale_price,
    mainImage: dbProduct.main_image,
    images: dbProduct.images,
    brand: dbProduct.brand,
    categoryId: dbProduct.category_id,
    inStock: Boolean(dbProduct.in_stock),
    stockQuantity: dbProduct.stock_quantity,
    featured: Boolean(dbProduct.featured),
    onSale: Boolean(dbProduct.on_sale),
    isActive: Boolean(dbProduct.is_active),
    createdAt: dbProduct.created_at,
    updatedAt: dbProduct.updated_at,
    rating: 4.5,
    reviewCount: Math.floor(Math.random() * 200) + 10,
  };

  const displayPrice = product.salePrice || product.price;
  const hasDiscount = product.salePrice !== null;
  const discountPercentage = hasDiscount
    ? Math.round(((product.price - product.salePrice!) / product.price) * 100)
    : 0;

  // Parse images from JSON
  const additionalImages = product.images ? JSON.parse(product.images) : [];
  const allImages = [product.mainImage, ...additionalImages];

  // Get related products (same category, excluding current)
  const allProducts = await dbHelpers.getAllProducts();
  const dbRelatedProducts = allProducts
    .filter((p: any) => p.category_id === product.categoryId && p.id !== product.id)
    .slice(0, 4);

  // Transform related products
  const relatedProducts = dbRelatedProducts.map((p: any) => ({
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

  return (
    <div className="container mx-auto px-4 py-8 bg-white">
      {/* Breadcrumb */}
      <div className="mb-6">
        <Link
          href="/products"
          className="text-primary-600 hover:text-primary-700 flex items-center gap-1"
        >
          <ArrowLeft size={16} />
          Back to Products
        </Link>
      </div>

      {/* Product Details */}
      <div className="grid md:grid-cols-2 gap-12 mb-16">
        {/* Images */}
        <ProductImageGallery
          mainImage={product.mainImage}
          additionalImages={additionalImages}
          productName={product.name}
          discountPercentage={hasDiscount ? discountPercentage : undefined}
        />

        {/* Product Info */}
        <div>
          <h1 className="text-3xl font-bold mb-4 text-gray-900">{product.name}</h1>

          {/* Rating */}
          <div className="flex items-center mb-4">
            <div className="flex items-center mr-2">
              {[...Array(5)].map((_, i) => (
                <Star
                  key={i}
                  size={20}
                  className={
                    i < Math.floor(product.rating || 0)
                      ? 'fill-yellow-400 text-yellow-400'
                      : 'text-gray-300'
                  }
                />
              ))}
            </div>
            <span className="text-gray-900">
              {product.rating?.toFixed(1)} ({product.reviewCount} reviews)
            </span>
          </div>

          {/* Price */}
          <div className="mb-6">
            {hasDiscount ? (
              <div>
                <div className="flex items-baseline gap-3">
                  <span className="text-4xl font-bold text-red-600">
                    £{displayPrice.toFixed(2)}
                  </span>
                  <span className="text-2xl text-gray-900 line-through">
                    £{product.price.toFixed(2)}
                  </span>
                  <span className="bg-red-100 text-red-800 px-2 py-1 rounded-md font-semibold">
                    Save £{(product.price - displayPrice).toFixed(2)}
                  </span>
                </div>
              </div>
            ) : (
              <span className="text-4xl font-bold text-gray-900">
                £{displayPrice.toFixed(2)}
              </span>
            )}
          </div>

          {/* Stock Status */}
          <div className="mb-6">
            {product.inStock ? (
              <div className="flex items-center gap-2 text-green-600">
                <div className="w-3 h-3 bg-green-600 rounded-full"></div>
                <span className="font-semibold">In Stock ({product.stockQuantity} available)</span>
              </div>
            ) : (
              <div className="flex items-center gap-2 text-red-600">
                <div className="w-3 h-3 bg-red-600 rounded-full"></div>
                <span className="font-semibold">Out of Stock</span>
              </div>
            )}
          </div>

          {/* SKU and Brand */}
          <div className="mb-6 text-gray-900">
            <p><strong>SKU:</strong> {product.sku}</p>
            {product.brand && <p><strong>Brand:</strong> {product.brand}</p>}
          </div>

          {/* Description */}
          <div className="mb-6">
            <p className="text-gray-900 leading-relaxed">{product.description}</p>
          </div>

          {/* Add to Cart */}
          <div className="mb-8">
            <AddToCartButton product={product} />
          </div>

          {/* Features */}
          <div className="border-t pt-6 space-y-3">
            <div className="flex items-center gap-3 text-gray-900">
              <Truck size={24} className="text-primary-600" />
              <div>
                <p className="font-semibold text-gray-900">Free Shipping</p>
                <p className="text-sm text-gray-900">On orders over £50</p>
              </div>
            </div>
            <div className="flex items-center gap-3 text-gray-900">
              <Shield size={24} className="text-primary-600" />
              <div>
                <p className="font-semibold text-gray-900">Secure Payments</p>
                <p className="text-sm text-gray-900">100% secure transactions</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Long Description */}
      {product.longDescription && (
        <div className="mb-16 max-w-4xl">
          <h2 className="text-2xl font-bold mb-4 text-gray-900">Product Details</h2>
          <div className="prose max-w-none text-gray-900">
            <p>{product.longDescription}</p>
          </div>
        </div>
      )}

      {/* Related Products */}
      {relatedProducts.length > 0 && (
        <div>
          <h2 className="text-2xl font-bold mb-6 text-gray-900">Related Products</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {relatedProducts.map((relatedProduct) => (
              <ProductCard key={relatedProduct.id} product={relatedProduct} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
