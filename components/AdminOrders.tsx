"use client";

import { useEffect, useState } from "react";
import { useToast } from "@/components/ToastProvider";

type Order = {
  id: string;
  orderNumber: string;
  customerName: string;
  customerEmail: string;
  shippingAddress: string;
  billingAddress: string;
  status: string;
  paymentStatus: string;
  totalAmount: number;
  createdAt: string;
};

export function AdminOrders() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const { toast } = useToast();

  const formatAddress = (raw: string) => {
    try {
      const a = JSON.parse(raw);
      const parts = [a.address1, a.address2, a.city, a.county, a.postcode, a.country].filter(Boolean);
      return parts.join(", ");
    } catch {
      return raw;
    }
  };

  const loadOrders = async () => {
    setIsLoading(true);
    const response = await fetch("/api/admin/orders");
    const data = await response.json();
    setOrders(data.orders || []);
    setIsLoading(false);
  };

  useEffect(() => {
    loadOrders();
  }, []);

  const updateOrder = async (id: string, updates: Partial<Order>) => {
    setUpdatingId(id);
    setError(null);
    const response = await fetch("/api/admin/orders", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, updates }),
    });

    if (!response.ok) {
      const data = await response.json();
      setError(data?.message || "Failed to update order.");
      toast({ title: "Update failed", message: data?.message || "Failed to update order.", variant: "error" });
      setUpdatingId(null);
      return;
    }

    toast({ title: "Order updated", variant: "success" });
    await loadOrders();
    setUpdatingId(null);
  };

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold text-gray-900">Orders</h2>

      {error && <p className="text-sm text-red-600">{error}</p>}

      {isLoading ? (
        <p className="text-gray-600">Loading orders...</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm text-left border border-gray-200">
            <thead className="bg-gray-50 text-gray-700">
              <tr>
                <th className="px-3 py-2 border-b">Order #</th>
                <th className="px-3 py-2 border-b">Customer</th>
                <th className="px-3 py-2 border-b">Total</th>
                <th className="px-3 py-2 border-b">Status</th>
                <th className="px-3 py-2 border-b">Payment</th>
                <th className="px-3 py-2 border-b">Actions</th>
              </tr>
            </thead>
            <tbody>
              {orders.flatMap((order) => [
                <tr key={order.id} className="border-b">
                  <td className="px-3 py-2">{order.orderNumber}</td>
                  <td className="px-3 py-2">
                    <div className="font-medium text-gray-900">{order.customerName}</div>
                    <div className="text-gray-600">{order.customerEmail}</div>
                  </td>
                  <td className="px-3 py-2">£{order.totalAmount}</td>
                  <td className="px-3 py-2">
                    <select
                      value={order.status}
                      onChange={(event) =>
                        setOrders((prev) =>
                          prev.map((item) =>
                            item.id === order.id ? { ...item, status: event.target.value } : item
                          )
                        )
                      }
                      className="rounded-md border border-gray-300 px-2 py-1 text-gray-900"
                    >
                      {["pending", "processing", "shipped", "delivered", "cancelled"].map(
                        (status) => (
                          <option key={status} value={status}>
                            {status}
                          </option>
                        )
                      )}
                    </select>
                  </td>
                  <td className="px-3 py-2">
                    <select
                      value={order.paymentStatus}
                      onChange={(event) =>
                        setOrders((prev) =>
                          prev.map((item) =>
                            item.id === order.id
                              ? { ...item, paymentStatus: event.target.value }
                              : item
                          )
                        )
                      }
                      className="rounded-md border border-gray-300 px-2 py-1 text-gray-900"
                    >
                      {["pending", "paid", "failed", "refunded"].map((status) => (
                        <option key={status} value={status}>
                          {status}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="px-3 py-2 space-x-2">
                    <button
                      onClick={() =>
                        updateOrder(order.id, {
                          status: order.status,
                          paymentStatus: order.paymentStatus,
                        })
                      }
                      disabled={updatingId === order.id}
                      className="text-primary-600 hover:text-primary-700 font-semibold disabled:opacity-60"
                    >
                      {updatingId === order.id ? "Saving..." : "Save"}
                    </button>
                    <button
                      onClick={() =>
                        setExpandedId(expandedId === order.id ? null : order.id)
                      }
                      className="text-gray-600 hover:text-gray-800 font-semibold"
                    >
                      {expandedId === order.id ? "Hide" : "View"}
                    </button>
                  </td>
                </tr>,
                expandedId === order.id ? (
                  <tr key={`${order.id}-detail`} className="border-b bg-gray-50">
                    <td colSpan={6} className="px-3 py-3">
                      <div className="grid sm:grid-cols-2 gap-4 text-sm">
                        <div>
                          <p className="font-semibold text-gray-700 mb-1">Shipping Address</p>
                          <p className="text-gray-900">{formatAddress(order.shippingAddress)}</p>
                        </div>
                        <div>
                          <p className="font-semibold text-gray-700 mb-1">Billing Address</p>
                          <p className="text-gray-900">{formatAddress(order.billingAddress)}</p>
                        </div>
                      </div>
                    </td>
                  </tr>
                ) : null,
              ])}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
