"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Star, ShoppingCart, Check, Heart } from "lucide-react";
import { Product } from "@/lib/types";
import { useCartStore } from "@/lib/cart-store";

interface ProductCardProps {
  product: Product;
}

export function ProductCard({ product }: ProductCardProps) {
  const [added, setAdded] = useState(false);
  const [wished, setWished] = useState(false);
  const { addItem } = useCartStore();
  const displayPrice = product.salePrice || product.price;
  const hasDiscount = Boolean(product.onSale && product.salePrice !== null);
  const discountPct = hasDiscount
    ? Math.round(((product.price - displayPrice) / product.price) * 100)
    : 0;

  const handleAddToCart = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!product.inStock) return;
    addItem(product, 1);
    setAdded(true);
    setTimeout(() => setAdded(false), 2000);
  };

  const handleWish = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setWished((w) => !w);
  };

  return (
    <div className="group relative bg-white border border-gray-200 rounded-xl overflow-hidden hover:border-gray-300 hover:shadow-soft transition">
      <Link href={`/products/${product.slug}`}>
        <div className="relative aspect-square bg-gray-50 overflow-hidden">
          {/* Discount badge */}
          {hasDiscount && (
            <div className="absolute top-3 left-3 z-10 inline-flex items-center bg-red-600 text-white px-2 py-0.5 rounded-md text-xs font-semibold">
              {discountPct > 0 ? `-${discountPct}%` : "SALE"}
            </div>
          )}

          {/* Wishlist button */}
          <button
            onClick={handleWish}
            aria-label="Add to wishlist"
            className="absolute top-3 right-3 z-10 w-8 h-8 rounded-full bg-white border border-gray-200 flex items-center justify-center hover:border-gray-300 transition opacity-0 group-hover:opacity-100"
          >
            <Heart
              size={14}
              className={wished ? "fill-red-500 text-red-500" : "text-gray-500"}
            />
          </button>

          <Image
            src={product.mainImage}
            alt={product.name}
            fill
            className="object-cover transition-transform duration-300 group-hover:scale-105"
          />
        </div>
      </Link>

      <div className="p-4">
        {product.brand && (
          <div className="text-[11px] uppercase tracking-wider font-medium text-gray-500 mb-1">
            {product.brand}
          </div>
        )}

        <Link href={`/products/${product.slug}`}>
          <h3 className="font-medium text-base mb-2 text-gray-900 hover:text-gray-600 line-clamp-2 min-h-[3rem]">
            {product.name}
          </h3>
        </Link>

        {/* Rating */}
        <div className="flex items-center mb-3">
          <div className="flex items-center">
            {[...Array(5)].map((_, i) => (
              <Star
                key={i}
                size={14}
                className={
                  i < Math.floor(product.rating || 0)
                    ? "fill-yellow-400 text-yellow-400"
                    : "text-gray-300"
                }
              />
            ))}
          </div>
          <span className="text-xs text-gray-500 ml-2">
            ({product.reviewCount || 0})
          </span>
        </div>

        {/* Price */}
        <div className="mb-4">
          {hasDiscount ? (
            <div className="flex items-baseline gap-2">
              <span className="text-lg font-bold text-red-600">
                £{displayPrice.toFixed(2)}
              </span>
              <span className="text-sm text-gray-400 line-through">
                £{product.price.toFixed(2)}
              </span>
            </div>
          ) : (
            <span className="text-lg font-bold text-gray-900">
              £{displayPrice.toFixed(2)}
            </span>
          )}
        </div>

        {/* Add to Cart Button */}
        {product.inStock ? (
          <button
            onClick={handleAddToCart}
            className={`w-full py-2.5 rounded-lg font-semibold text-sm transition flex items-center justify-center gap-2 ${
              added
                ? "bg-gray-900 text-white"
                : "bg-primary-600 text-white hover:bg-primary-700"
            }`}
          >
            {added ? (
              <>
                <Check size={16} />
                Added
              </>
            ) : (
              <>
                <ShoppingCart size={16} />
                Add to Cart
              </>
            )}
          </button>
        ) : (
          <button
            disabled
            className="w-full bg-gray-100 text-gray-500 py-2.5 rounded-lg font-semibold text-sm cursor-not-allowed"
          >
            Out of Stock
          </button>
        )}
      </div>
    </div>
  );
}
