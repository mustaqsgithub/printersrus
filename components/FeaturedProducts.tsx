import { ProductCard } from "./ProductCard";
import { dbHelpers } from "@/lib/database";

export async function FeaturedProducts() {
  const products = await dbHelpers.getFeaturedProducts(4);

  // Transform database format to component format
  const featuredProducts = products.map((product: any) => ({
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

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
      {featuredProducts.map((product) => (
        <ProductCard key={product.id} product={product} />
      ))}
    </div>
  );
}
