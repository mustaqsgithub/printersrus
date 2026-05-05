"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, useEffect, useMemo, useState } from "react";

interface Category {
  id: string;
  name: string;
  slug: string;
}

interface ProductFiltersProps {
  categories: Category[];
  brands: string[];
  priceRange: { min: number; max: number };
  selectedBrands: string[];
  minPrice?: number;
  maxPrice?: number;
}

export function ProductFilters({
  categories,
  brands,
  priceRange,
  selectedBrands,
  minPrice,
  maxPrice,
}: ProductFiltersProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const currentCategory = searchParams.get("category");
  const currentSale = searchParams.get("sale");

  const hasFilters = Boolean(
    currentCategory ||
      currentSale ||
      selectedBrands.length > 0 ||
      typeof minPrice === "number" ||
      typeof maxPrice === "number",
  );

  // Local controlled state for the price inputs (so they don't reset until applied).
  const [minInput, setMinInput] = useState<string>(minPrice !== undefined ? String(minPrice) : "");
  const [maxInput, setMaxInput] = useState<string>(maxPrice !== undefined ? String(maxPrice) : "");

  // Keep local input synced if URL changes externally (e.g. clear all).
  useEffect(() => {
    setMinInput(minPrice !== undefined ? String(minPrice) : "");
    setMaxInput(maxPrice !== undefined ? String(maxPrice) : "");
  }, [minPrice, maxPrice]);

  const placeholderMin = useMemo(() => Math.floor(priceRange.min).toString(), [priceRange.min]);
  const placeholderMax = useMemo(() => Math.ceil(priceRange.max).toString(), [priceRange.max]);

  const updateParams = (mutate: (params: URLSearchParams) => void) => {
    const next = new URLSearchParams(searchParams.toString());
    mutate(next);
    const qs = next.toString();
    router.push(qs ? `/products?${qs}` : "/products");
  };

  const toggleBrand = (brand: string) => {
    const set = new Set(selectedBrands);
    if (set.has(brand)) set.delete(brand);
    else set.add(brand);
    updateParams((p) => {
      if (set.size === 0) p.delete("brands");
      else p.set("brands", Array.from(set).join(","));
    });
  };

  const applyPrice = (e?: FormEvent) => {
    if (e) e.preventDefault();
    updateParams((p) => {
      if (minInput.trim() === "") p.delete("minPrice");
      else p.set("minPrice", minInput.trim());
      if (maxInput.trim() === "") p.delete("maxPrice");
      else p.set("maxPrice", maxInput.trim());
    });
  };

  const clearPrice = () => {
    setMinInput("");
    setMaxInput("");
    updateParams((p) => {
      p.delete("minPrice");
      p.delete("maxPrice");
    });
  };

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
      <div className="flex items-center justify-between mb-5">
        <h2 className="text-lg font-bold text-gray-900">Filters</h2>
        {hasFilters && (
          <Link
            href="/products"
            className="text-xs font-semibold text-primary-600 hover:text-primary-700"
          >
            Clear all
          </Link>
        )}
      </div>

      {/* Categories */}
      <FilterSection title="Categories">
        <ul className="space-y-1">
          <li>
            <Link
              href="/products"
              className={navLinkClass(!currentCategory && !currentSale)}
            >
              All Products
            </Link>
          </li>
          {categories.map((category) => (
            <li key={category.id}>
              <Link
                href={`/products?category=${category.slug}`}
                className={navLinkClass(currentCategory === category.slug)}
              >
                {category.name}
              </Link>
            </li>
          ))}
        </ul>
      </FilterSection>

      {/* Sale Items */}
      <FilterSection title="Special Offers">
        <Link
          href="/products?sale=true"
          className={`block rounded-md px-2 py-1.5 text-sm transition ${
            currentSale === "true"
              ? "bg-red-50 text-red-700 font-semibold"
              : "text-gray-800 hover:text-red-600 hover:bg-gray-50"
          }`}
        >
          Sale Items
        </Link>
      </FilterSection>

      {/* Price Range */}
      <FilterSection title="Price Range">
        <form onSubmit={applyPrice} className="space-y-3">
          <div className="flex items-center gap-2">
            <label className="flex-1">
              <span className="sr-only">Minimum price</span>
              <div className="relative">
                <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-gray-400">
                  £
                </span>
                <input
                  type="number"
                  inputMode="decimal"
                  min={0}
                  step="0.01"
                  value={minInput}
                  onChange={(e) => setMinInput(e.target.value)}
                  placeholder={placeholderMin}
                  className="w-full pl-6 pr-2 py-1.5 text-sm border border-gray-300 rounded-md bg-white text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>
            </label>
            <span className="text-xs text-gray-500">to</span>
            <label className="flex-1">
              <span className="sr-only">Maximum price</span>
              <div className="relative">
                <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-gray-400">
                  £
                </span>
                <input
                  type="number"
                  inputMode="decimal"
                  min={0}
                  step="0.01"
                  value={maxInput}
                  onChange={(e) => setMaxInput(e.target.value)}
                  placeholder={placeholderMax}
                  className="w-full pl-6 pr-2 py-1.5 text-sm border border-gray-300 rounded-md bg-white text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>
            </label>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="submit"
              className="flex-1 px-3 py-1.5 text-xs font-semibold rounded-md bg-primary-600 text-white hover:bg-primary-700 transition"
            >
              Apply
            </button>
            {(minPrice !== undefined || maxPrice !== undefined) && (
              <button
                type="button"
                onClick={clearPrice}
                className="px-3 py-1.5 text-xs font-medium rounded-md text-gray-700 hover:bg-gray-100 transition"
              >
                Reset
              </button>
            )}
          </div>
          {priceRange.max > 0 && (
            <p className="text-[11px] text-gray-500">
              Available £{Math.floor(priceRange.min).toFixed(0)} – £{Math.ceil(priceRange.max).toFixed(0)}
            </p>
          )}
        </form>
      </FilterSection>

      {/* Brands */}
      <FilterSection title="Brands" last>
        {brands.length === 0 ? (
          <p className="text-xs text-gray-500">No brands available.</p>
        ) : (
          <ul className="max-h-56 overflow-y-auto space-y-1 pr-1">
            {brands.map((brand) => {
              const checked = selectedBrands.includes(brand);
              return (
                <li key={brand}>
                  <label
                    className={`flex items-center gap-2 px-2 py-1.5 rounded-md cursor-pointer text-sm transition ${
                      checked
                        ? "bg-primary-50 text-primary-800 font-semibold"
                        : "text-gray-800 hover:bg-gray-50"
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggleBrand(brand)}
                      className="h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                    />
                    <span className="truncate">{brand}</span>
                  </label>
                </li>
              );
            })}
          </ul>
        )}
      </FilterSection>
    </div>
  );
}

function FilterSection({
  title,
  children,
  last = false,
}: {
  title: string;
  children: React.ReactNode;
  last?: boolean;
}) {
  return (
    <div className={last ? "" : "mb-6 pb-6 border-b border-gray-200"}>
      <h3 className="text-xs font-bold uppercase tracking-wider mb-3 text-gray-700">
        {title}
      </h3>
      {children}
    </div>
  );
}

function navLinkClass(active: boolean) {
  return [
    "block rounded-md px-2 py-1.5 text-sm transition",
    active
      ? "bg-primary-50 text-primary-800 font-semibold"
      : "text-gray-800 hover:text-primary-700 hover:bg-gray-50",
  ].join(" ");
}
