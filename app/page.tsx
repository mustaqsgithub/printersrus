import Link from "next/link";
import { FeaturedProducts } from "@/components/FeaturedProducts";
import { CategoryGrid } from "@/components/CategoryGrid";
import { PromoBanner } from "@/components/PromoBanner";

export default function HomePage() {
  return (
    <div className="container mx-auto px-4 py-8 bg-white">
      {/* Hero Section */}
      <section className="mb-12">
        <PromoBanner />
      </section>

      {/* Category Grid */}
      <section className="mb-12">
        <h2 className="text-3xl font-bold mb-6 text-gray-900">Shop by Category</h2>
        <CategoryGrid />
      </section>

      {/* Featured Products */}
      <section className="mb-12">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-3xl font-bold text-gray-900">Featured Products</h2>
          <Link href="/products" className="text-primary-600 hover:text-primary-700">
            View All →
          </Link>
        </div>
        <FeaturedProducts />
      </section>

      {/* Sale Section */}
      <section className="bg-red-50 rounded-lg p-8 text-center">
        <h2 className="text-4xl font-bold text-red-600 mb-4">SALE ITEMS - Save up to 50%!</h2>
        <p className="text-lg mb-6 text-gray-900">Check out our latest deals on printers, ink, and accessories</p>
        <Link
          href="/products?sale=true"
          className="inline-block bg-red-600 text-white px-8 py-3 rounded-lg font-semibold hover:bg-red-700 transition"
        >
          Shop Sale Items
        </Link>
      </section>
    </div>
  );
}
