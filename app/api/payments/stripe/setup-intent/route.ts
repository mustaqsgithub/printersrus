import { NextResponse } from "next/server";
import { getStripe } from "@/lib/stripe";
import { getSessionToken } from "@/lib/auth-cookies";
import { getSessionUser } from "@/lib/auth";
import { dbHelpers } from "@/lib/database";

// Creates a SetupIntent so a logged-in user can save a card without paying.
export async function POST() {
  const token = await getSessionToken();
  if (!token) return NextResponse.json({ message: "Unauthorized." }, { status: 401 });
  const user = await getSessionUser(token);
  if (!user) return NextResponse.json({ message: "Unauthorized." }, { status: 401 });

  const u = user as any;
  const stripe = getStripe();

  let customerId = await dbHelpers.getUserStripeCustomerId(u.id);
  if (!customerId) {
    const customer = await stripe.customers.create({
      email: u.email,
      name: `${u.firstName} ${u.lastName}`.trim(),
      metadata: { userId: u.id },
    });
    customerId = customer.id;
    await dbHelpers.setUserStripeCustomerId(u.id, customerId);
  }

  const setupIntent = await stripe.setupIntents.create({
    customer: customerId,
    payment_method_types: ["card"],
    usage: "off_session",
  });

  return NextResponse.json({
    clientSecret: setupIntent.client_secret,
    customerId,
  });
}
