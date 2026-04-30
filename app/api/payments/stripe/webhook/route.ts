import { NextRequest, NextResponse } from "next/server";
import { getStripe } from "@/lib/stripe";
import type Stripe from "stripe";

// Stripe needs the raw body for signature verification
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const sig = request.headers.get("stripe-signature");
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!sig || !secret) {
    return NextResponse.json({ message: "Missing signature or secret." }, { status: 400 });
  }

  const raw = await request.text();
  const stripe = getStripe();

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(raw, sig, secret);
  } catch (err: any) {
    console.error("[stripe webhook] signature verification failed:", err?.message);
    return NextResponse.json({ message: "Invalid signature." }, { status: 400 });
  }

  switch (event.type) {
    case "payment_intent.succeeded": {
      const pi = event.data.object as Stripe.PaymentIntent;
      console.log(`[stripe webhook] PaymentIntent succeeded: ${pi.id}`);
      // Order is created via /api/checkout after client-side confirmation,
      // so this is a safety net for async payment methods.
      break;
    }
    case "payment_intent.payment_failed": {
      const pi = event.data.object as Stripe.PaymentIntent;
      console.warn(`[stripe webhook] PaymentIntent failed: ${pi.id} - ${pi.last_payment_error?.message}`);
      break;
    }
    case "charge.refunded": {
      const charge = event.data.object as Stripe.Charge;
      console.log(`[stripe webhook] Charge refunded: ${charge.id}`);
      break;
    }
    default:
      // Unhandled event types are fine — just log.
      console.log(`[stripe webhook] Unhandled event: ${event.type}`);
  }

  return NextResponse.json({ received: true });
}
