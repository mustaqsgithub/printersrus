import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { LogoMark } from "@/components/Logo";

export function PromoBanner() {
  return (
    <div className="relative isolate overflow-hidden rounded-2xl bg-gray-900 ring-1 ring-transparent shadow-soft">
      {/* Subtle brand-tinted glow in the top-right */}
      <div
        aria-hidden
        className="pointer-events-none absolute -top-32 -right-24 h-80 w-80 rounded-full bg-primary-500/15 blur-3xl"
      />
      {/* Faint grid line at the bottom for visual interest */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-primary-500/40 to-transparent"
      />
      {/* Watermark logo on the right (hidden on small screens) */}
      <div
        aria-hidden
        className="pointer-events-none hidden md:block absolute right-8 top-1/2 -translate-y-1/2 opacity-15"
      >
        <LogoMark size={220} variant="dark" />
      </div>

      <div className="relative px-6 sm:px-10 py-16 md:py-20">
        <div className="max-w-2xl">
          <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-medium text-white/90 ring-1 ring-white/15 mb-5">
            <span className="w-1.5 h-1.5 rounded-full bg-primary-400" />
            New arrivals weekly
          </span>

          <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold text-white leading-[1.05] tracking-tight mb-5">
            Premium printers
            <br />
            <span className="text-primary-300">& smarter supplies.</span>
          </h1>

          <p className="text-base sm:text-lg text-gray-300 mb-8 max-w-xl text-balance">
            Top brands, fair prices, and free UK shipping on orders over £50.
          </p>

          <div className="flex flex-col sm:flex-row gap-3">
            <Link
              href="/products"
              className="group inline-flex items-center justify-center gap-2 bg-primary-600 text-white px-7 py-3 rounded-lg font-semibold hover:bg-primary-700 transition shadow-sm"
            >
              Shop Now
              <ArrowRight size={18} className="group-hover:translate-x-0.5 transition-transform" />
            </Link>
            <Link
              href="/products?sale=true"
              className="inline-flex items-center justify-center gap-2 bg-transparent text-white px-7 py-3 rounded-lg font-semibold ring-1 ring-white/25 hover:bg-white/10 transition"
            >
              View Sale Items
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
