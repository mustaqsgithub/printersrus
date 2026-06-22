"use client";

import { useEffect, useState } from "react";
import { Truck, RotateCcw, ShieldCheck, Headphones, Phone, MessageCircle, X } from "lucide-react";
import { SUPPORT_PHONE, SUPPORT_WHATSAPP } from "@/lib/contact";

const perks = [
  { icon: Truck, title: "Free Shipping", desc: "On orders over £250" },
  { icon: RotateCcw, title: "30-Day Returns", desc: "Hassle-free exchanges" },
  { icon: ShieldCheck, title: "Secure Checkout", desc: "Stripe & PayPal protected" },
  { icon: Headphones, title: "Expert Support", desc: "Real humans, 7 days a week" },
];

const cardClasses =
  "flex items-center gap-3 rounded-xl bg-white border border-gray-200 p-4 hover:border-gray-300 transition";

export function PerksStrip() {
  const [supportOpen, setSupportOpen] = useState(false);

  // Close the popup on Escape for keyboard accessibility.
  useEffect(() => {
    if (!supportOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setSupportOpen(false);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [supportOpen]);

  return (
    <>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
        {perks.map((p) => {
          const Icon = p.icon;
          const content = (
            <>
              <div className="w-10 h-10 rounded-lg bg-gray-100 text-gray-700 flex items-center justify-center shrink-0">
                <Icon size={18} />
              </div>
              <div>
                <div className="font-semibold text-gray-900 text-sm">{p.title}</div>
                <div className="text-xs text-gray-500">{p.desc}</div>
              </div>
            </>
          );

          if (p.title === "Expert Support") {
            return (
              <button
                key={p.title}
                type="button"
                onClick={() => setSupportOpen(true)}
                className={`${cardClasses} text-left w-full cursor-pointer hover:border-primary-300`}
                aria-haspopup="dialog"
              >
                {content}
              </button>
            );
          }

          return (
            <div key={p.title} className={cardClasses}>
              {content}
            </div>
          );
        })}
      </div>

      {supportOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          role="dialog"
          aria-modal="true"
          aria-label="Contact expert support"
          onClick={() => setSupportOpen(false)}
        >
          <div
            className="relative w-full max-w-sm rounded-2xl bg-white p-6 shadow-soft"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setSupportOpen(false)}
              className="absolute right-4 top-4 text-gray-400 hover:text-gray-600 transition"
              aria-label="Close"
            >
              <X size={20} />
            </button>

            <div className="mb-5">
              <div className="w-12 h-12 rounded-xl bg-gray-100 text-gray-700 flex items-center justify-center mb-3">
                <Headphones size={22} />
              </div>
              <h3 className="text-lg font-bold text-gray-900">Talk to an expert</h3>
              <p className="text-sm text-gray-500 mt-1">Real humans, 7 days a week.</p>
            </div>

            <div className="space-y-3">
              <a
                href={`tel:${SUPPORT_PHONE.replace(/\s+/g, "")}`}
                className="flex items-center gap-3 rounded-lg border border-gray-200 px-4 py-3 hover:border-gray-300 hover:bg-gray-50 transition"
              >
                <span className="w-9 h-9 rounded-lg bg-primary-50 text-primary-600 flex items-center justify-center shrink-0">
                  <Phone size={18} />
                </span>
                <span>
                  <span className="block text-sm font-semibold text-gray-900">Call us</span>
                  <span className="block text-sm text-gray-500">{SUPPORT_PHONE}</span>
                </span>
              </a>

              <a
                href={`https://wa.me/${SUPPORT_WHATSAPP}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 rounded-lg border border-gray-200 px-4 py-3 hover:border-gray-300 hover:bg-gray-50 transition"
              >
                <span className="w-9 h-9 rounded-lg bg-green-50 text-green-600 flex items-center justify-center shrink-0">
                  <MessageCircle size={18} />
                </span>
                <span>
                  <span className="block text-sm font-semibold text-gray-900">Chat on WhatsApp</span>
                  <span className="block text-sm text-gray-500">Quick replies during opening hours</span>
                </span>
              </a>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
