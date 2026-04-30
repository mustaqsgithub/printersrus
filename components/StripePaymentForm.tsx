"use client";

import { useEffect, useState } from "react";
import { loadStripe, type Stripe } from "@stripe/stripe-js";
import {
  Elements,
  PaymentElement,
  useStripe,
  useElements,
} from "@stripe/react-stripe-js";

let stripePromise: Promise<Stripe | null> | null = null;
function getStripeJs(): Promise<Stripe | null> {
  if (!stripePromise) {
    const key = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;
    stripePromise = key ? loadStripe(key) : Promise.resolve(null);
  }
  return stripePromise;
}

export interface CartItemPayload {
  productId: string;
  quantity: number;
  variantId?: string;
}

interface StripePaymentFormProps {
  items: CartItemPayload[];
  savePaymentMethod?: boolean;
  onSuccess: (paymentIntentId: string) => void | Promise<void>;
  onError?: (message: string) => void;
  submitting: boolean;
  setSubmitting: (v: boolean) => void;
  buttonLabel: string;
}

export default function StripePaymentForm(props: StripePaymentFormProps) {
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setError(null);
    fetch("/api/payments/stripe/intent", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        items: props.items,
        savePaymentMethod: props.savePaymentMethod,
      }),
    })
      .then(async (r) => {
        const data = await r.json();
        if (!r.ok) throw new Error(data.message || "Failed to initialise payment.");
        return data;
      })
      .then((data) => {
        if (!cancelled) setClientSecret(data.clientSecret);
      })
      .catch((e) => {
        if (!cancelled) setError(e.message);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(props.items), props.savePaymentMethod]);

  if (error) {
    return <div className="text-red-600 text-sm">{error}</div>;
  }
  if (!clientSecret) {
    return <div className="text-gray-600 text-sm">Loading payment form...</div>;
  }

  return (
    <Elements
      stripe={getStripeJs()}
      options={{ clientSecret, appearance: { theme: "stripe" } }}
    >
      <InnerForm {...props} />
    </Elements>
  );
}

function InnerForm({
  onSuccess,
  onError,
  submitting,
  setSubmitting,
  buttonLabel,
}: StripePaymentFormProps) {
  const stripe = useStripe();
  const elements = useElements();
  const [message, setMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stripe || !elements) return;
    setSubmitting(true);
    setMessage(null);

    const { error, paymentIntent } = await stripe.confirmPayment({
      elements,
      redirect: "if_required",
    });

    if (error) {
      const msg = error.message || "Payment failed.";
      setMessage(msg);
      onError?.(msg);
      setSubmitting(false);
      return;
    }
    if (paymentIntent && paymentIntent.status === "succeeded") {
      await onSuccess(paymentIntent.id);
      // Caller is responsible for clearing the form / navigating.
    } else {
      setMessage(`Payment status: ${paymentIntent?.status || "unknown"}`);
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <PaymentElement options={{ layout: "tabs" }} />
      {message && <p className="text-red-600 text-sm">{message}</p>}
      <button
        type="submit"
        disabled={submitting || !stripe || !elements}
        className="w-full bg-primary-600 text-white py-4 rounded-lg font-semibold hover:bg-primary-700 transition disabled:bg-gray-400 disabled:cursor-not-allowed"
      >
        {submitting ? "Processing..." : buttonLabel}
      </button>
    </form>
  );
}
