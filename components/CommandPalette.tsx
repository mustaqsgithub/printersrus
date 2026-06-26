"use client";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  useCallback,
  KeyboardEvent as ReactKeyboardEvent,
} from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import {
  Search,
  Home,
  Package,
  ShoppingCart,
  User,
  Receipt,
  Shield,
  Tag,
  Printer,
  Droplet,
  Cable,
  Sparkles,
  ArrowRight,
  CornerDownLeft,
  Command as CommandIcon,
  History,
  X,
} from "lucide-react";
import { useAuthStore } from "@/lib/auth-store";
import { isStaffRole } from "@/lib/roles";

type LucideIcon = typeof Search;

interface NavAction {
  type: "nav";
  id: string;
  label: string;
  description?: string;
  href: string;
  icon: LucideIcon;
  keywords?: string;
  group: "Navigate" | "Categories" | "Account";
  shortcut?: string;
}

interface ProductHit {
  type: "product";
  id: string;
  name: string;
  slug: string;
  brand?: string | null;
  mainImage: string;
  price: number;
  salePrice: number | null;
  onSale: boolean;
}

type Item = NavAction | ProductHit;

const RECENT_KEY = "printersrus.cmdk.recent";
const MAX_RECENT = 5;

function loadRecent(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(RECENT_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.slice(0, MAX_RECENT) : [];
  } catch {
    return [];
  }
}

function saveRecent(query: string) {
  if (typeof window === "undefined" || !query.trim()) return;
  try {
    const current = loadRecent().filter((q) => q.toLowerCase() !== query.toLowerCase());
    const next = [query, ...current].slice(0, MAX_RECENT);
    localStorage.setItem(RECENT_KEY, JSON.stringify(next));
  } catch {
    // ignore
  }
}

