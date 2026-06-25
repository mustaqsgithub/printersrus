"use client";

import Link from "next/link";
import { ShoppingCart, Search, Menu, User, Bell } from "lucide-react";
import { useState, useEffect, FormEvent } from "react";
import { useRouter } from "next/navigation";
import { useCartStore } from "@/lib/cart-store";
import { useAuthStore } from "@/lib/auth-store";
import { isStaffRole } from "@/lib/roles";
import { Logo } from "@/components/Logo";

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

  const openPalette = () => {
    const isMac =
      typeof navigator !== "undefined" && /Mac|iPhone|iPad|iPod/i.test(navigator.platform);
    window.dispatchEvent(
      new KeyboardEvent("keydown", {
        key: "k",
        code: "KeyK",
        metaKey: isMac,
        ctrlKey: !isMac,
        bubbles: true,
      }),
    );
  };

  return (
    <header className="bg-white/95 backdrop-blur border-b border-gray-200 sticky top-0 z-50 transition-colors">
      {/* Top Bar */}
      <div className="bg-gray-900 text-white py-2 border-b border-gray-800/0">
        <div className="container mx-auto px-4 text-xs sm:text-sm text-center text-gray-300">
          <span className="inline-flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-primary-400" />
            <span>Free shipping on orders over £250</span>
            <span className="text-gray-500">·</span>
            <span>Customer Support: 1-800-PRINTER</span>
          </span>
        </div>
      </div>

      {/* Main Header */}
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between gap-4">
          {/* Logo */}
          <Logo size={32} className="text-lg" />

          {/* Search / Command Palette Trigger - Desktop */}
          <div className="hidden md:flex flex-1 max-w-2xl mx-4">
            <button
              type="button"
              onClick={openPalette}
              aria-label="Open search"
              className="group w-full flex items-center gap-3 pl-4 pr-2 py-2.5 border border-gray-200 rounded-lg bg-gray-50 hover:bg-white hover:border-primary-400 hover:ring-2 hover:ring-primary-100 transition text-left"
            >
              <Search size={18} className="text-gray-400 group-hover:text-primary-600 transition" />
              <span className="flex-1 text-sm text-gray-500 truncate">
                Search printers, ink, toner…
              </span>
              <kbd className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-white border border-gray-200 text-[10px] font-medium text-gray-500 group-hover:border-primary-200 group-hover:text-primary-700 transition">
                <span className="text-[11px] leading-none">⌘</span>K
              </kbd>
            </button>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-1 sm:gap-2">
            {isStaffRole(user?.role) && (
              <Link
                href="/admin"
                className="hidden md:inline-flex px-3 py-1.5 rounded-md text-sm font-semibold text-primary-700 bg-primary-50 hover:bg-primary-100 transition"
              >
                Admin
              </Link>
            )}
            {mounted && user && (
              <Link
                href="/account?tab=notifications"
                aria-label="Notifications"
                className="hidden md:inline-flex items-center justify-center w-10 h-10 rounded-md text-gray-700 hover:text-primary-700 hover:bg-primary-50 transition relative"
              >
                <Bell size={20} />
                {unreadCount > 0 && (
                  <span className="absolute top-1.5 right-1.5 bg-red-600 text-white text-[10px] font-bold rounded-full min-w-[18px] h-[18px] px-1 flex items-center justify-center ring-2 ring-white">
                    {unreadCount > 9 ? "9+" : unreadCount}
                  </span>
                )}
              </Link>
            )}
            <Link
              href={user ? "/account" : "/login"}
              className="hidden md:inline-flex items-center gap-1.5 px-3 py-2 rounded-md text-sm font-medium text-gray-700 hover:text-primary-700 hover:bg-primary-50 transition"
            >
              <User size={18} />
              <span>{user ? "Account" : "Sign In"}</span>
            </Link>
            <Link
              href="/cart"
              aria-label="Cart"
              className="inline-flex items-center justify-center w-10 h-10 rounded-md text-gray-700 hover:text-primary-700 hover:bg-primary-50 transition relative"
            >
              <ShoppingCart size={22} />
              {mounted && totalItems > 0 && (
                <span className="absolute top-1 right-1 bg-primary-600 text-white text-[10px] font-bold rounded-full min-w-[18px] h-[18px] px-1 flex items-center justify-center ring-2 ring-white">
                  {totalItems}
                </span>
              )}
            </Link>
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              aria-label="Toggle menu"
              className="md:hidden inline-flex items-center justify-center w-10 h-10 rounded-md text-gray-700 hover:text-primary-700 hover:bg-primary-50 transition"
            >
              <Menu size={22} />
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
              className="w-full px-4 py-2.5 border border-gray-200 rounded-lg bg-gray-50 text-gray-900 placeholder:text-gray-400 focus:bg-white focus:outline-none focus:border-primary-400 focus:ring-2 focus:ring-primary-100 transition"
            />
            <button
              type="submit"
              aria-label="Submit search"
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-primary-600 transition"
            >
              <Search size={20} />
            </button>
          </form>
        </div>
      </div>

      {/* Navigation */}
      <nav className={`bg-white border-t border-gray-200 ${isMenuOpen ? "block" : "hidden md:block"}`}>
        <div className="container mx-auto px-4">
          <ul className="flex flex-col md:flex-row md:items-center md:gap-1 py-2">
            {[
              { href: "/products", label: "All Products" },
              { href: "/products?category=printers", label: "Printers" },
              { href: "/products?category=ink-toner", label: "Ink & Toner" },
              { href: "/products?category=accessories", label: "Accessories" },
            ].map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className="block px-3 py-2 rounded-md text-sm font-medium text-gray-700 hover:text-primary-700 hover:bg-primary-50 transition"
                >
                  {item.label}
                </Link>
              </li>
            ))}
            <li className="md:ml-auto">
              <Link
                href="/products?sale=true"
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-md text-sm font-semibold text-red-600 hover:text-red-700 hover:bg-red-50 transition"
              >
                <span className="w-1.5 h-1.5 rounded-full bg-red-600 pulse-ring" />
                Sale
              </Link>
            </li>
          </ul>
        </div>
      </nav>
    </header>
  );
}
