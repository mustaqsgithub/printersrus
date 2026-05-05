"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { Package, MapPin } from "lucide-react";

interface Address {
  address1: string;
  address2?: string;
  city: string;
  county?: string;
  postcode: string;
  country: string;
}

interface OrderItem {
  product_name: string;
  product_sku: string;
  quantity: number;
  price: number;
  total_price: number;
}

interface Order {
  id: string;
  order_number: string;
  customer_name: string;
  customer_email: string;
  customer_phone: string | null;
  shipping_address: string;
  billing_address: string;
  status: string;
  payment_status: string;
  subtotal: number;
  tax_amount: number;
  shipping_amount: number;
  discount_amount: number;
  total_amount: number;
  created_at: string;
  items: OrderItem[];
}

function parseAddress(raw: string): Address | null {
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function AddressBlock({ label, raw }: { label: string; raw: string }) {
  const addr = parseAddress(raw);
  if (!addr) {
    return (
      <div className="border border-gray-200 rounded-lg p-4">
        <div className="flex items-center gap-2 mb-1">
          <MapPin size={14} className="text-gray-400" />
          <p className="text-sm font-medium text-gray-500">{label}</p>
        </div>
        <p className="text-gray-900">{raw}</p>
      </div>
    );
  }
  return (
    <div className="border border-gray-200 rounded-lg p-4">
      <div className="flex items-center gap-2 mb-1">
        <MapPin size={14} className="text-gray-400" />
        <p className="text-sm font-medium text-gray-500">{label}</p>
      </div>
      <p className="text-gray-900">{addr.address1}</p>
      {addr.address2 && <p className="text-gray-900">{addr.address2}</p>}
      <p className="text-gray-900">
        {addr.city}
        {addr.county ? `, ${addr.county}` : ""}
      </p>
      <p className="text-gray-900">{addr.postcode}</p>
      <p className="text-gray-500 text-sm">{addr.country}</p>
    </div>
  );
}

function statusBadge(status: string) {
  const colors: Record<string, string> = {
    pending: "bg-yellow-100 text-yellow-800",
    processing: "bg-blue-100 text-blue-800",
    shipped: "bg-indigo-100 text-indigo-800",
    delivered: "bg-green-100 text-green-800",
    cancelled: "bg-red-100 text-red-800",
    paid: "bg-green-100 text-green-800",
    failed: "bg-red-100 text-red-800",
    refunded: "bg-gray-100 text-gray-800",
  };
  return (
    <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-semibold ${colors[status] || "bg-gray-100 text-gray-800"}`}>
      {status}
    </span>
  );
}

export default function OrderDetailsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/orders?id=${id}`)
      .then((res) => {
        if (!res.ok) throw new Error("Order not found");
        return res.json();
      })
      .then((data) => setOrder(data.order))
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-500">Loading order...</p>
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="min-h-screen">
        <div className="container mx-auto px-4 py-12 text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Order not found</h1>
          <p className="text-gray-600 mb-6">{error || "This order does not exist."}</p>
          <Link href="/account" className="text-primary-600 hover:text-primary-700 font-semibold">
            Back to Account
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <div className="container mx-auto px-4 py-12">
        <div className="max-w-3xl mx-auto">
          <Link href="/account" className="text-primary-600 hover:text-primary-700">
            Back to Account
          </Link>

          <div className="mt-6 border border-gray-200 rounded-2xl p-8 shadow-sm">
            <div className="flex items-center gap-3 mb-2">
              <Package size={24} className="text-primary-600" />
              <h1 className="text-3xl font-bold text-gray-900">Order {order.order_number}</h1>
            </div>
            <p className="text-sm text-gray-500 mb-6">
              Placed on {new Date(order.created_at).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}
            </p>

            {/* Status badges */}
            <div className="flex gap-3 mb-6">
              <div>
                <span className="text-xs text-gray-500 mr-1">Status:</span>
                {statusBadge(order.status)}
              </div>
              <div>
                <span className="text-xs text-gray-500 mr-1">Payment:</span>
                {statusBadge(order.payment_status)}
              </div>
            </div>

            {/* Addresses */}
            <div className="grid sm:grid-cols-2 gap-4 mb-6">
              <AddressBlock label="Shipping Address" raw={order.shipping_address} />
              <AddressBlock label="Billing Address" raw={order.billing_address} />
            </div>

            {/* Order items */}
            {order.items && order.items.length > 0 && (
              <div className="mb-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-3">Items</h2>
                <div className="border border-gray-200 rounded-lg overflow-hidden">
                  <table className="min-w-full text-sm">
                    <thead className="bg-gray-50 text-gray-700">
                      <tr>
                        <th className="px-4 py-2 text-left">Product</th>
                        <th className="px-4 py-2 text-right">Qty</th>
                        <th className="px-4 py-2 text-right">Price</th>
                        <th className="px-4 py-2 text-right">Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {order.items.map((item, i) => (
                        <tr key={i} className="border-t">
                          <td className="px-4 py-2 text-gray-900">{item.product_name}</td>
                          <td className="px-4 py-2 text-right text-gray-900">{item.quantity}</td>
                          <td className="px-4 py-2 text-right text-gray-900">{"\u00A3"}{item.price.toFixed(2)}</td>
                          <td className="px-4 py-2 text-right text-gray-900">{"\u00A3"}{item.total_price.toFixed(2)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Totals */}
            <div className="border border-gray-200 rounded-lg p-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Subtotal</span>
                <span className="text-gray-900">{"\u00A3"}{order.subtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Shipping</span>
                <span className="text-gray-900">
                  {order.shipping_amount === 0 ? "FREE" : `\u00A3${order.shipping_amount.toFixed(2)}`}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Tax</span>
                <span className="text-gray-900">{"\u00A3"}{order.tax_amount.toFixed(2)}</span>
              </div>
              {order.discount_amount > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Discount</span>
                  <span className="text-green-600">-{"\u00A3"}{order.discount_amount.toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-between text-lg font-bold border-t pt-2">
                <span className="text-gray-900">Total</span>
                <span className="text-gray-900">{"\u00A3"}{order.total_amount.toFixed(2)}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
