"use client";

import { createContext, useCallback, useContext, useMemo, useState } from "react";

type ToastVariant = "success" | "error" | "info";

type Toast = {
  id: string;
  title: string;
  message?: string;
  variant: ToastVariant;
};

type ToastInput = {
  title: string;
  message?: string;
  variant?: ToastVariant;
  durationMs?: number;
};

type ToastContextValue = {
  toast: (input: ToastInput) => void;
};

const ToastContext = createContext<ToastContextValue | undefined>(undefined);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  }, []);

  const toast = useCallback(
    ({ title, message, variant = "info", durationMs = 4000 }: ToastInput) => {
      const id = crypto.randomUUID();
      setToasts((prev) => [...prev, { id, title, message, variant }]);
      window.setTimeout(() => removeToast(id), durationMs);
    },
    [removeToast]
  );

  const value = useMemo(() => ({ toast }), [toast]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="fixed bottom-6 left-1/2 z-[100] flex w-full max-w-sm -translate-x-1/2 flex-col gap-3 px-4">
        {toasts.map((toastItem) => (
          <div
            key={toastItem.id}
            className={`w-full rounded-xl border px-4 py-3 shadow-lg bg-white animate-in ${
              toastItem.variant === "success"
                ? "border-green-200"
                : toastItem.variant === "error"
                  ? "border-red-200"
                  : "border-gray-200"
            }`}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p
                  className={`text-sm font-semibold ${
                    toastItem.variant === "success"
                      ? "text-green-700"
                      : toastItem.variant === "error"
                        ? "text-red-700"
                        : "text-gray-900"
                  }`}
                >
                  {toastItem.title}
                </p>
                {toastItem.message && (
                  <p className="text-xs text-gray-600 mt-1">{toastItem.message}</p>
                )}
              </div>
              <button
                type="button"
                onClick={() => removeToast(toastItem.id)}
                className="text-xs text-gray-500 hover:text-gray-700"
              >
                Close
              </button>
            </div>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToast must be used within ToastProvider");
  }
  return context;
}
