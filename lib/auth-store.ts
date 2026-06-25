import { create } from "zustand";
import { useCartStore } from "@/lib/cart-store";

export interface AuthUser {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  role: string;
  emailVerified: boolean;
  emailNotifications: boolean;
  dateJoined: string;
}

interface SignUpInput {
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  password: string;
}

interface SignInInput {
  email: string;
  password: string;
}

interface AuthStore {
  user: AuthUser | null;
  isLoading: boolean;
  signUp: (input: SignUpInput) => Promise<{ user: AuthUser; verificationUrl?: string }>;
  signIn: (input: SignInInput) => Promise<AuthUser>;
  signOut: () => Promise<void>;
  updateProfile: (
    updates: Partial<Omit<AuthUser, "id" | "dateJoined" | "role" | "emailVerified">>
  ) => Promise<{ user: AuthUser; verificationUrl?: string }>;
  loadUser: () => Promise<void>;
}

const toJson = async (response: Response) => {
  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    const error = new Error(data?.message || "Request failed.");
    (error as Error & { data?: unknown }).data = data;
    throw error;
  }
  return response.json();
};

const syncCartUser = (userId: string | null) => {
  if (typeof window === "undefined") {
    return;
  }
  useCartStore.getState().setActiveUserId(userId);
};

export const useAuthStore = create<AuthStore>((set) => ({
  user: null,
  isLoading: false,
  signUp: async ({ firstName, lastName, email, phone, password }) => {
    set({ isLoading: true });
    try {
      const data = await toJson(
        await fetch("/api/auth/signup", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ firstName, lastName, email, phone, password }),
        })
      );
      set({ user: data.user });
      syncCartUser(data.user?.id || null);
      return data;
    } finally {
      set({ isLoading: false });
    }
  },
  signIn: async ({ email, password }) => {
    set({ isLoading: true });
    try {
      const data = await toJson(
        await fetch("/api/auth/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, password }),
        })
      );
      set({ user: data.user });
      syncCartUser(data.user?.id || null);
      return data.user as AuthUser;
    } finally {
      set({ isLoading: false });
    }
  },
  signOut: async () => {
    set({ isLoading: true });
    try {
      await toJson(
        await fetch("/api/auth/logout", {
          method: "POST",
        })
      );
      set({ user: null });
      syncCartUser(null);
    } finally {
      set({ isLoading: false });
    }
  },
  updateProfile: async (updates) => {
    set({ isLoading: true });
    try {
      const data = await toJson(
        await fetch("/api/auth/profile", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(updates),
        })
      );
      set({ user: data.user });
      syncCartUser(data.user?.id || null);
      return data;
    } finally {
      set({ isLoading: false });
    }
  },
  loadUser: async () => {
    set({ isLoading: true });
    try {
      const data = await toJson(await fetch("/api/auth/me"));
      set({ user: data.user || null });
      syncCartUser(data.user?.id || null);
    } finally {
      set({ isLoading: false });
    }
  },
}));
