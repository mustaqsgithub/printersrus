import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { getSessionToken } from "@/lib/auth-cookies";
import { dbHelpers } from "@/lib/database";
import { getStripe } from "@/lib/stripe";

export async function GET() {
  const token = await getSessionToken();
  if (!token) {
    return NextResponse.json({ message: "Unauthorized." }, { status: 401 });
  }
  const user = await getSessionUser(token);
  if (!user) {
    return NextResponse.json({ message: "Unauthorized." }, { status: 401 });
  }

  const methods = await dbHelpers.getPaymentMethodsByUserId((user as any).id);
  return NextResponse.json({ paymentMethods: methods });
}

// Save a Stripe payment method (already attached to the customer via SetupIntent)
export async function POST(request: NextRequest) {
  const token = await getSessionToken();
  if (!token) return NextResponse.json({ message: "Unauthorized." }, { status: 401 });
  const user = await getSessionUser(token);
  if (!user) return NextResponse.json({ message: "Unauthorized." }, { status: 401 });

  const stripe = getStripe();
  if (!stripe) {
    return NextResponse.json(
      { message: "Stripe is not configured. Please set STRIPE_SECRET_KEY in environment variables." },
      { status: 503 }
    );
  }

  const body = await request.json().catch(() => null);
  const stripePaymentMethodId = body?.stripePaymentMethodId;
  if (!stripePaymentMethodId) {
    return NextResponse.json(
      { message: "stripePaymentMethodId is required." },
      { status: 400 }
    );
  }

  const u = user as any;
  const customerId = await dbHelpers.getUserStripeCustomerId(u.id);
  if (!customerId) {
    return NextResponse.json({ message: "Stripe customer not found." }, { status: 400 });
  }

  const pm = await stripe.paymentMethods.retrieve(stripePaymentMethodId);
  if (pm.customer !== customerId) {
    return NextResponse.json(
      { message: "Payment method does not belong to this customer." },
      { status: 403 }
    );
  }
  if (!pm.card) {
    return NextResponse.json({ message: "Only card payment methods are supported." }, { status: 400 });
  }

  const id = await dbHelpers.addStripePaymentMethod({
    userId: u.id,
    stripePaymentMethodId: pm.id,
    stripeCustomerId: customerId,
    cardType: (pm.card.brand || "Card").charAt(0).toUpperCase() + (pm.card.brand || "card").slice(1),
    lastFour: pm.card.last4 || "0000",
    expiryMonth: pm.card.exp_month || 0,
    expiryYear: pm.card.exp_year || 0,
    cardholderName: pm.billing_details?.name || `${u.firstName} ${u.lastName}`.trim(),
  });

  const methods = await dbHelpers.getPaymentMethodsByUserId(u.id);
  return NextResponse.json({ paymentMethods: methods, addedId: id });
}

export async function DELETE(request: NextRequest) {
  const token = await getSessionToken();
  if (!token) return NextResponse.json({ message: "Unauthorized." }, { status: 401 });
  const user = await getSessionUser(token);
  if (!user) return NextResponse.json({ message: "Unauthorized." }, { status: 401 });

  const u = user as any;
  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");
  if (!id) {
    return NextResponse.json({ message: "Payment method ID required." }, { status: 400 });
  }

  // Detach from Stripe if it has a token
  const existing = (await dbHelpers.getPaymentMethodById(id, u.id)) as any;
  if (existing?.stripe_payment_method_id) {
    const stripe = getStripe();
    if (stripe) {
      try {
        await stripe.paymentMethods.detach(existing.stripe_payment_method_id);
      } catch (err) {
        console.warn("[payment-methods] failed to detach Stripe pm:", err);
      }
    }
  }

  const deleted = await dbHelpers.deletePaymentMethod(id, u.id);
  if (!deleted) {
    return NextResponse.json({ message: "Payment method not found." }, { status: 404 });
  }

  const methods = await dbHelpers.getPaymentMethodsByUserId(u.id);
  return NextResponse.json({ paymentMethods: methods });
}
