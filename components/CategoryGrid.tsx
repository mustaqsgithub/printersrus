import Link from "next/link";
import { Printer, Droplet, Cable, ArrowUpRight } from "lucide-react";

const categories = [
  {
    name: "Printers",
    slug: "printers",
    icon: Printer,
    description: "Inkjet, Laser, & All-in-One",
  },
  {
    name: "Ink & Toner",
    slug: "ink-toner",
    icon: Droplet,
    description: "Original & Compatible",
  },
  {
    name: "Computer Hardware",
    slug: "accessories",
    icon: Cable,
    description: "Cables, Paper, & More",
  },
];

export function CategoryGrid() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {categories.map((category) => {
        const Icon = category.icon;
        return (
          <Link
            key={category.slug}
            href={`/products?category=${category.slug}`}
            className="group block rounded-xl bg-white border border-gray-200 p-6 hover:border-gray-300 hover:shadow-soft transition"
          >
            <div className="flex items-start justify-between mb-5">
              <div className="w-12 h-12 rounded-lg bg-gray-100 flex items-center justify-center text-gray-700 group-hover:bg-primary-600 group-hover:text-white transition">
                <Icon size={22} />
              </div>
              <ArrowUpRight
                size={18}
                className="text-gray-300 group-hover:text-gray-900 group-hover:-translate-y-0.5 group-hover:translate-x-0.5 transition"
              />
            </div>

            <h3 className="text-lg font-semibold mb-1 text-gray-900">{category.name}</h3>
            <p className="text-sm text-gray-500">{category.description}</p>
          </Link>
        );
      })}
    </div>
  );
}