export function CommandPalette() {
  const router = useRouter();
  const { user } = useAuthStore();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [products, setProducts] = useState<ProductHit[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const [recent, setRecent] = useState<string[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // Toggle with Cmd/Ctrl+K, close with Esc, also support "/"
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const isMod = e.metaKey || e.ctrlKey;
      if (isMod && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((o) => !o);
        return;
      }
      if (e.key === "Escape" && open) {
        e.preventDefault();
        setOpen(false);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  // Focus the input on open and refresh recent
  useEffect(() => {
    if (open) {
      setRecent(loadRecent());
      setActiveIndex(0);
      requestAnimationFrame(() => inputRef.current?.focus());
    } else {
      setQuery("");
      setProducts([]);
    }
  }, [open]);

  // Lock body scroll while open
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  // Debounced product fetch
  useEffect(() => {
    const q = query.trim();
    if (!q) {
      setProducts([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const ctrl = new AbortController();
    const t = setTimeout(async () => {
      try {
        const res = await fetch(`/api/products?search=${encodeURIComponent(q)}`, {
          signal: ctrl.signal,
        });
        if (!res.ok) throw new Error("search failed");
        const data = await res.json();
        const hits: ProductHit[] = (data.products ?? []).slice(0, 6).map((p: any) => ({
          type: "product",
          id: String(p.id),
          name: p.name,
          slug: p.slug,
          brand: p.brand,
          mainImage: p.mainImage,
          price: p.price,
          salePrice: p.salePrice,
          onSale: Boolean(p.onSale),
        }));
        setProducts(hits);
      } catch (err) {
        if ((err as any)?.name !== "AbortError") setProducts([]);
      } finally {
        setLoading(false);
      }
    }, 180);
    return () => {
      clearTimeout(t);
      ctrl.abort();
    };
  }, [query]);

  const navActions: NavAction[] = useMemo(() => {
    const base: NavAction[] = [
      { type: "nav", id: "home", label: "Home", description: "Go to homepage", href: "/", icon: Home, group: "Navigate" },
      { type: "nav", id: "products", label: "All Products", description: "Browse the full catalog", href: "/products", icon: Package, group: "Navigate", keywords: "shop catalog" },
      { type: "nav", id: "sale", label: "Sale Items", description: "View discounted products", href: "/products?sale=true", icon: Tag, group: "Navigate", keywords: "deals discount offers" },
      { type: "nav", id: "cat-printers", label: "Printers", description: "Inkjet, Laser, & All-in-One", href: "/products?category=printers", icon: Printer, group: "Categories" },
      { type: "nav", id: "cat-ink", label: "Ink & Toner", description: "Original & compatible", href: "/products?category=ink-toner", icon: Droplet, group: "Categories" },
      { type: "nav", id: "cat-acc", label: "Computer Hardware", description: "Cables, paper & more", href: "/products?category=accessories", icon: Cable, group: "Categories" },
      { type: "nav", id: "cart", label: "Cart", description: "Review your items", href: "/cart", icon: ShoppingCart, group: "Account" },
    ];
    if (user) {
      base.push(
        { type: "nav", id: "account", label: "Account", description: "Profile & settings", href: "/account", icon: User, group: "Account" },
        { type: "nav", id: "orders", label: "Orders", description: "View order history", href: "/orders", icon: Receipt, group: "Account" },
      );
      if (isStaffRole(user.role)) {
        base.push({ type: "nav", id: "admin", label: "Admin Dashboard", description: "Manage the store", href: "/admin", icon: Shield, group: "Account" });
      }
    } else {
      base.push(
        { type: "nav", id: "signin", label: "Sign In", description: "Log in to your account", href: "/login", icon: User, group: "Account" },
        { type: "nav", id: "signup", label: "Create Account", description: "Sign up for free", href: "/signup", icon: Sparkles, group: "Account" },
      );
    }
    return base;
  }, [user]);

  // Filter nav actions client-side
  const filteredNav = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return navActions;
    return navActions.filter((a) => {
      const haystack = `${a.label} ${a.description ?? ""} ${a.keywords ?? ""}`.toLowerCase();
      return haystack.includes(q);
    });
  }, [query, navActions]);

  // Combined items list (flat, in render order)
  const flatItems: Item[] = useMemo(() => {
    return [...filteredNav, ...products];
  }, [filteredNav, products]);

  // Reset active when items change
  useEffect(() => {
    setActiveIndex(0);
  }, [flatItems.length, query]);

  const close = useCallback(() => setOpen(false), []);

  const runItem = useCallback(
    (item: Item) => {
      if (item.type === "nav") {
        router.push(item.href);
      } else {
        saveRecent(query.trim());
        router.push(`/products/${item.slug}`);
      }
      close();
    },
    [router, close, query],
  );

  const onInputKeyDown = (e: ReactKeyboardEvent<HTMLInputElement>) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((i) => Math.min(i + 1, Math.max(flatItems.length - 1, 0)));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      const item = flatItems[activeIndex];
      if (item) {
        runItem(item);
      } else if (query.trim()) {
        saveRecent(query.trim());
        router.push(`/products?search=${encodeURIComponent(query.trim())}`);
        close();
      }
    }
  };

  // Scroll active into view
  useEffect(() => {
    if (!open) return;
    const el = listRef.current?.querySelector<HTMLElement>(`[data-idx="${activeIndex}"]`);
    el?.scrollIntoView({ block: "nearest" });
  }, [activeIndex, open]);

  if (!open) return null;

  // Group nav by section while preserving the flat indices
  const sections: { title: string; items: { item: Item; idx: number }[] }[] = [];
  let idx = 0;
  const groups: NavAction["group"][] = ["Navigate", "Categories", "Account"];
  for (const g of groups) {
    const items = filteredNav.filter((a) => a.group === g).map((item) => ({ item: item as Item, idx: idx++ }));
    if (items.length) sections.push({ title: g, items });
  }
  const productItems = products.map((p) => ({ item: p as Item, idx: idx++ }));
  if (productItems.length) sections.push({ title: "Products", items: productItems });

  const showFallback = !flatItems.length;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Command palette"
      className="fixed inset-0 z-[100] flex items-start justify-center px-4 pt-[10vh] sm:pt-[14vh]"
    >
      {/* Backdrop */}
      <button
        aria-label="Close command palette"
        onClick={close}
        className="absolute inset-0 bg-slate-950/50 backdrop-blur-sm"
      />

      {/* Panel */}
      <div className="relative w-full max-w-2xl rounded-xl bg-white shadow-2xl ring-1 ring-black/5 overflow-hidden rise-in">
        {/* Brand accent strip */}
        <div aria-hidden className="h-0.5 w-full bg-primary-600" />
        {/* Search input */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-200">
          <Search size={18} className="text-gray-400 shrink-0" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={onInputKeyDown}
            placeholder="Search products, jump to a page…"
            className="flex-1 bg-transparent border-0 focus:outline-none text-base text-gray-900 placeholder:text-gray-400"
          />
          {loading && (
            <span className="text-xs text-gray-400 font-medium">Searching…</span>
          )}
          <button
            onClick={close}
            aria-label="Close"
            className="text-gray-400 hover:text-gray-600 hidden sm:inline-flex"
          >
            <X size={16} />
          </button>
        </div>

        {/* Recent searches when empty */}
        {!query && recent.length > 0 && (
          <div className="px-3 pt-3">
            <div className="px-2 pb-2 text-[11px] font-semibold uppercase tracking-wider text-gray-500 inline-flex items-center gap-1.5">
              <History size={12} /> Recent searches
            </div>
            <div className="flex flex-wrap gap-1.5 px-2 pb-2">
              {recent.map((r) => (
                <button
                  key={r}
                  onClick={() => setQuery(r)}
                  className="text-xs px-2.5 py-1 rounded-full bg-gray-100 hover:bg-primary-50 hover:text-primary-700 text-gray-700 transition"
                >
                  {r}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Results */}
        <div ref={listRef} className="max-h-[55vh] overflow-y-auto py-2">
          {sections.map((section) => (
            <div key={section.title} className="mb-1">
              <div className="px-5 pt-2 pb-1 text-[11px] font-semibold uppercase tracking-wider text-gray-500">
                {section.title}
              </div>
              <div className="px-2">
                {section.items.map(({ item, idx: i }) => (
                  <CommandRow
                    key={item.type === "nav" ? item.id : `p-${item.id}`}
                    item={item}
                    active={activeIndex === i}
                    index={i}
                    onMouseEnter={() => setActiveIndex(i)}
                    onSelect={() => runItem(item)}
                  />
                ))}
              </div>
            </div>
          ))}

          {showFallback && (
            <div className="px-5 py-10 text-center">
              {query ? (
                <>
                  <div className="text-sm text-gray-500 mb-3">
                    No matches for <span className="font-semibold text-gray-700">&ldquo;{query}&rdquo;</span>
                  </div>
                  <button
                    onClick={() => {
                      saveRecent(query.trim());
                      router.push(`/products?search=${encodeURIComponent(query.trim())}`);
                      close();
                    }}
                    className="inline-flex items-center gap-2 text-sm font-semibold text-primary-700 hover:text-primary-800"
                  >
                    Search all products <ArrowRight size={14} />
                  </button>
                </>
              ) : (
                <div className="text-sm text-gray-500">
                  Start typing to search products or jump to a page.
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer hints */}
        <div className="flex items-center justify-between gap-3 px-4 py-2.5 border-t border-gray-200 bg-gray-50 text-[11px] text-gray-500">
          <div className="flex items-center gap-3">
            <KeyHint label="↑↓" /> <span>Navigate</span>
            <KeyHint label="↵" icon={CornerDownLeft} /> <span>Select</span>
            <KeyHint label="esc" /> <span>Close</span>
          </div>
          <div className="hidden sm:flex items-center gap-1.5">
            <CommandIcon size={11} />
            <span>K to toggle</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function KeyHint({ label, icon: Icon }: { label: string; icon?: LucideIcon }) {
  return (
    <kbd className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-white ring-1 ring-gray-200 text-[10px] font-semibold text-gray-600 shadow-sm">
      {Icon ? <Icon size={10} /> : label}
    </kbd>
  );
}

function CommandRow({
  item,
  active,
  index,
  onSelect,
  onMouseEnter,
}: {
  item: Item;
  active: boolean;
  index: number;
  onSelect: () => void;
  onMouseEnter: () => void;
}) {
  if (item.type === "nav") {
    const Icon = item.icon;
    return (
      <button
        data-idx={index}
        onMouseEnter={onMouseEnter}
        onClick={onSelect}
        className={`group w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition ${
          active
            ? "bg-primary-50 text-primary-900"
            : "hover:bg-gray-50 text-gray-800"
        }`}
      >
        <span
          className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 transition ${
            active
              ? "bg-primary-600 text-white"
              : "bg-gray-100 text-gray-600"
          }`}
        >
          <Icon size={16} />
        </span>
        <span className="flex-1 min-w-0">
          <span className="block text-sm font-semibold truncate">{item.label}</span>
          {item.description && (
            <span className="block text-xs text-gray-500 truncate">{item.description}</span>
          )}
        </span>
        <ArrowRight
          size={14}
          className={`transition ${
            active
              ? "opacity-100 translate-x-0 text-primary-700"
              : "opacity-0 -translate-x-1 text-gray-400"
          }`}
        />
      </button>
    );
  }

  // Product row
  const display = item.salePrice ?? item.price;
  return (
    <button
      data-idx={index}
      onMouseEnter={onMouseEnter}
      onClick={onSelect}
      className={`group w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left transition ${
        active ? "bg-primary-50" : "hover:bg-gray-50"
      }`}
    >
      <span className="relative w-10 h-10 rounded-lg overflow-hidden bg-gray-100 ring-1 ring-black/5 shrink-0">
        {item.mainImage && (
          <Image src={item.mainImage} alt={item.name} fill className="object-cover" sizes="40px" />
        )}
      </span>
      <span className="flex-1 min-w-0">
        <span className="block text-sm font-semibold text-gray-900 truncate">{item.name}</span>
        <span className="block text-xs text-gray-500 truncate">
          {item.brand ? `${item.brand} · ` : ""}
          <span
            className={
              item.onSale
                ? "text-red-600 font-semibold"
                : "text-gray-700 font-semibold"
            }
          >
            £{display.toFixed(2)}
          </span>
          {item.onSale && (
            <span className="ml-1 line-through text-gray-400">£{item.price.toFixed(2)}</span>
          )}
        </span>
      </span>
      <ArrowRight
        size={14}
        className={`transition ${
          active
            ? "opacity-100 translate-x-0 text-primary-700"
            : "opacity-0 -translate-x-1 text-gray-400"
        }`}
      />
    </button>
  );
}
