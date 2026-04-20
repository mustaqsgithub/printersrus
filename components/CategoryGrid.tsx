import Link from "next/link";
import { Printer, Droplet, Cable } from "lucide-react";

const categories = [
  {
    name: "Printers",
    slug: "printers",
    icon: Printer,
    description: "Inkjet, Laser, & All-in-One",
    color: "bg-blue-100 text-blue-600",
  },
  {
    name: "Ink & Toner",
    slug: "ink-toner",
    icon: Droplet,
    description: "Original & Compatible",
    color: "bg-purple-100 text-purple-600",
  },
  {
    name: "Accessories",
    slug: "accessories",
    icon: Cable,
    description: "Cables, Paper, & More",
    color: "bg-green-100 text-green-600",
  },
];

export function CategoryGrid() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      {categories.map((category) => {
        const Icon = category.icon;
        return (
          <Link
            key={category.slug}
            href={`/products?category=${category.slug}`}
            className="block p-6 border border-gray-200 rounded-xl bg-white hover:shadow-xl transition-shadow group"
          >
            <div
              className={`w-16 h-16 rounded-2xl ${category.color} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}
            >
              <Icon size={32} />
            </div>
            <h3 className="text-xl font-bold mb-2 text-gray-900 group-hover:text-primary-600">
              {category.name}
            </h3>
            <p className="text-gray-600">{category.description}</p>
          </Link>
        );
      })}
    </div>
  );
}
