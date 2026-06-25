import { NextRequest, NextResponse } from "next/server";
import { getStripe } from "@/lib/stripe";
import type Stripe from "stripe";
import { dbHelpers } from "@/lib/database";

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

  if (!stripe) {
    return NextResponse.json(
      { message: "Stripe is not configured. Please set STRIPE_SECRET_KEY in environment variables." },
      { status: 503 }
    );
  }

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
    case "payment_method.attached": {
      const paymentMethod = event.data.object as Stripe.PaymentMethod;
      console.log(`[stripe webhook] PaymentMethod attached: ${paymentMethod.id}`);
      
      // Save payment method details to database if it's a card and has a customer
      if (paymentMethod.type === "card" && paymentMethod.customer && paymentMethod.card) {
        const customerId = typeof paymentMethod.customer === "string" 
          ? paymentMethod.customer 
          : paymentMethod.customer.id;
        
        // Find user by Stripe customer ID
        const user = await dbHelpers.getUserByStripeCustomerId(customerId);
        if (user) {
          try {
            await dbHelpers.addStripePaymentMethod({
              userId: user.id,
              stripePaymentMethodId: paymentMethod.id,
              stripeCustomerId: customerId,
              cardType: paymentMethod.card.brand,
              lastFour: paymentMethod.card.last4,
              expiryMonth: paymentMethod.card.exp_month,
              expiryYear: paymentMethod.card.exp_year,
              cardholderName: paymentMethod.billing_details?.name || `${user.first_name} ${user.last_name}`,
            });
            console.log(`[stripe webhook] Saved card ****${paymentMethod.card.last4} for user ${user.email}`);
          } catch (err) {
            console.error(`[stripe webhook] Failed to save payment method:`, err);
          }
        } else {
          console.warn(`[stripe webhook] No user found for Stripe customer ${customerId}`);
        }
      }
      break;
    }
    case "setup_intent.succeeded": {
      const setupIntent = event.data.object as Stripe.SetupIntent;
      console.log(`[stripe webhook] SetupIntent succeeded: ${setupIntent.id}`);
      
      // When setup intent succeeds, the payment method is attached to the customer
      if (setupIntent.payment_method && setupIntent.customer) {
        const paymentMethodId = typeof setupIntent.payment_method === "string"
          ? setupIntent.payment_method
          : setupIntent.payment_method.id;
        
        const customerId = typeof setupIntent.customer === "string"
          ? setupIntent.customer
          : setupIntent.customer.id;
        
        console.log(`[stripe webhook] SetupIntent ${setupIntent.id} succeeded with payment method ${paymentMethodId}`);
        
        // Fetch the payment method details and save to database
        try {
          const paymentMethod = await stripe.paymentMethods.retrieve(paymentMethodId);
          if (paymentMethod.type === "card" && paymentMethod.card) {
            const user = await dbHelpers.getUserByStripeCustomerId(customerId);
            if (user) {
              await dbHelpers.addStripePaymentMethod({
                userId: user.id,
                stripePaymentMethodId: paymentMethod.id,
                stripeCustomerId: customerId,
                cardType: paymentMethod.card.brand,
                lastFour: paymentMethod.card.last4,
                expiryMonth: paymentMethod.card.exp_month,
                expiryYear: paymentMethod.card.exp_year,
                cardholderName: paymentMethod.billing_details?.name || `${user.first_name} ${user.last_name}`,
              });
              console.log(`[stripe webhook] Saved card ****${paymentMethod.card.last4} for user ${user.email}`);
            } else {
              console.warn(`[stripe webhook] No user found for Stripe customer ${customerId}`);
            }
          }
        } catch (err) {
          console.error(`[stripe webhook] Failed to retrieve/save payment method ${paymentMethodId}:`, err);
        }
      }
      break;
    }
    default:
      // Unhandled event types are fine — just log.
      console.log(`[stripe webhook] Unhandled event: ${event.type}`);
  }

  return NextResponse.json({ received: true });
}
