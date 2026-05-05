"use client";

import Link from "next/link";
import { ShoppingCart, Search, Menu, User, Bell } from "lucide-react";
import { useState, useEffect, FormEvent } from "react";
import { useRouter } from "next/navigation";
import { useCartStore } from "@/lib/cart-store";
import { useAuthStore } from "@/lib/auth-store";

const STORE_NAME = process.env.NEXT_PUBLIC_STORE_NAME;

export function Header() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [unreadCount, setUnreadCount] = useState(0);
  const router = useRouter();
  const { getTotalItems } = useCartStore();
  const { user, loadUser } = useAuthStore();
  const totalItems = getTotalItems();

  // Prevent hydration mismatch by only showing cart count after mount
  useEffect(() => {
    setMounted(true);
    loadUser();
  }, [loadUser]);

  // Fetch unread notification count for logged-in users
  useEffect(() => {
    if (!user) {
      setUnreadCount(0);
      return;
    }
    const fetchCount = () => {
      fetch("/api/notifications")
        .then((res) => (res.ok ? res.json() : null))
        .then((data) => { if (data) setUnreadCount(data.unreadCount ?? 0); })
        .catch(() => {});
    };
    fetchCount();
    const interval = setInterval(fetchCount, 30000);
    return () => clearInterval(interval);
  }, [user]);

  const handleSearch = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      router.push(`/products?search=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  return (
    <header className="bg-white/95 backdrop-blur border-b border-gray-200 sticky top-0 z-50">
      {/* Top Bar */}
      <div className="bg-primary-600 text-white py-2">
        <div className="container mx-auto px-4 text-xs sm:text-sm text-center">
          Free shipping on orders over £50! | Customer Support: 1-800-PRINTERS
        </div>
      </div>

      {/* Main Header */}
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          {/* Logo */}
          <Link href="/" className="flex items-center space-x-2">
            <div className="bg-primary-600 text-white px-4 py-2 rounded-xl font-bold text-lg shadow-sm">
              {STORE_NAME}
            </div>
          </Link>

          {/* Search Bar - Desktop */}
          <div className="hidden md:flex flex-1 max-w-2xl mx-8">
            <form onSubmit={handleSearch} className="relative w-full">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search for printers, ink, toner..."
                className="w-full px-4 py-2.5 border border-gray-300 rounded-xl bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
              <button
                type="submit"
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-primary-600"
              >
                <Search size={20} />
              </button>
            </form>
          </div>

          {/* Actions */}
          <div className="flex items-center space-x-4">
            {user?.role === "admin" && (
              <Link
                href="/admin"
                className="hidden md:block text-sm text-gray-900 hover:text-primary-600 font-semibold"
              >
                Admin
              </Link>
            )}
            {mounted && user && (
              <Link
                href="/account?tab=notifications"
                className="hidden md:flex items-center text-gray-900 hover:text-primary-600 relative"
              >
                <Bell size={20} />
                {unreadCount > 0 && (
                  <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                    {unreadCount > 9 ? "9+" : unreadCount}
                  </span>
                )}
              </Link>
            )}
            <Link
              href={user ? "/account" : "/login"}
              className="hidden md:flex items-center space-x-1 text-gray-900 hover:text-primary-600"
            >
              <User size={20} />
              <span className="text-sm">{user ? "Account" : "Sign In"}</span>
            </Link>
            <Link href="/cart" className="flex items-center space-x-1 text-gray-900 hover:text-primary-600 relative">
              <ShoppingCart size={24} />
              {mounted && totalItems > 0 && (
                <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                  {totalItems}
                </span>
              )}
            </Link>
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="md:hidden text-gray-900"
            >
              <Menu size={24} />
            </button>
          </div>
        </div>

        {/* Search Bar - Mobile */}
        <div className="md:hidden mt-4">
          <form onSubmit={handleSearch} className="relative">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search..."
              className="w-full px-4 py-2.5 border border-gray-300 rounded-xl bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
            <button
              type="submit"
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500"
            >
              <Search size={20} />
            </button>
          </form>
        </div>
      </div>

      {/* Navigation */}
      <nav className={`bg-gray-50 border-t ${isMenuOpen ? "block" : "hidden md:block"}`}>
        <div className="container mx-auto px-4">
          <ul className="flex flex-col md:flex-row md:space-x-8 py-3">
            <li>
              <Link href="/products" className="block py-2 md:py-0 text-gray-900 hover:text-primary-600 font-medium">
                All Products
              </Link>
            </li>
            <li>
              <Link href="/products?category=printers" className="block py-2 md:py-0 text-gray-900 hover:text-primary-600 font-medium">
                Printers
              </Link>
            </li>
            <li>
              <Link href="/products?category=ink-toner" className="block py-2 md:py-0 text-gray-900 hover:text-primary-600 font-medium">
                Ink & Toner
              </Link>
            </li>
            <li>
              <Link href="/products?category=accessories" className="block py-2 md:py-0 text-gray-900 hover:text-primary-600 font-medium">
                Accessories
              </Link>
            </li>
            <li>
              <Link href="/products?sale=true" className="block py-2 md:py-0 text-red-600 hover:text-red-700 font-bold">
                SALE
              </Link>
            </li>
          </ul>
        </div>
      </nav>
    </header>
  );
}
