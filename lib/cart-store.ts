import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { Product } from "./types";

interface CartItem {
  product: Product;
  quantity: number;
  variantId?: string;
}

interface CartStore {
  items: CartItem[];
  activeUserId: string;
  isSyncing: boolean;
  setActiveUserId: (userId: string | null) => void;
  loadFromServer: (options?: { mergeGuest?: boolean }) => Promise<void>;
  syncToServer: (mode?: "replace" | "merge") => Promise<void>;
  addItem: (product: Product, quantity?: number, variantId?: string) => void;
  removeItem: (productId: string, variantId?: string) => void;
  updateQuantity: (productId: string, quantity: number, variantId?: string) => void;
  clearCart: () => void;
  getTotalItems: () => number;
  getTotalPrice: () => number;
}

const STORAGE_KEY = "cart-storage";
const ACTIVE_USER_KEY = "active-user-id";
const SYNC_DELAY_MS = 600;
let syncTimer: ReturnType<typeof setTimeout> | null = null;
let pendingGuestItems: CartItem[] | null = null;

const getActiveUserId = () => {
  if (typeof window === "undefined") {
    return "guest";
  }
  return localStorage.getItem(ACTIVE_USER_KEY) || "guest";
};

const getScopedKey = (key: string) => `${key}:${getActiveUserId()}`;

const cartStorage = {
  getItem: (key: string) => {
    if (typeof window === "undefined") {
      return null;
    }
    const scopedKey = getScopedKey(key);
    const value = localStorage.getItem(scopedKey);
    if (value) {
      return value;
    }
    const legacy = localStorage.getItem(key);
    if (legacy) {
      localStorage.setItem(scopedKey, legacy);
      localStorage.removeItem(key);
      return legacy;
    }
    return null;
  },
  setItem: (key: string, value: string) => {
    if (typeof window === "undefined") {
      return;
    }
    localStorage.setItem(getScopedKey(key), value);
  },
  removeItem: (key: string) => {
    if (typeof window === "undefined") {
      return;
    }
    localStorage.removeItem(getScopedKey(key));
  },
};

const getItemKey = (item: CartItem) => `${item.product.id}:${item.variantId || ""}`;

const mergeItems = (base: CartItem[], incoming: CartItem[]) => {
  const map = new Map<string, CartItem>();
  for (const item of base) {
    map.set(getItemKey(item), { ...item });
  }
  for (const item of incoming) {
    const key = getItemKey(item);
    const existing = map.get(key);
    if (existing) {
      map.set(key, {
        ...existing,
        quantity: Math.max(existing.quantity, item.quantity),
      });
    } else {
      map.set(key, { ...item });
    }
  }
  return Array.from(map.values());
};

const scheduleSync = (syncFn: () => Promise<void>) => {
  if (typeof window === "undefined") {
    return;
  }
  if (syncTimer) {
    clearTimeout(syncTimer);
  }
  syncTimer = setTimeout(() => {
    syncTimer = null;
    void syncFn();
  }, SYNC_DELAY_MS);
};

export const useCartStore = create<CartStore>()(
  persist(
    (set, get) => ({
      items: [],
      activeUserId: getActiveUserId(),
      isSyncing: false,
      setActiveUserId: (userId) => {
        if (typeof window === "undefined") {
          return;
        }
        const prevUserId = get().activeUserId;
        if (prevUserId === "guest" && userId && userId !== "guest") {
          pendingGuestItems = [...get().items];
        }
        const nextUserId = userId || "guest";
        localStorage.setItem(ACTIVE_USER_KEY, nextUserId);
        set({ activeUserId: nextUserId });
        useCartStore.persist.rehydrate();
        if (nextUserId !== "guest") {
          void get().loadFromServer({ mergeGuest: true });
        }
      },
      loadFromServer: async (options) => {
        if (typeof window === "undefined") {
          return;
        }
        if (get().activeUserId === "guest") {
          return;
        }
        set({ isSyncing: true });
        try {
          const response = await fetch("/api/cart");
          if (!response.ok) {
            return;
          }
          const data = await response.json();
          if (Array.isArray(data?.items)) {
            let merged = mergeItems(data.items, get().items);
            if (options?.mergeGuest && pendingGuestItems?.length) {
              merged = mergeItems(merged, pendingGuestItems);
              pendingGuestItems = null;
            }
            set({ items: merged });
            scheduleSync(() => get().syncToServer("replace"));
          }
        } finally {
          set({ isSyncing: false });
        }
      },
      syncToServer: async (mode = "replace") => {
        if (typeof window === "undefined") {
          return;
        }
        if (get().activeUserId === "guest") {
          return;
        }
        const items = get().items.map((item) => ({
          productId: item.product.id,
          quantity: item.quantity,
          variantId: item.variantId,
        }));
        set({ isSyncing: true });
        try {
          const response = await fetch(`/api/cart?mode=${mode}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ items }),
          });
          if (!response.ok) {
            return;
          }
          const data = await response.json();
          if (Array.isArray(data?.items)) {
            set({ items: data.items });
          }
        } finally {
          set({ isSyncing: false });
        }
      },

      addItem: (product, quantity = 1, variantId) => {
        set((state) => {
          const existingItem = state.items.find(
            (item) => item.product.id === product.id && item.variantId === variantId
          );

          if (existingItem) {
            return {
              items: state.items.map((item) =>
                item.product.id === product.id && item.variantId === variantId
                  ? { ...item, quantity: item.quantity + quantity }
                  : item
              ),
            };
          }

          return {
            items: [...state.items, { product, quantity, variantId }],
          };
        });
        scheduleSync(() => get().syncToServer("merge"));
      },

      removeItem: (productId, variantId) => {
        set((state) => ({
          items: state.items.filter(
            (item) => !(item.product.id === productId && item.variantId === variantId)
          ),
        }));
        scheduleSync(() => get().syncToServer("replace"));
      },

      updateQuantity: (productId, quantity, variantId) => {
        if (quantity <= 0) {
          get().removeItem(productId, variantId);
          return;
        }

        set((state) => ({
          items: state.items.map((item) =>
            item.product.id === productId && item.variantId === variantId
              ? { ...item, quantity }
              : item
          ),
        }));
        scheduleSync(() => get().syncToServer("merge"));
      },

      clearCart: () => {
        set({ items: [] });
        scheduleSync(() => get().syncToServer("replace"));
      },

      getTotalItems: () => {
        return get().items.reduce((total, item) => total + item.quantity, 0);
      },

      getTotalPrice: () => {
        return get().items.reduce((total, item) => {
          const price = item.product.salePrice || item.product.price;
          return total + price * item.quantity;
        }, 0);
      },
    }),
    {
      name: STORAGE_KEY,
      storage: createJSONStorage(() => cartStorage),
      version: 2,
      migrate: (state) => {
        const typed = state as CartStore;
        if (typed?.activeUserId === "guest") {
          return { ...typed, items: [] };
        }
        return state as CartStore;
      },
    }
  )
);
