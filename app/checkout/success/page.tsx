import Link from "next/link";
import { CheckCircle } from "lucide-react";

export default function CheckoutSuccessPage() {
  // In a real app, you would fetch order details from the database using the order ID

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
            You will receive an email confirmation shortly with your order details and tracking information.
          </p>
          <p className="text-sm text-gray-900">
            Order Number: <strong>#{Math.random().toString(36).substr(2, 9).toUpperCase()}</strong>
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-4 justify-center">
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
