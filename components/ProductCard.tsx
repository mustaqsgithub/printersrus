"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Star, ShoppingCart, Check } from "lucide-react";
import { Product } from "@/lib/types";
import { useCartStore } from "@/lib/cart-store";

interface ProductCardProps {
  product: Product;
}

export function ProductCard({ product }: ProductCardProps) {
  const [added, setAdded] = useState(false);
  const { addItem } = useCartStore();
  const displayPrice = product.salePrice || product.price;
  const hasDiscount = Boolean(product.onSale && product.salePrice !== null);

  const handleAddToCart = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (!product.inStock) return;

    addItem(product, 1);
    setAdded(true);

    // Reset the "added" state after 2 seconds
    setTimeout(() => {
      setAdded(false);
    }, 2000);
  };

  return (
    <div className="bg-white border border-gray-200 rounded-xl overflow-hidden hover:shadow-xl transition-shadow group">
      <Link href={`/products/${product.slug}`}>
        <div className="relative aspect-square bg-gray-100">
          {hasDiscount && (
            <div className="absolute top-3 right-3 bg-red-500 text-white px-2.5 py-1 rounded-full text-xs font-semibold z-10">
              SALE
            </div>
          )}
          <Image
            src={product.mainImage}
            alt={product.name}
            fill
            className="object-cover group-hover:scale-105 transition-transform duration-300"
          />
        </div>
      </Link>

      <div className="p-4">
        <Link href={`/products/${product.slug}`}>
          <h3 className="font-semibold text-lg mb-2 text-gray-900 hover:text-primary-600 line-clamp-2">
            {product.name}
          </h3>
        </Link>

        {/* Rating */}
        <div className="flex items-center mb-2">
          <div className="flex items-center">
            {[...Array(5)].map((_, i) => (
              <Star
                key={i}
                size={14}
                className={i < Math.floor(product.rating || 0) ? "fill-yellow-400 text-yellow-400" : "text-gray-300"}
              />
            ))}
          </div>
          <span className="text-sm text-gray-500 ml-2">({product.reviewCount || 0})</span>
        </div>

        {/* Price */}
        <div className="mb-4">
          {hasDiscount ? (
            <div className="flex items-center gap-2">
              <span className="text-xl font-bold text-red-600">
                £{displayPrice.toFixed(2)}
              </span>
              <span className="text-sm text-gray-500 line-through">
                £{product.price.toFixed(2)}
              </span>
            </div>
          ) : (
            <span className="text-xl font-bold text-gray-900">
              £{displayPrice.toFixed(2)}
            </span>
          )}
        </div>

        {/* Add to Cart Button */}
        {product.inStock ? (
          <button
            onClick={handleAddToCart}
            className={`w-full py-2.5 rounded-lg font-semibold transition flex items-center justify-center gap-2 ${
              added
                ? "bg-green-600 text-white"
                : "bg-primary-600 text-white hover:bg-primary-700"
            }`}
          >
            {added ? (
              <>
                <Check size={18} />
                Added to Cart!
              </>
            ) : (
              <>
                <ShoppingCart size={18} />
                Add to Cart
              </>
            )}
          </button>
        ) : (
          <button
            disabled
            className="w-full bg-gray-200 text-gray-600 py-2.5 rounded-lg font-semibold cursor-not-allowed"
          >
            Out of Stock
          </button>
        )}
      </div>
    </div>
  );
}
