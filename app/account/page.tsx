"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { 
  User, 
  Package, 
  MapPin, 
  Settings, 
  CreditCard, 
  Bell, 
  Lock, 
  ArrowLeft,
  Edit,
  Check,
  X,
  LogOut,
  ChevronDown,
  ChevronUp,
  Eye,
  EyeOff
} from "lucide-react";
import { useAuthStore } from "@/lib/auth-store";

export default function AccountPage() {
  const searchParams = useSearchParams();
  const tabParam = searchParams.get("tab");
  const [activeTab, setActiveTab] = useState<'overview' | 'orders' | 'addresses' | 'settings' | 'notifications'>('overview');
  const [isEditing, setIsEditing] = useState(false);
  const { user, isLoading, updateProfile, signOut, loadUser } = useAuthStore();
  const [verificationUrl, setVerificationUrl] = useState<string | null>(null);
  const [verificationMessage, setVerificationMessage] = useState<string | null>(null);

  const [orders, setOrders] = useState<any[]>([]);
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [showPayments, setShowPayments] = useState(false);
  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [passwordData, setPasswordData] = useState({ currentPassword: "", newPassword: "", confirmPassword: "" });
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordSuccess, setPasswordSuccess] = useState<string | null>(null);
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);

  const [paymentMethods, setPaymentMethods] = useState<any[]>([]);
  const [paymentMethodsLoading, setPaymentMethodsLoading] = useState(false);
  const [showAddPaymentForm, setShowAddPaymentForm] = useState(false);
  const [paymentFormData, setPaymentFormData] = useState({
    cardNumber: "",
    expiryMonth: "",
    expiryYear: "",
    cardholderName: "",
  });
  const [paymentFormError, setPaymentFormError] = useState<string | null>(null);
  const [paymentFormLoading, setPaymentFormLoading] = useState(false);

  const [notifications, setNotifications] = useState<any[]>([]);
  const [notificationsLoading, setNotificationsLoading] = useState(false);

  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    dateJoined: "",
  });

  useEffect(() => {
    loadUser();
  }, [loadUser]);

  // Handle ?tab= URL parameter
  useEffect(() => {
    const validTabs = ["overview", "orders", "addresses", "settings", "notifications"] as const;
    if (tabParam && validTabs.includes(tabParam as any)) {
      setActiveTab(tabParam as typeof activeTab);
    }
  }, [tabParam]);

  useEffect(() => {
    if (!user) {
      return;
    }
    setFormData({
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      phone: user.phone || "",
      dateJoined: user.dateJoined,
    });

    // Fetch real orders for the logged-in user
    setOrdersLoading(true);
    fetch("/api/orders")
      .then((res) => (res.ok ? res.json() : Promise.reject()))
      .then((data) => setOrders(data.orders || []))
      .catch(() => setOrders([]))
      .finally(() => setOrdersLoading(false));

    // Fetch payment methods count for overview
    fetch("/api/payment-methods")
      .then((res) => (res.ok ? res.json() : Promise.reject()))
      .then((data) => setPaymentMethods(data.paymentMethods || []))
      .catch(() => setPaymentMethods([]));
  }, [user]);

  // Fetch notifications when tab is active
  useEffect(() => {
    if (activeTab !== "notifications" || !user) return;
    setNotificationsLoading(true);
    fetch("/api/notifications")
      .then((res) => (res.ok ? res.json() : Promise.reject()))
      .then((data) => setNotifications(data.notifications || []))
      .catch(() => setNotifications([]))
      .finally(() => setNotificationsLoading(false));
  }, [activeTab, user]);

  // Fetch payment methods when settings tab is active
  useEffect(() => {
    if (activeTab !== "settings" || !user) return;
    setPaymentMethodsLoading(true);
    fetch("/api/payment-methods")
      .then((res) => (res.ok ? res.json() : Promise.reject()))
      .then((data) => setPaymentMethods(data.paymentMethods || []))
      .catch(() => setPaymentMethods([]))
      .finally(() => setPaymentMethodsLoading(false));
  }, [activeTab, user]);


  // Derive unique addresses from real orders
  const addresses = (() => {
    if (!orders.length) return [];
    const seen = new Set<string>();
    const result: Array<{
      id: string;
      type: string;
      address1: string;
      address2?: string;
      city: string;
      county?: string;
      postcode: string;
      country: string;
      isDefault: boolean;
    }> = [];

    for (const order of orders) {
      for (const field of ["shipping_address", "billing_address"] as const) {
        try {
          const raw = order[field];
          if (!raw) continue;
          const addr = typeof raw === "string" ? JSON.parse(raw) : raw;
          const key = `${addr.address1}|${addr.postcode}`.toLowerCase();
          if (seen.has(key)) continue;
          seen.add(key);
          result.push({
            id: `${order.id}-${field}`,
            type: field === "shipping_address" ? "Shipping" : "Billing",
            address1: addr.address1,
            address2: addr.address2 || undefined,
            city: addr.city,
            county: addr.county || addr.state || undefined,
            postcode: addr.postcode,
            country: addr.country === "GB" ? "United Kingdom" : addr.country,
            isDefault: result.length === 0, // first address = default
          });
        } catch {
          // skip unparseable
        }
      }
    }
    return result;
  })();

  const handleSave = async () => {
    setIsEditing(false);
    if (!user) {
      return;
    }
    const data = await updateProfile({
      firstName: formData.firstName,
      lastName: formData.lastName,
      email: formData.email,
      phone: formData.phone,
    });
    if (data?.verificationUrl) {
      setVerificationUrl(data.verificationUrl);
      setVerificationMessage("Please verify your new email address.");
    }
  };

  const handleChangePassword = async () => {
    setPasswordError(null);
    setPasswordSuccess(null);

    if (!passwordData.currentPassword || !passwordData.newPassword || !passwordData.confirmPassword) {
      setPasswordError("All fields are required.");
      return;
    }
    if (passwordData.newPassword.length < 8) {
      setPasswordError("New password must be at least 8 characters.");
      return;
    }
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      setPasswordError("New passwords do not match.");
      return;
    }

    setPasswordLoading(true);
    try {
      const res = await fetch("/api/auth/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          currentPassword: passwordData.currentPassword,
          newPassword: passwordData.newPassword,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setPasswordError(data.message || "Failed to change password.");
        return;
      }
      setPasswordSuccess("Password changed successfully.");
      setPasswordData({ currentPassword: "", newPassword: "", confirmPassword: "" });
      setShowCurrentPassword(false);
      setShowNewPassword(false);
      setTimeout(() => {
        setShowPasswordForm(false);
        setPasswordSuccess(null);
      }, 2000);
    } catch {
      setPasswordError("Something went wrong. Please try again.");
    } finally {
      setPasswordLoading(false);
    }
  };

  const handleResendVerification = async () => {
    setVerificationMessage(null);
    setVerificationUrl(null);
    try {
      const response = await fetch("/api/auth/resend-verification", { method: "POST" });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data?.message || "Unable to send verification email.");
      }
      setVerificationMessage("Verification email sent.");
      if (data?.verificationUrl) {
        setVerificationUrl(data.verificationUrl);
      }
    } catch (err) {
      setVerificationMessage(
        err instanceof Error ? err.message : "Unable to send verification email."
      );
    }
  };

  const handleAddPaymentMethod = async () => {
    setPaymentFormError(null);
    const { cardNumber, expiryMonth, expiryYear, cardholderName } = paymentFormData;

    if (!cardNumber || !expiryMonth || !expiryYear || !cardholderName) {
      setPaymentFormError("All fields are required.");
      return;
    }

    setPaymentFormLoading(true);
    try {
      const res = await fetch("/api/payment-methods", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cardNumber, expiryMonth, expiryYear, cardholderName }),
      });
      const data = await res.json();
      if (!res.ok) {
        setPaymentFormError(data.message || "Failed to add payment method.");
        return;
      }
      setPaymentMethods(data.paymentMethods || []);
      setPaymentFormData({ cardNumber: "", expiryMonth: "", expiryYear: "", cardholderName: "" });
      setShowAddPaymentForm(false);
    } catch {
      setPaymentFormError("Something went wrong. Please try again.");
    } finally {
      setPaymentFormLoading(false);
    }
  };

  const handleDeletePaymentMethod = async (id: string) => {
    try {
      const res = await fetch(`/api/payment-methods?id=${id}`, { method: "DELETE" });
      const data = await res.json();
      if (res.ok) {
        setPaymentMethods(data.paymentMethods || []);
      }
    } catch {
      // ignore
    }
  };

  const tabs = [
    { id: 'overview', label: 'Overview', icon: User },
    { id: 'orders', label: 'Orders', icon: Package },
    { id: 'notifications', label: 'Notifications', icon: Bell },
    { id: 'addresses', label: 'Addresses', icon: MapPin },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  if (isLoading && !user) {
    return (
      <div className="bg-white min-h-screen">
        <div className="container mx-auto px-4 py-16">
          <div className="max-w-2xl mx-auto text-center">
            <p className="text-gray-900">Loading your account...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="bg-white min-h-screen">
        <div className="container mx-auto px-4 py-16">
          <div className="max-w-2xl mx-auto text-center">
            <div className="w-16 h-16 bg-primary-600 rounded-full flex items-center justify-center mx-auto mb-6">
              <User size={32} className="text-white" />
            </div>
            <h1 className="text-3xl font-bold mb-4 text-gray-900">Welcome back</h1>
            <p className="text-gray-900 mb-8">
              Sign in to view your orders, update your profile, and manage saved addresses.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                href="/login"
                className="inline-block bg-primary-600 text-white px-8 py-3 rounded-lg font-semibold hover:bg-primary-700 transition"
              >
                Sign In
              </Link>
              <Link
                href="/signup"
                className="inline-block bg-white border border-gray-300 px-8 py-3 rounded-lg font-semibold hover:bg-gray-50 transition"
              >
                Create Account
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white min-h-screen">
      <div className="container mx-auto px-4 py-8">
        {/* Back Button */}
        <div className="mb-6">
          <Link
            href="/"
            className="text-primary-600 hover:text-primary-700 flex items-center gap-1"
          >
            <ArrowLeft size={16} />
            Back to Home
          </Link>
        </div>

        {/* Page Header */}
        <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-4xl font-bold mb-2 text-gray-900">My Account</h1>
            <p className="text-gray-900">Manage your account information and preferences</p>
          </div>
          <button
            onClick={() => void signOut()}
            className="inline-flex items-center gap-2 border border-gray-300 px-4 py-2 rounded-lg font-semibold text-gray-900 hover:bg-gray-50 transition"
          >
            <LogOut size={18} />
            Sign Out
          </button>
        </div>

        <div className="grid lg:grid-cols-4 gap-8">
          {/* Sidebar Navigation */}
          <aside className="lg:col-span-1">
            <div className="bg-white border border-gray-200 rounded-lg p-4 sticky top-24">
              <nav className="space-y-2">
                {tabs.map((tab) => {
                  const Icon = tab.icon;
                  const isActive = activeTab === tab.id;
                  return (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id as any)}
                      className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition ${
                        isActive
                          ? 'bg-primary-600 text-white'
                          : 'text-gray-900 hover:bg-gray-100'
                      }`}
                    >
                      <Icon size={20} />
                      <span className="font-medium">{tab.label}</span>
                    </button>
                  );
                })}
              </nav>
            </div>
          </aside>

          {/* Main Content */}
          <div className="lg:col-span-3">
            {/* Overview Tab */}
            {activeTab === 'overview' && (
              <div className="space-y-6">
                {/* Account Summary Card */}
                <div className="bg-white border border-gray-200 rounded-lg p-6">
                  <div className="flex items-center justify-between mb-6">
                    <h2 className="text-2xl font-bold text-gray-900">Account Overview</h2>
                    <button
                      onClick={() => setIsEditing(!isEditing)}
                      className="flex items-center gap-2 text-primary-600 hover:text-primary-700"
                    >
                      <Edit size={18} />
                      {isEditing ? 'Cancel' : 'Edit'}
                    </button>
                  </div>

                  <div className="space-y-4">
                    <div className="flex items-center gap-4 pb-4 border-b border-gray-200">
                      <div className="w-16 h-16 bg-primary-600 rounded-full flex items-center justify-center">
                        <User size={32} className="text-white" />
                      </div>
                      <div>
                        <h3 className="text-xl font-bold text-gray-900">
                          {formData.firstName} {formData.lastName}
                        </h3>
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="text-gray-900">{formData.email}</p>
                          <span
                            className={`text-xs font-semibold px-2 py-1 rounded-full ${
                              user.emailVerified
                                ? "bg-green-100 text-green-800"
                                : "bg-yellow-100 text-yellow-800"
                            }`}
                          >
                            {user.emailVerified ? "Verified" : "Unverified"}
                          </span>
                        </div>
                        {!user.emailVerified && (
                          <div className="mt-2">
                            <button
                              onClick={handleResendVerification}
                              className="text-sm text-primary-600 hover:text-primary-700 font-medium"
                            >
                              Resend verification email
                            </button>
                            {verificationMessage && (
                              <p className="text-sm text-gray-900 mt-1">{verificationMessage}</p>
                            )}
                            {verificationUrl && (
                              <Link
                                href={verificationUrl}
                                className="text-sm text-primary-600 hover:text-primary-700 font-medium block mt-1"
                              >
                                Verify now
                              </Link>
                            )}
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="grid md:grid-cols-2 gap-6">
                      <div>
                        <label className="block text-sm font-medium text-gray-900 mb-1">
                          First Name
                        </label>
                        {isEditing ? (
                          <input
                            type="text"
                            value={formData.firstName}
                            onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 text-gray-900 bg-white"
                          />
                        ) : (
                          <p className="text-gray-900">{formData.firstName}</p>
                        )}
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-900 mb-1">
                          Last Name
                        </label>
                        {isEditing ? (
                          <input
                            type="text"
                            value={formData.lastName}
                            onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 text-gray-900 bg-white"
                          />
                        ) : (
                          <p className="text-gray-900">{formData.lastName}</p>
                        )}
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-900 mb-1">
                          Email Address
                        </label>
                        {isEditing ? (
                          <input
                            type="email"
                            value={formData.email}
                            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 text-gray-900 bg-white"
                          />
                        ) : (
                          <p className="text-gray-900">{formData.email}</p>
                        )}
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-900 mb-1">
                          Phone Number
                        </label>
                        {isEditing ? (
                          <input
                            type="tel"
                            value={formData.phone}
                            onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 text-gray-900 bg-white"
                          />
                        ) : (
                          <p className="text-gray-900">{formData.phone}</p>
                        )}
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-900 mb-1">
                          Member Since
                        </label>
                        <p className="text-gray-900">
                          {new Date(formData.dateJoined).toLocaleDateString('en-GB', {
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric',
                          })}
                        </p>
                      </div>
                    </div>

                    {isEditing && (
                      <div className="flex gap-3 pt-4">
                        <button
                          onClick={handleSave}
                          className="flex items-center gap-2 bg-primary-600 text-white px-6 py-2 rounded-lg font-semibold hover:bg-primary-700 transition"
                        >
                          <Check size={18} />
                          Save Changes
                        </button>
                        <button
                          onClick={() => setIsEditing(false)}
                          className="flex items-center gap-2 bg-gray-200 text-gray-900 px-6 py-2 rounded-lg font-semibold hover:bg-gray-300 transition"
                        >
                          <X size={18} />
                          Cancel
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {/* Quick Stats */}
                <div className="grid md:grid-cols-3 gap-6">
                  <button
                    onClick={() => setActiveTab('orders')}
                    className="bg-white border border-gray-200 rounded-lg p-6 text-left hover:shadow-md hover:border-primary-300 transition cursor-pointer"
                  >
                    <div className="flex items-center gap-3 mb-2">
                      <Package size={24} className="text-primary-600" />
                      <h3 className="text-lg font-semibold text-gray-900">Total Orders</h3>
                    </div>
                    <p className="text-3xl font-bold text-gray-900">{orders.length}</p>
                  </button>

                  <button
                    onClick={() => setActiveTab('addresses')}
                    className="bg-white border border-gray-200 rounded-lg p-6 text-left hover:shadow-md hover:border-primary-300 transition cursor-pointer"
                  >
                    <div className="flex items-center gap-3 mb-2">
                      <MapPin size={24} className="text-primary-600" />
                      <h3 className="text-lg font-semibold text-gray-900">Saved Addresses</h3>
                    </div>
                    <p className="text-3xl font-bold text-gray-900">{addresses.length}</p>
                  </button>

                  <button
                    onClick={() => setActiveTab('settings')}
                    className="bg-white border border-gray-200 rounded-lg p-6 text-left hover:shadow-md hover:border-primary-300 transition cursor-pointer"
                  >
                    <div className="flex items-center gap-3 mb-2">
                      <CreditCard size={24} className="text-primary-600" />
                      <h3 className="text-lg font-semibold text-gray-900">Payment Methods</h3>
                    </div>
                    <p className="text-3xl font-bold text-gray-900">{paymentMethods.length}</p>
                  </button>
                </div>
              </div>
            )}

            {/* Orders Tab */}
            {activeTab === 'orders' && (
              <div className="bg-white border border-gray-200 rounded-lg p-6">
                <h2 className="text-2xl font-bold mb-6 text-gray-900">Order History</h2>
                {ordersLoading ? (
                  <div className="text-center py-12">
                    <p className="text-gray-900">Loading orders...</p>
                  </div>
                ) : orders.length === 0 ? (
                  <div className="text-center py-12">
                    <Package size={64} className="mx-auto text-gray-300 mb-4" />
                    <p className="text-gray-900 mb-4">You haven&apos;t placed any orders yet.</p>
                    <Link
                      href="/products"
                      className="inline-block bg-primary-600 text-white px-6 py-2 rounded-lg font-semibold hover:bg-primary-700 transition"
                    >
                      Start Shopping
                    </Link>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {orders.map((order) => (
                      <div
                        key={order.id}
                        className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition"
                      >
                        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2">
                              <h3 className="text-lg font-semibold text-gray-900">
                                Order {order.order_number}
                              </h3>
                              <span
                                className={`px-3 py-1 rounded-full text-sm font-medium ${
                                  order.status === 'delivered'
                                    ? 'bg-green-100 text-green-800'
                                    : order.status === 'shipped'
                                    ? 'bg-blue-100 text-blue-800'
                                    : order.status === 'cancelled'
                                    ? 'bg-red-100 text-red-800'
                                    : 'bg-yellow-100 text-yellow-800'
                                }`}
                              >
                                {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                              </span>
                            </div>
                            <p className="text-sm text-gray-900">
                              Placed on {new Date(order.created_at).toLocaleDateString('en-GB', {
                                year: 'numeric',
                                month: 'long',
                                day: 'numeric',
                              })}
                            </p>
                            <p className="text-sm text-gray-900">{order.item_count} item(s)</p>
                          </div>
                          <div className="flex items-center gap-4">
                            <div className="text-right">
                              <p className="text-2xl font-bold text-gray-900">
                                £{Number(order.total_amount).toFixed(2)}
                              </p>
                            </div>
                            <Link
                              href={`/orders/${order.id}`}
                              className="text-primary-600 hover:text-primary-700 font-medium"
                            >
                              View Details
                            </Link>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Notifications Tab */}
            {activeTab === 'notifications' && (
              <div className="bg-white border border-gray-200 rounded-lg p-6">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-2xl font-bold text-gray-900">Notifications</h2>
                  {notifications.some((n) => !n.read) && (
                    <button
                      onClick={async () => {
                        await fetch("/api/notifications", {
                          method: "PATCH",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({ markAllRead: true }),
                        });
                        setNotifications((prev) => prev.map((n) => ({ ...n, read: 1 })));
                      }}
                      className="text-sm text-primary-600 hover:text-primary-700 font-medium"
                    >
                      Mark all as read
                    </button>
                  )}
                </div>
                {notificationsLoading ? (
                  <div className="text-center py-12">
                    <p className="text-gray-900">Loading notifications...</p>
                  </div>
                ) : notifications.length === 0 ? (
                  <div className="text-center py-12">
                    <Bell size={64} className="mx-auto text-gray-300 mb-4" />
                    <p className="text-gray-900 mb-2">No notifications yet.</p>
                    <p className="text-sm text-gray-500">
                      {user?.emailNotifications
                        ? "You'll receive notifications when your order status changes."
                        : "Enable email notifications in Settings to receive order updates."}
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {notifications.map((n) => (
                      <div
                        key={n.id}
                        className={`border rounded-lg p-4 transition ${
                          n.read ? "border-gray-200 bg-white" : "border-primary-200 bg-primary-50"
                        }`}
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex items-start gap-3 flex-1">
                            <div className={`mt-1 w-2 h-2 rounded-full flex-shrink-0 ${n.read ? "bg-gray-300" : "bg-primary-600"}`} />
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <h3 className="font-semibold text-gray-900">{n.title}</h3>
                                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                                  n.type === "order_placed"
                                    ? "bg-green-100 text-green-800"
                                    : n.type === "order_status"
                                    ? "bg-blue-100 text-blue-800"
                                    : "bg-gray-100 text-gray-800"
                                }`}>
                                  {n.type === "order_placed" ? "Order" : n.type === "order_status" ? "Update" : n.type}
                                </span>
                              </div>
                              <p className="text-sm text-gray-700">{n.message}</p>
                              <p className="text-xs text-gray-400 mt-1">
                                {new Date(n.created_at).toLocaleDateString("en-GB", {
                                  day: "numeric",
                                  month: "short",
                                  year: "numeric",
                                  hour: "2-digit",
                                  minute: "2-digit",
                                })}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 flex-shrink-0">
                            {n.order_id && (
                              <Link
                                href={`/orders/${n.order_id}`}
                                className="text-xs text-primary-600 hover:text-primary-700 font-medium"
                              >
                                View Order
                              </Link>
                            )}
                            {!n.read && (
                              <button
                                onClick={async () => {
                                  await fetch("/api/notifications", {
                                    method: "PATCH",
                                    headers: { "Content-Type": "application/json" },
                                    body: JSON.stringify({ notificationId: n.id }),
                                  });
                                  setNotifications((prev) =>
                                    prev.map((item) => item.id === n.id ? { ...item, read: 1 } : item)
                                  );
                                }}
                                className="text-xs text-gray-500 hover:text-gray-700"
                              >
                                Mark read
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Addresses Tab */}
            {activeTab === 'addresses' && (
              <div className="space-y-6">
                <div className="bg-white border border-gray-200 rounded-lg p-6">
                  <div className="flex items-center justify-between mb-6">
                    <h2 className="text-2xl font-bold text-gray-900">Saved Addresses</h2>
                  </div>

                  {addresses.length === 0 ? (
                    <div className="text-center py-12">
                      <MapPin size={64} className="mx-auto text-gray-300 mb-4" />
                      <p className="text-gray-900 mb-4">No addresses yet. Place an order to save an address.</p>
                      <Link
                        href="/products"
                        className="inline-block bg-primary-600 text-white px-6 py-2 rounded-lg font-semibold hover:bg-primary-700 transition"
                      >
                        Start Shopping
                      </Link>
                    </div>
                  ) : (
                  <div className="grid md:grid-cols-2 gap-6">
                    {addresses.map((address) => (
                      <div
                        key={address.id}
                        className="border border-gray-200 rounded-lg p-6 relative"
                      >
                        {address.isDefault && (
                          <span className="absolute top-4 right-4 bg-primary-600 text-white px-3 py-1 rounded-full text-xs font-semibold">
                            Default
                          </span>
                        )}
                        <div className="flex items-start gap-3 mb-4">
                          <MapPin size={20} className="text-primary-600 mt-1" />
                          <div>
                            <h3 className="font-semibold text-gray-900 mb-1">
                              {address.type} Address
                            </h3>
                            <div className="text-gray-900 space-y-1">
                              <p>{address.address1}</p>
                              {address.address2 && <p>{address.address2}</p>}
                              <p>
                                {address.city}{address.county ? `, ${address.county}` : ""}
                              </p>
                              <p>{address.postcode}</p>
                              <p>{address.country}</p>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                  )}
                </div>
              </div>
            )}

            {/* Settings Tab */}
            {activeTab === 'settings' && (
              <div className="space-y-6">
                {/* Account Settings */}
                <div className="bg-white border border-gray-200 rounded-lg p-6">
                  <h2 className="text-2xl font-bold mb-6 text-gray-900">Account Settings</h2>
                  <div className="space-y-4">
                    <div className="py-3 border-b border-gray-200">
                      <button
                        onClick={() => {
                          setShowPasswordForm(!showPasswordForm);
                          setPasswordError(null);
                          setPasswordSuccess(null);
                        }}
                        className="w-full flex items-center justify-between"
                      >
                        <div className="flex items-center gap-3">
                          <Lock size={20} className="text-primary-600" />
                          <div className="text-left">
                            <h3 className="font-semibold text-gray-900">Password</h3>
                            <p className="text-sm text-gray-900">Change your account password</p>
                          </div>
                        </div>
                        {showPasswordForm ? (
                          <ChevronUp size={20} className="text-primary-600" />
                        ) : (
                          <ChevronDown size={20} className="text-primary-600" />
                        )}
                      </button>

                      {showPasswordForm && (
                        <div className="mt-4 space-y-4 max-w-md">
                          {passwordError && (
                            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                              {passwordError}
                            </div>
                          )}
                          {passwordSuccess && (
                            <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg text-sm">
                              {passwordSuccess}
                            </div>
                          )}

                          <div>
                            <label className="block text-sm font-medium text-gray-900 mb-1">Current Password</label>
                            <div className="relative">
                              <input
                                type={showCurrentPassword ? "text" : "password"}
                                value={passwordData.currentPassword}
                                onChange={(e) => setPasswordData({ ...passwordData, currentPassword: e.target.value })}
                                className="w-full px-4 py-2 pr-10 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 text-gray-900 bg-white"
                                placeholder="Enter current password"
                              />
                              <button
                                type="button"
                                onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                              >
                                {showCurrentPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                              </button>
                            </div>
                          </div>

                          <div>
                            <label className="block text-sm font-medium text-gray-900 mb-1">New Password</label>
                            <div className="relative">
                              <input
                                type={showNewPassword ? "text" : "password"}
                                value={passwordData.newPassword}
                                onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                                className="w-full px-4 py-2 pr-10 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 text-gray-900 bg-white"
                                placeholder="At least 8 characters"
                              />
                              <button
                                type="button"
                                onClick={() => setShowNewPassword(!showNewPassword)}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                              >
                                {showNewPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                              </button>
                            </div>
                          </div>

                          <div>
                            <label className="block text-sm font-medium text-gray-900 mb-1">Confirm New Password</label>
                            <input
                              type="password"
                              value={passwordData.confirmPassword}
                              onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 text-gray-900 bg-white"
                              placeholder="Re-enter new password"
                            />
                          </div>

                          <div className="flex gap-3 pt-2">
                            <button
                              onClick={handleChangePassword}
                              disabled={passwordLoading}
                              className="flex items-center gap-2 bg-primary-600 text-white px-6 py-2 rounded-lg font-semibold hover:bg-primary-700 transition disabled:opacity-50"
                            >
                              {passwordLoading ? "Saving..." : "Update Password"}
                            </button>
                            <button
                              onClick={() => {
                                setShowPasswordForm(false);
                                setPasswordData({ currentPassword: "", newPassword: "", confirmPassword: "" });
                                setPasswordError(null);
                                setPasswordSuccess(null);
                              }}
                              className="flex items-center gap-2 bg-gray-200 text-gray-900 px-6 py-2 rounded-lg font-semibold hover:bg-gray-300 transition"
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="flex items-center justify-between py-3 border-b border-gray-200">
                      <div className="flex items-center gap-3">
                        <Bell size={20} className="text-primary-600" />
                        <div>
                          <h3 className="font-semibold text-gray-900">Email Notifications</h3>
                          <p className="text-sm text-gray-900">Order updates and promotions</p>
                        </div>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          className="sr-only peer"
                          checked={user?.emailNotifications ?? true}
                          onChange={async (e) => {
                            const enabled = e.target.checked;
                            try {
                              const res = await fetch("/api/auth/notifications", {
                                method: "PATCH",
                                headers: { "Content-Type": "application/json" },
                                body: JSON.stringify({ emailNotifications: enabled }),
                              });
                              if (res.ok) {
                                await loadUser();
                              }
                            } catch {
                              // revert on failure by reloading
                              await loadUser();
                            }
                          }}
                        />
                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600"></div>
                      </label>
                    </div>

                    <div className="py-3 border-b border-gray-200">
                      <button
                        onClick={() => setShowPayments(!showPayments)}
                        className="w-full flex items-center justify-between"
                      >
                        <div className="flex items-center gap-3">
                          <CreditCard size={20} className="text-primary-600" />
                          <div className="text-left">
                            <h3 className="font-semibold text-gray-900">Payment Methods</h3>
                            <p className="text-sm text-gray-900">Manage saved payment cards</p>
                          </div>
                        </div>
                        {showPayments ? (
                          <ChevronUp size={20} className="text-primary-600" />
                        ) : (
                          <ChevronDown size={20} className="text-primary-600" />
                        )}
                      </button>

                      {showPayments && (
                        <div className="mt-4 space-y-4">
                          {paymentMethodsLoading ? (
                            <p className="text-gray-500 text-sm">Loading payment methods...</p>
                          ) : paymentMethods.length === 0 && !showAddPaymentForm ? (
                            <p className="text-gray-500 text-sm">No saved payment methods.</p>
                          ) : (
                            paymentMethods.map((pm) => (
                              <div key={pm.id} className="border border-gray-200 rounded-lg p-4 flex items-center gap-4">
                                <div className="w-12 h-8 bg-gradient-to-r from-blue-600 to-blue-800 rounded flex items-center justify-center">
                                  <CreditCard size={16} className="text-white" />
                                </div>
                                <div className="flex-1">
                                  <p className="font-medium text-gray-900">{pm.card_type} ending in {pm.last_four}</p>
                                  <p className="text-sm text-gray-500">Expires {String(pm.expiry_month).padStart(2, "0")}/{pm.expiry_year}</p>
                                </div>
                                {pm.is_default ? (
                                  <span className="bg-primary-100 text-primary-700 px-2 py-0.5 rounded-full text-xs font-semibold">Default</span>
                                ) : null}
                                <button
                                  onClick={() => handleDeletePaymentMethod(pm.id)}
                                  className="text-red-500 hover:text-red-700 text-sm font-medium"
                                >
                                  Remove
                                </button>
                              </div>
                            ))
                          )}

                          {showAddPaymentForm ? (
                            <div className="border border-gray-200 rounded-lg p-4 space-y-4">
                              <h4 className="font-semibold text-gray-900">Add New Card</h4>
                              {paymentFormError && (
                                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                                  {paymentFormError}
                                </div>
                              )}
                              <div>
                                <label className="block text-sm font-medium text-gray-900 mb-1">Cardholder Name</label>
                                <input
                                  type="text"
                                  value={paymentFormData.cardholderName}
                                  onChange={(e) => setPaymentFormData({ ...paymentFormData, cardholderName: e.target.value })}
                                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 text-gray-900 bg-white"
                                  placeholder="Name as it appears on card"
                                />
                              </div>
                              <div>
                                <label className="block text-sm font-medium text-gray-900 mb-1">Card Number</label>
                                <input
                                  type="text"
                                  value={paymentFormData.cardNumber}
                                  onChange={(e) => {
                                    const raw = e.target.value.replace(/\D/g, "").slice(0, 19);
                                    const formatted = raw.replace(/(\d{4})(?=\d)/g, "$1 ");
                                    setPaymentFormData({ ...paymentFormData, cardNumber: formatted });
                                  }}
                                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 text-gray-900 bg-white"
                                  placeholder="1234 5678 9012 3456"
                                  maxLength={23}
                                />
                              </div>
                              <div className="grid grid-cols-2 gap-4">
                                <div>
                                  <label className="block text-sm font-medium text-gray-900 mb-1">Expiry Month</label>
                                  <select
                                    value={paymentFormData.expiryMonth}
                                    onChange={(e) => setPaymentFormData({ ...paymentFormData, expiryMonth: e.target.value })}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 text-gray-900 bg-white"
                                  >
                                    <option value="">Month</option>
                                    {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                                      <option key={m} value={m}>{String(m).padStart(2, "0")}</option>
                                    ))}
                                  </select>
                                </div>
                                <div>
                                  <label className="block text-sm font-medium text-gray-900 mb-1">Expiry Year</label>
                                  <select
                                    value={paymentFormData.expiryYear}
                                    onChange={(e) => setPaymentFormData({ ...paymentFormData, expiryYear: e.target.value })}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 text-gray-900 bg-white"
                                  >
                                    <option value="">Year</option>
                                    {Array.from({ length: 10 }, (_, i) => new Date().getFullYear() % 100 + i).map((y) => (
                                      <option key={y} value={y}>{2000 + y}</option>
                                    ))}
                                  </select>
                                </div>
                              </div>
                              <div className="flex gap-3 pt-2">
                                <button
                                  onClick={handleAddPaymentMethod}
                                  disabled={paymentFormLoading}
                                  className="flex items-center gap-2 bg-primary-600 text-white px-6 py-2 rounded-lg font-semibold hover:bg-primary-700 transition disabled:opacity-50"
                                >
                                  {paymentFormLoading ? "Saving..." : "Add Card"}
                                </button>
                                <button
                                  onClick={() => {
                                    setShowAddPaymentForm(false);
                                    setPaymentFormError(null);
                                    setPaymentFormData({ cardNumber: "", expiryMonth: "", expiryYear: "", cardholderName: "" });
                                  }}
                                  className="flex items-center gap-2 bg-gray-200 text-gray-900 px-6 py-2 rounded-lg font-semibold hover:bg-gray-300 transition"
                                >
                                  Cancel
                                </button>
                              </div>
                            </div>
                          ) : (
                            <button
                              onClick={() => {
                                setShowAddPaymentForm(true);
                                setPaymentFormError(null);
                              }}
                              className="w-full border border-dashed border-gray-300 rounded-lg p-4 text-primary-600 hover:bg-primary-50 hover:border-primary-300 transition font-medium text-sm flex items-center justify-center gap-2"
                            >
                              + Add New Payment Method
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Preferences */}
                <div className="bg-white border border-gray-200 rounded-lg p-6">
                  <h2 className="text-2xl font-bold mb-6 text-gray-900">Preferences</h2>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-900 mb-2">
                        Currency
                      </label>
                      <select className="w-full md:w-64 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 text-gray-900 bg-white">
                        <option value="GBP">British Pound (£)</option>
                        <option value="USD">US Dollar ($)</option>
                        <option value="EUR">Euro (€)</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-900 mb-2">
                        Language
                      </label>
                      <select className="w-full md:w-64 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 text-gray-900 bg-white">
                        <option value="en">English</option>
                        <option value="es">Spanish</option>
                        <option value="fr">French</option>
                      </select>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

