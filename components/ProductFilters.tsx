"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";

interface Category {
  id: string;
  name: string;
  slug: string;
}

interface ProductFiltersProps {
  categories: Category[];
}

export function ProductFilters({ categories }: ProductFiltersProps) {
  const searchParams = useSearchParams();
  const currentCategory = searchParams.get('category');
  const currentSale = searchParams.get('sale');
  const hasFilters = Boolean(currentCategory || currentSale);

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold text-gray-900">Filters</h2>
        {hasFilters && (
          <Link href="/products" className="text-sm text-primary-600 hover:text-primary-700">
            Clear all
          </Link>
        )}
      </div>

      {/* Categories */}
      <div className="mb-6">
        <h3 className="font-semibold mb-3 text-gray-900">Categories</h3>
        <ul className="space-y-2">
          <li>
            <Link
              href="/products"
              className={`block rounded-md px-2 py-1 transition ${
                !currentCategory && !currentSale
                  ? 'bg-primary-50 text-primary-700 font-semibold'
                  : 'text-gray-700 hover:text-primary-600'
              }`}
            >
              All Products
            </Link>
          </li>
          {categories.map((category) => (
            <li key={category.id}>
              <Link
                href={`/products?category=${category.slug}`}
                className={`block rounded-md px-2 py-1 transition ${
                  currentCategory === category.slug
                    ? 'bg-primary-50 text-primary-700 font-semibold'
                    : 'text-gray-700 hover:text-primary-600'
                }`}
              >
                {category.name}
              </Link>
            </li>
          ))}
        </ul>
      </div>

      {/* Sale Items */}
      <div className="mb-6">
        <h3 className="font-semibold mb-3 text-gray-900">Special Offers</h3>
        <ul className="space-y-2">
          <li>
            <Link
              href="/products?sale=true"
              className={`block rounded-md px-2 py-1 transition ${
                currentSale === 'true'
                  ? 'bg-red-50 text-red-600 font-semibold'
                  : 'text-gray-700 hover:text-red-600'
              }`}
            >
              Sale Items
            </Link>
          </li>
        </ul>
      </div>

      {/* Price Range - Placeholder for future implementation */}
      <div className="mb-6">
        <h3 className="font-semibold mb-3 text-gray-900">Price Range</h3>
        <div className="space-y-2 text-gray-600 text-sm">
          <p>Price filter coming soon...</p>
        </div>
      </div>

      {/* Brands - Placeholder for future implementation */}
      <div>
        <h3 className="font-semibold mb-3 text-gray-900">Brands</h3>
        <div className="space-y-2 text-gray-600 text-sm">
          <p>Brand filter coming soon...</p>
        </div>
      </div>
    </div>
  );
}
