"use client";

import { PayPalScriptProvider, PayPalButtons } from "@paypal/react-paypal-js";

export interface CartItemPayload {
  productId: string;
  quantity: number;
  variantId?: string;
}

interface PaypalCheckoutButtonProps {
  items: CartItemPayload[];
  onApproved: (paypalOrderId: string) => void | Promise<void>;
  onError?: (message: string) => void;
  disabled?: boolean;
}

export default function PaypalCheckoutButton({
  items,
  onApproved,
  onError,
  disabled,
}: PaypalCheckoutButtonProps) {
  const clientId = process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID;
  if (!clientId) {
    return (
      <p className="text-sm text-gray-600">PayPal is not configured.</p>
    );
  }

  return (
    <PayPalScriptProvider
      options={{
        clientId,
        currency: "GBP",
        intent: "capture",
      }}
    >
      <PayPalButtons
        disabled={disabled}
        style={{ layout: "vertical", shape: "rect", label: "paypal" }}
        createOrder={async () => {
          const res = await fetch("/api/payments/paypal/create-order", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ items }),
          });
          const data = await res.json();
          if (!res.ok) {
            const msg = data.message || "Failed to create PayPal order.";
            onError?.(msg);
            throw new Error(msg);
          }
          return data.id;
        }}
        onApprove={async (data) => {
          const res = await fetch("/api/payments/paypal/capture-order", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ orderId: data.orderID }),
          });
          const captured = await res.json();
          if (!res.ok || captured.status !== "COMPLETED") {
            const msg = captured.message || "Failed to capture PayPal order.";
            onError?.(msg);
            throw new Error(msg);
          }
          await onApproved(data.orderID);
        }}
        onError={(err) => {
          onError?.((err as any)?.message || "PayPal error.");
        }}
      />
    </PayPalScriptProvider>
  );
}
