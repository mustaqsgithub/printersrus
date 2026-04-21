import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { getSessionToken } from "@/lib/auth-cookies";
import { dbHelpers } from "@/lib/database";

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

export async function POST(request: NextRequest) {
  const token = await getSessionToken();
  if (!token) {
    return NextResponse.json({ message: "Unauthorized." }, { status: 401 });
  }
  const user = await getSessionUser(token);
  if (!user) {
    return NextResponse.json({ message: "Unauthorized." }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  if (!body) {
    return NextResponse.json({ message: "Invalid request body." }, { status: 400 });
  }

  const { cardNumber, expiryMonth, expiryYear, cardholderName } = body;

  if (!cardNumber || !expiryMonth || !expiryYear || !cardholderName) {
    return NextResponse.json({ message: "All fields are required." }, { status: 400 });
  }

  const cleaned = cardNumber.replace(/\s/g, "");
  if (!/^\d{13,19}$/.test(cleaned)) {
    return NextResponse.json({ message: "Invalid card number." }, { status: 400 });
  }

  const month = parseInt(expiryMonth, 10);
  const year = parseInt(expiryYear, 10);
  if (month < 1 || month > 12) {
    return NextResponse.json({ message: "Invalid expiry month." }, { status: 400 });
  }
  const currentYear = new Date().getFullYear() % 100;
  const currentMonth = new Date().getMonth() + 1;
  if (year < currentYear || (year === currentYear && month < currentMonth)) {
    return NextResponse.json({ message: "Card has expired." }, { status: 400 });
  }

  // Detect card type from first digits
  let cardType = "Card";
  if (/^4/.test(cleaned)) cardType = "Visa";
  else if (/^5[1-5]/.test(cleaned) || /^2[2-7]/.test(cleaned)) cardType = "Mastercard";
  else if (/^3[47]/.test(cleaned)) cardType = "Amex";

  const lastFour = cleaned.slice(-4);

  const id = await dbHelpers.addPaymentMethod({
    userId: (user as any).id,
    cardType,
    lastFour,
    expiryMonth: month,
    expiryYear: year,
    cardholderName: cardholderName.trim(),
  });

  const methods = await dbHelpers.getPaymentMethodsByUserId((user as any).id);
  return NextResponse.json({ paymentMethods: methods, addedId: id });
}

export async function DELETE(request: NextRequest) {
  const token = await getSessionToken();
  if (!token) {
    return NextResponse.json({ message: "Unauthorized." }, { status: 401 });
  }
  const user = await getSessionUser(token);
  if (!user) {
    return NextResponse.json({ message: "Unauthorized." }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");
  if (!id) {
    return NextResponse.json({ message: "Payment method ID required." }, { status: 400 });
  }

  const deleted = await dbHelpers.deletePaymentMethod(id, (user as any).id);
  if (!deleted) {
    return NextResponse.json({ message: "Payment method not found." }, { status: 404 });
  }

  const methods = await dbHelpers.getPaymentMethodsByUserId((user as any).id);
  return NextResponse.json({ paymentMethods: methods });
}
