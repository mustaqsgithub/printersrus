"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { ArrowLeft, Lock } from "lucide-react";
import { useCartStore } from "@/lib/cart-store";

export default function CheckoutPage() {
  const router = useRouter();
  const { items, getTotalPrice, clearCart } = useCartStore();
  const [isProcessing, setIsProcessing] = useState(false);

  const totalPrice = getTotalPrice();
  const shippingCost = totalPrice > 50 ? 0 : 8.99;
  const tax = totalPrice * 0.08;
  const grandTotal = totalPrice + shippingCost + tax;

  const [formData, setFormData] = useState({
    // Customer Info
    email: "",
    firstName: "",
    lastName: "",
    phone: "",

    // Shipping Address
    shippingAddress1: "",
    shippingAddress2: "",
    shippingCity: "",
    shippingCounty: "",
    shippingPostcode: "",
    shippingCountry: "GB",

    // Billing Address
    billingAddress1: "",
    billingAddress2: "",
    billingCity: "",
    billingCounty: "",
    billingPostcode: "",
    billingCountry: "GB",

    // Payment
    cardNumber: "",
    cardExpiry: "",
    cardCvc: "",
    cardName: "",
  });

  const [sameAsShipping, setSameAsShipping] = useState(true);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsProcessing(true);

    try {
      const billing = sameAsShipping
        ? {
            address1: formData.shippingAddress1,
            address2: formData.shippingAddress2,
            city: formData.shippingCity,
            county: formData.shippingCounty,
            postcode: formData.shippingPostcode,
            country: formData.shippingCountry,
          }
        : {
            address1: formData.billingAddress1,
            address2: formData.billingAddress2,
            city: formData.billingCity,
            county: formData.billingCounty,
            postcode: formData.billingPostcode,
            country: formData.billingCountry,
          };

      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customer: {
            email: formData.email,
            firstName: formData.firstName,
            lastName: formData.lastName,
            phone: formData.phone,
          },
          shippingAddress: {
            address1: formData.shippingAddress1,
            address2: formData.shippingAddress2,
            city: formData.shippingCity,
            county: formData.shippingCounty,
            postcode: formData.shippingPostcode,
            country: formData.shippingCountry,
          },
          billingAddress: billing,
          items: items.map((i) => ({
            productId: i.product.id,
            quantity: i.quantity,
            variantId: i.variantId,
          })),
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        alert(data.message || "Checkout failed. Please try again.");
        setIsProcessing(false);
        return;
      }

      const { orderId } = await res.json();
      clearCart();
      setIsProcessing(false);
      router.push(`/checkout/success?orderId=${orderId}`);
    } catch {
      alert("Something went wrong. Please try again.");
      setIsProcessing(false);
    }
  };

  if (items.length === 0) {
    return (
      <div className="container mx-auto px-4 py-16">
        <div className="max-w-2xl mx-auto text-center">
          <h1 className="text-3xl font-bold mb-4">Your cart is empty</h1>
          <p className="text-gray-900 mb-8">
            Please add items to your cart before checking out.
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
    <div className="bg-white min-h-screen py-8">
      <div className="container mx-auto px-4">
        {/* Back button */}
        <div className="mb-6">
          <Link
            href="/cart"
            className="text-primary-600 hover:text-primary-700 flex items-center gap-1"
          >
            <ArrowLeft size={16} />
            Back to Cart
          </Link>
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Checkout Form */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-lg shadow-md p-6 mb-6">
              <div className="flex items-center gap-2 mb-6">
                <Lock size={20} className="text-green-600" />
                <h1 className="text-2xl font-bold text-gray-900">Secure Checkout</h1>
              </div>

              <form onSubmit={handleSubmit}>
                {/* Customer Information */}
                <div className="mb-8">
                  <h2 className="text-xl font-semibold mb-4 text-gray-900">Contact Information</h2>
                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <label htmlFor="firstName" className="block text-sm font-medium mb-1 text-gray-900">
                        First Name *
                      </label>
                      <input
                        type="text"
                        id="firstName"
                        name="firstName"
                        required
                        value={formData.firstName}
                        onChange={handleChange}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 text-gray-900 bg-white"
                      />
                    </div>
                    <div>
                      <label htmlFor="lastName" className="block text-sm font-medium mb-1 text-gray-900">
                        Last Name *
                      </label>
                      <input
                        type="text"
                        id="lastName"
                        name="lastName"
                        required
                        value={formData.lastName}
                        onChange={handleChange}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 text-gray-900 bg-white"
                      />
                    </div>
                    <div>
                      <label htmlFor="email" className="block text-sm font-medium mb-1 text-gray-900">
                        Email Address *
                      </label>
                      <input
                        type="email"
                        id="email"
                        name="email"
                        required
                        value={formData.email}
                        onChange={handleChange}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 text-gray-900 bg-white"
                      />
                    </div>
                    <div>
                      <label htmlFor="phone" className="block text-sm font-medium mb-1 text-gray-900">
                        Phone Number
                      </label>
                      <input
                        type="tel"
                        id="phone"
                        name="phone"
                        value={formData.phone}
                        onChange={handleChange}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 text-gray-900 bg-white"
                      />
                    </div>
                  </div>
                </div>

                {/* Shipping Address */}
                <div className="mb-8">
                  <h2 className="text-xl font-semibold mb-4 text-gray-900">Shipping Address</h2>
                  <div className="space-y-4">
                    <div>
                      <label htmlFor="shippingAddress1" className="block text-sm font-medium mb-1 text-gray-900">
                        Address Line 1 *
                      </label>
                      <input
                        type="text"
                        id="shippingAddress1"
                        name="shippingAddress1"
                        required
                        value={formData.shippingAddress1}
                        onChange={handleChange}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 text-gray-900 bg-white"
                      />
                    </div>
                    <div>
                      <label htmlFor="shippingAddress2" className="block text-sm font-medium mb-1 text-gray-900">
                        Address Line 2
                      </label>
                      <input
                        type="text"
                        id="shippingAddress2"
                        name="shippingAddress2"
                        value={formData.shippingAddress2}
                        onChange={handleChange}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 text-gray-900 bg-white"
                      />
                    </div>
                    <div className="grid md:grid-cols-3 gap-4">
                      <div>
                        <label htmlFor="shippingCity" className="block text-sm font-medium mb-1 text-gray-900">
                          Town / City *
                        </label>
                        <input
                          type="text"
                          id="shippingCity"
                          name="shippingCity"
                          required
                          value={formData.shippingCity}
                          onChange={handleChange}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 text-gray-900 bg-white"
                        />
                      </div>
                      <div>
                        <label htmlFor="shippingCounty" className="block text-sm font-medium mb-1 text-gray-900">
                          County
                        </label>
                        <input
                          type="text"
                          id="shippingCounty"
                          name="shippingCounty"
                          value={formData.shippingCounty}
                          onChange={handleChange}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 text-gray-900 bg-white"
                        />
                      </div>
                      <div>
                        <label htmlFor="shippingPostcode" className="block text-sm font-medium mb-1 text-gray-900">
                          Postcode *
                        </label>
                        <input
                          type="text"
                          id="shippingPostcode"
                          name="shippingPostcode"
                          required
                          value={formData.shippingPostcode}
                          onChange={handleChange}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 text-gray-900 bg-white"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Billing Address */}
                <div className="mb-8">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-xl font-semibold text-gray-900">Billing Address</h2>
                    <label className="flex items-center gap-2 text-sm text-gray-900">
                      <input
                        type="checkbox"
                        checked={sameAsShipping}
                        onChange={(e) => setSameAsShipping(e.target.checked)}
                      />
                      Same as shipping
                    </label>
                  </div>
                  {!sameAsShipping && (
                    <div className="space-y-4">
                      <div>
                        <label htmlFor="billingAddress1" className="block text-sm font-medium mb-1 text-gray-900">
                          Address Line 1 *
                        </label>
                        <input
                          type="text"
                          id="billingAddress1"
                          name="billingAddress1"
                          required
                          value={formData.billingAddress1}
                          onChange={handleChange}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 text-gray-900 bg-white"
                        />
                      </div>
                      <div>
                        <label htmlFor="billingAddress2" className="block text-sm font-medium mb-1 text-gray-900">
                          Address Line 2
                        </label>
                        <input
                          type="text"
                          id="billingAddress2"
                          name="billingAddress2"
                          value={formData.billingAddress2}
                          onChange={handleChange}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 text-gray-900 bg-white"
                        />
                      </div>
                      <div className="grid md:grid-cols-3 gap-4">
                        <div>
                          <label htmlFor="billingCity" className="block text-sm font-medium mb-1 text-gray-900">
                            Town / City *
                          </label>
                          <input
                            type="text"
                            id="billingCity"
                            name="billingCity"
                            required
                            value={formData.billingCity}
                            onChange={handleChange}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 text-gray-900 bg-white"
                          />
                        </div>
                        <div>
                          <label htmlFor="billingCounty" className="block text-sm font-medium mb-1 text-gray-900">
                            County
                          </label>
                          <input
                            type="text"
                            id="billingCounty"
                            name="billingCounty"
                            value={formData.billingCounty}
                            onChange={handleChange}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 text-gray-900 bg-white"
                          />
                        </div>
                        <div>
                          <label htmlFor="billingPostcode" className="block text-sm font-medium mb-1 text-gray-900">
                            Postcode *
                          </label>
                          <input
                            type="text"
                            id="billingPostcode"
                            name="billingPostcode"
                            required
                            value={formData.billingPostcode}
                            onChange={handleChange}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 text-gray-900 bg-white"
                          />
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Payment Information */}
                <div className="mb-8">
                  <h2 className="text-xl font-semibold mb-4 text-gray-900">Payment Information</h2>
                  <p className="text-sm text-gray-900 mb-4">
                    <Lock size={14} className="inline mr-1" />
                    Your payment information is secure and encrypted
                  </p>
                  <div className="space-y-4">
                    <div>
                      <label htmlFor="cardName" className="block text-sm font-medium mb-1 text-gray-900">
                        Name on Card *
                      </label>
                      <input
                        type="text"
                        id="cardName"
                        name="cardName"
                        required
                        value={formData.cardName}
                        onChange={handleChange}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 text-gray-900 bg-white"
                      />
                    </div>
                    <div>
                      <label htmlFor="cardNumber" className="block text-sm font-medium mb-1 text-gray-900">
                        Card Number *
                      </label>
                      <input
                        type="text"
                        id="cardNumber"
                        name="cardNumber"
                        required
                        placeholder="1234 5678 9012 3456"
                        value={formData.cardNumber}
                        onChange={handleChange}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 text-gray-900 bg-white"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label htmlFor="cardExpiry" className="block text-sm font-medium mb-1 text-gray-900">
                          Expiry Date *
                        </label>
                        <input
                          type="text"
                          id="cardExpiry"
                          name="cardExpiry"
                          required
                          placeholder="MM/YY"
                          value={formData.cardExpiry}
                          onChange={handleChange}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 text-gray-900 bg-white"
                        />
                      </div>
                      <div>
                        <label htmlFor="cardCvc" className="block text-sm font-medium mb-1 text-gray-900">
                          CVC *
                        </label>
                        <input
                          type="text"
                          id="cardCvc"
                          name="cardCvc"
                          required
                          placeholder="123"
                          value={formData.cardCvc}
                          onChange={handleChange}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 text-gray-900 bg-white"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Submit Button */}
                <button
                  type="submit"
                  disabled={isProcessing}
                  className="w-full bg-primary-600 text-white py-4 rounded-lg font-semibold hover:bg-primary-700 transition disabled:bg-gray-400 disabled:cursor-not-allowed"
                >
                  {isProcessing ? "Processing..." : `Place Order - £${grandTotal.toFixed(2)}`}
                </button>
              </form>
            </div>
          </div>

          {/* Order Summary */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow-md p-6 sticky top-24">
              <h2 className="text-xl font-bold mb-4 text-gray-900">Order Summary</h2>

              {/* Cart Items */}
              <div className="space-y-4 mb-4 border-b pb-4">
                {items.map((item) => {
                  const product = item.product;
                  const displayPrice = product.salePrice || product.price;

                  return (
                    <div key={`${product.id}-${item.variantId || 'default'}`} className="flex gap-3">
                      <div className="relative w-16 h-16 flex-shrink-0 bg-gray-100 rounded-lg overflow-hidden">
                        <Image
                          src={product.mainImage}
                          alt={product.name}
                          fill
                          className="object-cover"
                        />
                      </div>
                      <div className="flex-1">
                        <p className="font-semibold text-sm line-clamp-2 text-gray-900">{product.name}</p>
                        <p className="text-sm text-gray-900">Qty: {item.quantity}</p>
                        <p className="text-sm font-semibold text-gray-900">
                          £{(displayPrice * item.quantity).toFixed(2)}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Pricing */}
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
                <div className="flex justify-between">
                  <span className="text-gray-900">Tax (estimated)</span>
                  <span className="font-semibold text-gray-900">£{tax.toFixed(2)}</span>
                </div>
              </div>

              <div className="border-t pt-4">
                <div className="flex justify-between text-lg">
                  <span className="font-bold text-gray-900">Total</span>
                  <span className="font-bold text-2xl text-gray-900">£{grandTotal.toFixed(2)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
