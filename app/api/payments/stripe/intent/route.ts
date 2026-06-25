import { NextRequest, NextResponse } from "next/server";
import { getStripe, toMinorUnits } from "@/lib/stripe";
import { priceCart } from "@/lib/pricing";
import { getSessionToken } from "@/lib/auth-cookies";
import { getSessionUser } from "@/lib/auth";
import { dbHelpers } from "@/lib/database";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => null);
    if (!body?.items) {
      return NextResponse.json({ message: "Missing items." }, { status: 400 });
    }

    const priced = await priceCart(body.items);
    const stripe = getStripe();

    if (!stripe) {
      return NextResponse.json(
        { message: "Stripe is not configured. Please set STRIPE_SECRET_KEY in environment variables." },
        { status: 503 }
      );
    }

    // If logged in, attach to a Stripe Customer so saved cards work
    let customerId: string | undefined;
    const token = await getSessionToken();
    if (token) {
      const user = await getSessionUser(token);
      if (user) {
        const u = user as any;
        customerId = (await dbHelpers.getUserStripeCustomerId(u.id)) || undefined;
        if (!customerId) {
          const customer = await stripe.customers.create({
            email: u.email,
            name: `${u.firstName} ${u.lastName}`.trim(),
            metadata: { userId: u.id },
          });
          customerId = customer.id;
          await dbHelpers.setUserStripeCustomerId(u.id, customerId);
        }
      }
    }

    const intent = await stripe.paymentIntents.create({
      amount: toMinorUnits(priced.totalAmount, priced.currency),
      currency: priced.currency,
      customer: customerId,
      automatic_payment_methods: { enabled: true },
      setup_future_usage: body.savePaymentMethod && customerId ? "off_session" : undefined,
      metadata: {
        subtotal: priced.subtotal.toFixed(2),
        shipping: priced.shippingAmount.toFixed(2),
        tax: priced.taxAmount.toFixed(2),
      },
    });

    return NextResponse.json({
      clientSecret: intent.client_secret,
      paymentIntentId: intent.id,
      amount: priced.totalAmount,
      currency: priced.currency,
    });
  } catch (err: any) {
    console.error("[stripe/intent] error", err);
    return NextResponse.json(
      { message: err?.message || "Failed to create payment intent." },
      { status: 500 }
    );
  }
}
