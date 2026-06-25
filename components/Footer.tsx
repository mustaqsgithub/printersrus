import Link from "next/link";
import { Mail, Facebook, Twitter, Instagram, Youtube, ArrowRight } from "lucide-react";
import { Logo } from "@/components/Logo";

const STORE_NAME = process.env.NEXT_PUBLIC_STORE_NAME || "printersrus";

export function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="mt-12 border-t border-gray-200">
      {/* Newsletter strip */}
      <div className="bg-white border-b border-gray-200">
        <div className="container mx-auto px-4 py-10">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
            <div className="max-w-xl">
              <h3 className="text-xl font-bold tracking-tight text-gray-900">
                Get 10% off your first order
              </h3>
              <p className="text-gray-500 text-sm mt-1">
                Subscribe for exclusive deals, new arrivals, and printing tips.
              </p>
            </div>
            <form className="flex flex-col sm:flex-row gap-2 w-full md:w-auto md:min-w-[420px]">
              <label className="relative flex-1">
                <Mail
                  size={16}
                  className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
                />
                <input
                  type="email"
                  placeholder="you@example.com"
                  className="w-full pl-10 pr-3 py-2.5 rounded-lg bg-white border border-gray-200 text-gray-900 placeholder:text-gray-400 focus:outline-none focus:border-primary-400 focus:ring-2 focus:ring-primary-100 transition"
                />
              </label>
              <button
                type="button"
                className="inline-flex items-center justify-center gap-1.5 bg-primary-600 text-white font-semibold px-5 py-2.5 rounded-lg hover:bg-primary-700 transition"
              >
                Subscribe <ArrowRight size={16} />
              </button>
            </form>
          </div>
        </div>
      </div>

      {/* Main footer */}
      <div className="bg-white">
        <div className="container mx-auto px-4 py-12">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {/* About */}
            <div className="col-span-2 md:col-span-1">
              <div className="mb-4">
                <Logo size={30} className="text-base" />
              </div>
              <p className="text-sm text-gray-600 leading-relaxed">
                Your trusted source for quality printers, ink, toner, and office supplies.
                Competitive prices, expert support, and fast shipping.
              </p>
              <div className="flex items-center gap-2 mt-5">
                {[Facebook, Twitter, Instagram, Youtube].map((Icon, i) => (
                  <a
                    key={i}
                    href="#"
                    aria-label="social"
                    className="w-9 h-9 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-600 hover:text-gray-900 transition"
                  >
                    <Icon size={16} />
                  </a>
                ))}
              </div>
            </div>

            {/* Shop */}
            <div>
              <h3 className="text-gray-900 font-semibold mb-4 text-sm">Shop</h3>
              <ul className="space-y-2.5 text-sm text-gray-600">
                <li><Link href="/products" className="hover:text-primary-700 transition">All Products</Link></li>
                <li><Link href="/products?category=printers" className="hover:text-primary-700 transition">Printers</Link></li>
                <li><Link href="/products?category=ink-toner" className="hover:text-primary-700 transition">Ink & Toner</Link></li>
                <li><Link href="/products?category=accessories" className="hover:text-primary-700 transition">Accessories</Link></li>
                <li>
                  <Link
                    href="/products?sale=true"
                    className="inline-flex items-center gap-1.5 text-red-600 hover:text-red-700 font-medium transition"
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-red-600" />
                    Sale Items
                  </Link>
                </li>
              </ul>
            </div>

            {/* Customer Service */}
            <div>
              <h3 className="text-gray-900 font-semibold mb-4 text-sm">Customer Service</h3>
              <ul className="space-y-2.5 text-sm text-gray-600">
                <li><Link href="/contact" className="hover:text-primary-700 transition">Contact Us</Link></li>
                <li><Link href="/shipping" className="hover:text-primary-700 transition">Shipping Info</Link></li>
                <li><Link href="/returns" className="hover:text-primary-700 transition">Returns & Exchanges</Link></li>
                <li><Link href="/faq" className="hover:text-primary-700 transition">FAQ</Link></li>
                <li><Link href="/track-order" className="hover:text-primary-700 transition">Track Your Order</Link></li>
              </ul>
            </div>

            {/* Company */}
            <div>
              <h3 className="text-gray-900 font-semibold mb-4 text-sm">Company</h3>
              <ul className="space-y-2.5 text-sm text-gray-600">
                <li><Link href="/about" className="hover:text-primary-700 transition">About Us</Link></li>
                <li><Link href="/blog" className="hover:text-primary-700 transition">Blog</Link></li>
                <li><Link href="/privacy" className="hover:text-primary-700 transition">Privacy Policy</Link></li>
                <li><Link href="/terms" className="hover:text-primary-700 transition">Terms & Conditions</Link></li>
              </ul>
            </div>
          </div>

          {/* Bottom Bar */}
          <div className="border-t border-gray-200 mt-10 pt-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-sm text-gray-500">
            <p>&copy; {currentYear} {STORE_NAME}. All rights reserved.</p>
            <p className="text-xs text-gray-500">
              Secure payments · Stripe · Apple Pay
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}
