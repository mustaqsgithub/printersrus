"use client";

import { useState } from "react";
import { ShoppingCart, Check } from "lucide-react";
import { useCartStore } from "@/lib/cart-store";
import { Product } from "@/lib/types";

interface AddToCartButtonProps {
  product: Product;
  variantId?: string;
  className?: string;
}

export function AddToCartButton({ product, variantId, className }: AddToCartButtonProps) {
  const [quantity, setQuantity] = useState(1);
  const [added, setAdded] = useState(false);
  const { addItem } = useCartStore();

  const handleAddToCart = () => {
    if (!product.inStock) return;

    addItem(product, quantity, variantId);
    setAdded(true);

    // Reset the "added" state after 2 seconds
    setTimeout(() => {
      setAdded(false);
    }, 2000);
  };

  if (!product.inStock) {
    return (
      <button
        disabled
        className={`w-full bg-gray-300 text-gray-900 py-3 rounded-lg font-semibold cursor-not-allowed ${className || ''}`}
      >
        Out of Stock
      </button>
    );
  }

  return (
    <div className={className}>
      {/* Quantity Selector */}
      <div className="flex items-center gap-4 mb-4">
        <label htmlFor="quantity" className="font-semibold text-gray-900">Quantity:</label>
        <div className="flex items-center border border-gray-300 rounded-lg">
          <button
            onClick={() => setQuantity(Math.max(1, quantity - 1))}
            className="px-4 py-2 hover:bg-gray-100"
          >
            -
          </button>
          <input
            id="quantity"
            type="number"
            min="1"
            max={product.stockQuantity}
            value={quantity}
            onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
            className="w-16 text-center border-x border-gray-300 py-2 text-gray-900"
          />
          <button
            onClick={() => setQuantity(Math.min(product.stockQuantity, quantity + 1))}
            className="px-4 py-2 hover:bg-gray-100"
          >
            +
          </button>
        </div>
      </div>

      {/* Add to Cart Button */}
      <button
        onClick={handleAddToCart}
        className={`w-full py-3 rounded-lg font-semibold transition flex items-center justify-center gap-2 ${
          added
            ? 'bg-green-600 text-white'
            : 'bg-primary-600 text-white hover:bg-primary-700'
        }`}
      >
        {added ? (
          <>
            <Check size={20} />
            Added to Cart!
          </>
        ) : (
          <>
            <ShoppingCart size={20} />
            Add to Cart
          </>
        )}
      </button>
    </div>
  );
}
