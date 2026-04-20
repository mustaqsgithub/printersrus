"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
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
  LogOut
} from "lucide-react";
import { useAuthStore } from "@/lib/auth-store";

export default function AccountPage() {
  const [activeTab, setActiveTab] = useState<'overview' | 'orders' | 'addresses' | 'settings'>('overview');
  const [isEditing, setIsEditing] = useState(false);
  const { user, isLoading, updateProfile, signOut, loadUser } = useAuthStore();
  const [verificationUrl, setVerificationUrl] = useState<string | null>(null);
  const [verificationMessage, setVerificationMessage] = useState<string | null>(null);

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
  }, [user]);

  // Mock order history
  const orders = [
    {
      id: 'ORD-001',
      date: '2024-01-20',
      status: 'Delivered',
      total: 388.78,
      items: 2,
    },
    {
      id: 'ORD-002',
      date: '2024-01-10',
      status: 'Processing',
      total: 179.99,
      items: 1,
    },
    {
      id: 'ORD-003',
      date: '2023-12-28',
      status: 'Delivered',
      total: 289.99,
      items: 1,
    },
  ];

  // Mock addresses
  const addresses = [
    {
      id: '1',
      type: 'Home',
      name: 'John Doe',
      address1: '123 Main Street',
      address2: 'Apt 4B',
      city: 'London',
      state: 'Greater London',
      postalCode: 'SW1A 1AA',
      country: 'United Kingdom',
      isDefault: true,
    },
    {
      id: '2',
      type: 'Work',
      name: 'John Doe',
      address1: '456 Business Park',
      address2: 'Suite 200',
      city: 'Manchester',
      state: 'Greater Manchester',
      postalCode: 'M1 1AA',
      country: 'United Kingdom',
      isDefault: false,
    },
  ];

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

  const tabs = [
    { id: 'overview', label: 'Overview', icon: User },
    { id: 'orders', label: 'Orders', icon: Package },
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
                  <div className="bg-white border border-gray-200 rounded-lg p-6">
                    <div className="flex items-center gap-3 mb-2">
                      <Package size={24} className="text-primary-600" />
                      <h3 className="text-lg font-semibold text-gray-900">Total Orders</h3>
                    </div>
                    <p className="text-3xl font-bold text-gray-900">{orders.length}</p>
                  </div>

                  <div className="bg-white border border-gray-200 rounded-lg p-6">
                    <div className="flex items-center gap-3 mb-2">
                      <MapPin size={24} className="text-primary-600" />
                      <h3 className="text-lg font-semibold text-gray-900">Saved Addresses</h3>
                    </div>
                    <p className="text-3xl font-bold text-gray-900">{addresses.length}</p>
                  </div>

                  <div className="bg-white border border-gray-200 rounded-lg p-6">
                    <div className="flex items-center gap-3 mb-2">
                      <CreditCard size={24} className="text-primary-600" />
                      <h3 className="text-lg font-semibold text-gray-900">Payment Methods</h3>
                    </div>
                    <p className="text-3xl font-bold text-gray-900">1</p>
                  </div>
                </div>
              </div>
            )}

            {/* Orders Tab */}
            {activeTab === 'orders' && (
              <div className="bg-white border border-gray-200 rounded-lg p-6">
                <h2 className="text-2xl font-bold mb-6 text-gray-900">Order History</h2>
                {orders.length === 0 ? (
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
                                Order {order.id}
                              </h3>
                              <span
                                className={`px-3 py-1 rounded-full text-sm font-medium ${
                                  order.status === 'Delivered'
                                    ? 'bg-green-100 text-green-800'
                                    : 'bg-yellow-100 text-yellow-800'
                                }`}
                              >
                                {order.status}
                              </span>
                            </div>
                            <p className="text-sm text-gray-900">
                              Placed on {new Date(order.date).toLocaleDateString('en-GB', {
                                year: 'numeric',
                                month: 'long',
                                day: 'numeric',
                              })}
                            </p>
                            <p className="text-sm text-gray-900">{order.items} item(s)</p>
                          </div>
                          <div className="flex items-center gap-4">
                            <div className="text-right">
                              <p className="text-2xl font-bold text-gray-900">
                                £{order.total.toFixed(2)}
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

            {/* Addresses Tab */}
            {activeTab === 'addresses' && (
              <div className="space-y-6">
                <div className="bg-white border border-gray-200 rounded-lg p-6">
                  <div className="flex items-center justify-between mb-6">
                    <h2 className="text-2xl font-bold text-gray-900">Saved Addresses</h2>
                    <button className="bg-primary-600 text-white px-4 py-2 rounded-lg font-semibold hover:bg-primary-700 transition">
                      Add New Address
                    </button>
                  </div>

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
                              <p>{address.name}</p>
                              <p>{address.address1}</p>
                              {address.address2 && <p>{address.address2}</p>}
                              <p>
                                {address.city}, {address.state} {address.postalCode}
                              </p>
                              <p>{address.country}</p>
                            </div>
                          </div>
                        </div>
                        <div className="flex gap-2 mt-4">
                          <button className="flex-1 text-primary-600 hover:text-primary-700 font-medium py-2 border border-primary-600 rounded-lg hover:bg-primary-50 transition">
                            Edit
                          </button>
                          {!address.isDefault && (
                            <button className="flex-1 text-gray-900 hover:text-gray-700 font-medium py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition">
                              Set as Default
                            </button>
                          )}
                          <button className="text-red-600 hover:text-red-700 font-medium py-2 px-4 border border-red-600 rounded-lg hover:bg-red-50 transition">
                            Delete
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
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
                    <div className="flex items-center justify-between py-3 border-b border-gray-200">
                      <div className="flex items-center gap-3">
                        <Lock size={20} className="text-primary-600" />
                        <div>
                          <h3 className="font-semibold text-gray-900">Password</h3>
                          <p className="text-sm text-gray-900">Last changed 3 months ago</p>
                        </div>
                      </div>
                      <button className="text-primary-600 hover:text-primary-700 font-medium">
                        Change Password
                      </button>
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
                        <input type="checkbox" className="sr-only peer" defaultChecked />
                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600"></div>
                      </label>
                    </div>

                    <div className="flex items-center justify-between py-3 border-b border-gray-200">
                      <div className="flex items-center gap-3">
                        <CreditCard size={20} className="text-primary-600" />
                        <div>
                          <h3 className="font-semibold text-gray-900">Payment Methods</h3>
                          <p className="text-sm text-gray-900">Manage saved payment cards</p>
                        </div>
                      </div>
                      <button className="text-primary-600 hover:text-primary-700 font-medium">
                        Manage
                      </button>
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

