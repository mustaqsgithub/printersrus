import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { FeaturedProducts } from "@/components/FeaturedProducts";
import { CategoryGrid } from "@/components/CategoryGrid";
import { PromoBanner } from "@/components/PromoBanner";
import { PerksStrip } from "@/components/PerksStrip";

export default function HomePage() {
  return (
    <div className="container mx-auto px-4 py-8">
      {/* Hero Section */}
      <section className="mb-10">
        <PromoBanner />
      </section>

      {/* Feature strip */}
      <section className="mb-14">
        <PerksStrip />
      </section>

      {/* Category Grid */}
      <section className="mb-14">
        <div className="flex items-end justify-between mb-6">
          <div>
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-gray-900">
              Shop by Category
            </h2>
            <p className="text-sm text-gray-500 mt-1">Find what you need, fast.</p>
          </div>
          <Link
            href="/products"
            className="hidden sm:inline-flex items-center gap-1 text-sm font-medium text-gray-700 hover:text-gray-900"
          >
            Browse all <ArrowRight size={14} />
          </Link>
        </div>
        <CategoryGrid />
      </section>

      {/* Featured Products */}
      <section className="mb-14">
        <div className="flex items-end justify-between mb-6">
          <div>
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-gray-900">
              Featured Products
            </h2>
            <p className="text-sm text-gray-500 mt-1">Hand-picked favourites this week.</p>
          </div>
          <Link
            href="/products"
            className="inline-flex items-center gap-1 text-sm font-medium text-gray-700 hover:text-gray-900"
          >
            View all <ArrowRight size={14} />
          </Link>
        </div>
        <FeaturedProducts />
      </section>

      {/* Sale Section */}
      <section className="rounded-2xl bg-white border border-gray-200 px-6 sm:px-10 py-12 text-center">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-red-50 text-red-700 px-2.5 py-1 text-xs font-semibold tracking-wide mb-4">
          <span className="w-1.5 h-1.5 rounded-full bg-red-600 pulse-ring" />
          LIMITED TIME
        </span>
        <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-3 tracking-tight">
          Save up to <span className="text-red-600">50%</span>
        </h2>
        <p className="text-gray-600 mb-6 max-w-xl mx-auto">
          Hot deals on printers, ink, and accessories — while stocks last.
        </p>
        <Link
          href="/products?sale=true"
          className="inline-flex items-center gap-2 bg-red-600 text-white px-7 py-3 rounded-lg font-semibold hover:bg-red-700 transition"
        >
          Shop Sale Items
          <ArrowRight size={18} />
        </Link>
      </section>
    </div>
  );
}
