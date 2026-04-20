import Link from "next/link";

export function PromoBanner() {
  return (
    <div className="relative bg-gradient-to-r from-primary-600 to-primary-800 rounded-2xl overflow-hidden shadow-lg">
      <div className="px-8 py-16 md:py-24">
        <div className="max-w-2xl">
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">
            Premium Printers & Supplies
          </h1>
          <p className="text-xl text-white/90 mb-8">
            Discover unbeatable deals on top brands. Free shipping on orders over £50!
          </p>
          <div className="flex flex-col sm:flex-row gap-4">
            <Link
              href="/products"
              className="inline-block bg-white text-primary-700 px-8 py-3 rounded-lg font-semibold hover:bg-gray-100 transition text-center"
            >
              Shop Now
            </Link>
            <Link
              href="/products?sale=true"
              className="inline-block bg-red-600 text-white px-8 py-3 rounded-lg font-semibold hover:bg-red-700 transition text-center"
            >
              View Sale Items
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
