import Link from "next/link";
import { Package } from "lucide-react";

interface OrderDetailsPageProps {
  params: { id: string };
}

export default function OrderDetailsPage({ params }: OrderDetailsPageProps) {
  return (
    <div className="bg-white min-h-screen">
      <div className="container mx-auto px-4 py-12">
        <div className="max-w-3xl mx-auto">
          <Link href="/account" className="text-primary-600 hover:text-primary-700">
            Back to Account
          </Link>

          <div className="mt-6 border border-gray-200 rounded-2xl p-8 shadow-sm">
            <div className="flex items-center gap-3 mb-4">
              <Package size={24} className="text-primary-600" />
              <h1 className="text-3xl font-bold text-gray-900">Order {params.id}</h1>
            </div>
            <p className="text-gray-900 mb-6">
              Order details will appear here once orders are connected to the database.
            </p>
            <div className="grid sm:grid-cols-2 gap-6">
              <div className="border border-gray-200 rounded-lg p-4">
                <p className="text-sm text-gray-900">Status</p>
                <p className="text-lg font-semibold text-gray-900">Processing</p>
              </div>
              <div className="border border-gray-200 rounded-lg p-4">
                <p className="text-sm text-gray-900">Total</p>
                <p className="text-lg font-semibold text-gray-900">£0.00</p>
              </div>
              <div className="border border-gray-200 rounded-lg p-4">
                <p className="text-sm text-gray-900">Shipping Address</p>
                <p className="text-gray-900">Pending confirmation</p>
              </div>
              <div className="border border-gray-200 rounded-lg p-4">
                <p className="text-sm text-gray-900">Payment</p>
                <p className="text-gray-900">Awaiting payment capture</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
