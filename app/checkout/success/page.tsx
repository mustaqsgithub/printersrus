"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { CheckCircle, Mail } from "lucide-react";

export default function CheckoutSuccessPage() {
  return (
    <Suspense fallback={
      <div className="container mx-auto px-4 py-16 bg-white">
        <div className="max-w-2xl mx-auto text-center">
          <p className="text-gray-900">Loading order details...</p>
        </div>
      </div>
    }>
      <CheckoutSuccessInner />
    </Suspense>
  );
}

function CheckoutSuccessInner() {
  const searchParams = useSearchParams();
  const orderId = searchParams.get("orderId");
  const orderNumber = searchParams.get("orderNumber");
  const emailPreview = searchParams.get("emailPreview");

  return (
    <div className="container mx-auto px-4 py-16 bg-white">
      <div className="max-w-2xl mx-auto text-center">
        <CheckCircle size={80} className="mx-auto text-green-600 mb-6" />
        <h1 className="text-4xl font-bold mb-4 text-gray-900">Order Confirmed!</h1>
        <p className="text-xl text-gray-900 mb-8">
          Thank you for your purchase. Your order has been successfully placed.
        </p>

        <div className="bg-gray-50 border border-gray-200 rounded-lg p-6 mb-8">
          <p className="text-gray-900 mb-4">
            A confirmation email has been sent with your order details and tracking information.
          </p>
          {orderNumber && (
            <p className="text-sm text-gray-900 mb-4">
              Order Number: <strong>#{orderNumber}</strong>
            </p>
          )}

          {emailPreview && (
            <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex items-center justify-center gap-2 mb-2">
                <Mail size={18} className="text-blue-600" />
                <p className="text-sm font-semibold text-blue-800">Email Preview (Development)</p>
              </div>
              <a
                href={emailPreview}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-blue-600 hover:text-blue-800 underline"
              >
                View confirmation email
              </a>
            </div>
          )}
        </div>

        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          {orderId && (
            <Link
              href={`/orders/${orderId}`}
              className="inline-block bg-primary-600 text-white px-8 py-3 rounded-lg font-semibold hover:bg-primary-700 transition"
            >
              View Order
            </Link>
          )}
          <Link
            href="/products"
            className="inline-block bg-primary-600 text-white px-8 py-3 rounded-lg font-semibold hover:bg-primary-700 transition"
          >
            Continue Shopping
          </Link>
          <Link
            href="/"
            className="inline-block bg-white border border-gray-300 px-8 py-3 rounded-lg font-semibold hover:bg-gray-50 transition"
          >
            Return to Home
          </Link>
        </div>
      </div>
    </div>
  );
}
