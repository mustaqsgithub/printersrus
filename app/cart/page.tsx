"use client";

import Link from "next/link";
import Image from "next/image";
import { Trash2, ShoppingBag, ArrowLeft } from "lucide-react";
import { useCartStore } from "@/lib/cart-store";
import { FREE_SHIPPING_THRESHOLD, SHIPPING_FLAT_RATE } from "@/lib/shipping";

export default function CartPage() {
  const { items, updateQuantity, removeItem, getTotalPrice, getTotalItems } = useCartStore();

  const totalItems = getTotalItems();
  const totalPrice = getTotalPrice();
  const shippingCost = totalPrice > FREE_SHIPPING_THRESHOLD ? 0 : SHIPPING_FLAT_RATE;
  const tax = totalPrice * 0.08; // 8% tax
  const grandTotal = totalPrice + shippingCost + tax;

  if (items.length === 0) {
    return (
      <div className="container mx-auto px-4 py-16">
        <div className="max-w-2xl mx-auto text-center">
          <ShoppingBag size={80} className="mx-auto text-gray-300 mb-6" />
          <h1 className="text-3xl font-bold mb-4 text-gray-900">Your cart is empty</h1>
          <p className="text-gray-900 mb-8">
            Looks like you haven&apos;t added anything to your cart yet.
          </p>
          <Link
            href="/products"
            className="inline-block bg-primary-600 text-white px-8 py-3 rounded-lg font-semibold hover:bg-primary-700 transition"
          >
            Start Shopping
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Back button */}
      <div className="mb-6">
        <Link
          href="/products"
          className="text-primary-600 hover:text-primary-700 flex items-center gap-1"
        >
          <ArrowLeft size={16} />
          Continue Shopping
        </Link>
      </div>

      <h1 className="text-3xl font-bold mb-8 text-gray-900">Shopping Cart ({totalItems} {totalItems === 1 ? 'item' : 'items'})</h1>

      <div className="grid lg:grid-cols-3 gap-8">
        {/* Cart Items */}
        <div className="lg:col-span-2">
          <div className="space-y-4">
            {items.map((item) => {
              const product = item.product;
              const displayPrice = product.salePrice || product.price;

              return (
                <div
                  key={`${product.id}-${item.variantId || 'default'}`}
                  className="bg-white border border-gray-200 rounded-lg p-4 flex gap-4"
                >
                  {/* Product Image */}
                  <div className="relative w-24 h-24 flex-shrink-0 bg-gray-100 rounded-lg overflow-hidden">
                    <Image
                      src={product.mainImage}
                      alt={product.name}
                      fill
                      className="object-cover"
                    />
                  </div>

                  {/* Product Details */}
                  <div className="flex-1">
                    <Link
                      href={`/products/${product.slug}`}
                      className="font-semibold text-gray-900 hover:text-primary-600 block mb-1"
                    >
                      {product.name}
                    </Link>
                    <p className="text-sm text-gray-900 mb-2">SKU: {product.sku}</p>

                    <div className="flex items-center justify-between">
                      {/* Quantity Selector */}
                      <div className="flex items-center border border-gray-300 rounded-lg">
                        <button
                          onClick={() => updateQuantity(product.id, item.quantity - 1, item.variantId)}
                          className="px-3 py-1 text-gray-700 hover:bg-gray-100"
                        >
                          -
                        </button>
                        <span className="px-4 py-1 border-x border-gray-300 min-w-[3rem] text-center text-gray-900">
                          {item.quantity}
                        </span>
                        <button
                          onClick={() => updateQuantity(product.id, item.quantity + 1, item.variantId)}
                          className="px-3 py-1 text-gray-700 hover:bg-gray-100"
                        >
                          +
                        </button>
                      </div>

                      {/* Price */}
                      <div className="text-right">
                        <div className="font-bold text-lg text-gray-900">
                          £{(displayPrice * item.quantity).toFixed(2)}
                        </div>
                        <div className="text-sm text-gray-900">
                          £{displayPrice.toFixed(2)} each
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Remove Button */}
                  <button
                    onClick={() => removeItem(product.id, item.variantId)}
                    className="text-red-500 hover:text-red-700 p-2"
                    title="Remove from cart"
                  >
                    <Trash2 size={20} />
                  </button>
                </div>
              );
            })}
          </div>
        </div>

        {/* Order Summary */}
        <div className="lg:col-span-1">
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-6 sticky top-24">
            <h2 className="text-xl font-bold mb-4 text-gray-900">Order Summary</h2>

            <div className="space-y-3 mb-4">
              <div className="flex justify-between">
                <span className="text-gray-900">Subtotal</span>
                <span className="font-semibold text-gray-900">£{totalPrice.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-900">Shipping</span>
                <span className="font-semibold text-gray-900">
                  {shippingCost === 0 ? (
                    <span className="text-green-600">FREE</span>
                  ) : (
                    `£${shippingCost.toFixed(2)}`
                  )}
                </span>
              </div>
              {totalPrice < FREE_SHIPPING_THRESHOLD && totalPrice > 0 && (
                <p className="text-sm text-gray-900">
                  Add £{(FREE_SHIPPING_THRESHOLD - totalPrice).toFixed(2)} more for free shipping!
                </p>
              )}
              <div className="flex justify-between">
                <span className="text-gray-900">Tax (estimated)</span>
                <span className="font-semibold text-gray-900">£{tax.toFixed(2)}</span>
              </div>
            </div>

            <div className="border-t border-gray-200 pt-4 mb-6">
              <div className="flex justify-between text-lg">
                <span className="font-bold text-gray-900">Total</span>
                <span className="font-bold text-2xl text-gray-900">£{grandTotal.toFixed(2)}</span>
              </div>
            </div>

            <Link
              href="/checkout"
              className="block w-full bg-primary-600 text-white text-center py-3 rounded-lg font-semibold hover:bg-primary-700 transition mb-3"
            >
              Proceed to Checkout
            </Link>

            <Link
              href="/products"
              className="block w-full bg-white border border-gray-300 text-gray-900 text-center py-3 rounded-lg font-semibold hover:bg-gray-50 transition"
            >
              Continue Shopping
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
