"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Shield } from "lucide-react";
import { useAuthStore } from "@/lib/auth-store";
import { AdminProducts } from "@/components/AdminProducts";
import { AdminCategories } from "@/components/AdminCategories";
import { AdminOrders } from "@/components/AdminOrders";
import { AdminUsers } from "@/components/AdminUsers";
import { isStaffRole, isSuperAdminRole } from "@/lib/roles";

type TabKey = "products" | "categories" | "orders" | "staff";

export default function AdminPage() {
  const { user, isLoading, loadUser, signOut } = useAuthStore();
  const [canAccess, setCanAccess] = useState(false);
  const [activeTab, setActiveTab] = useState<TabKey>("products");

  const isSuperAdmin = isSuperAdminRole(user?.role);
  const tabs: TabKey[] = isSuperAdmin
    ? ["products", "categories", "orders", "staff"]
    : ["products", "categories", "orders"];

  useEffect(() => {
    loadUser();
  }, [loadUser]);

  useEffect(() => {
    setCanAccess(isStaffRole(user?.role));
  }, [user]);

  if (isLoading && !user) {
    return (
      <div className="min-h-screen">
        <div className="container mx-auto px-4 py-16 text-center">
          <p className="text-gray-700">Loading admin console...</p>
        </div>
      </div>
    );
  }

  if (!canAccess) {
    return (
      <div className="min-h-screen">
        <div className="container mx-auto px-4 py-16 text-center">
          <Shield size={64} className="mx-auto text-gray-300 mb-4" />
          <h1 className="text-3xl font-bold text-gray-900 mb-3">Admin access only</h1>
          <p className="text-gray-900 mb-6">
            You do not have permission to view this page.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link
              href="/admin/login"
              className="inline-block bg-primary-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-primary-700 transition"
            >
              Admin sign in
            </Link>
            <Link
              href="/"
              className="inline-block bg-gray-100 text-gray-900 px-6 py-3 rounded-lg font-semibold hover:bg-gray-200 transition"
            >
              Back to Home
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <div className="container mx-auto px-4 py-12">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-6">
          <div className="flex items-center gap-3">
            <Shield size={28} className="text-primary-600" />
            <h1 className="text-3xl font-bold text-gray-900">Admin Console</h1>
          </div>
          <div className="flex items-center gap-2">
            <Link
              href="/"
              className="px-4 py-2 rounded-md bg-white text-gray-700 border border-gray-200 font-semibold hover:border-gray-300"
            >
              View store
            </Link>
            <button
              onClick={() => signOut()}
              className="px-4 py-2 rounded-md bg-gray-900 text-white font-semibold hover:bg-gray-800"
            >
              Sign out
            </button>
          </div>
        </div>

        <div className="flex flex-wrap gap-2 mb-6">
          {tabs.map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 rounded-md font-semibold ${
                activeTab === tab
                  ? "bg-primary-600 text-white"
                  : "bg-white text-gray-700 border border-gray-200 hover:border-gray-300"
              }`}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </div>

        <div className="bg-white border border-gray-200 rounded-lg p-6">
          {activeTab === "products" && <AdminProducts />}
          {activeTab === "categories" && <AdminCategories />}
          {activeTab === "orders" && <AdminOrders />}
          {activeTab === "staff" && isSuperAdmin && <AdminUsers />}
        </div>
      </div>
    </div>
  );
}
