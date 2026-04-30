import { NextRequest, NextResponse } from "next/server";
import { createPaypalOrder } from "@/lib/paypal";
import { priceCart } from "@/lib/pricing";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => null);
    if (!body?.items) {
      return NextResponse.json({ message: "Missing items." }, { status: 400 });
    }

    const priced = await priceCart(body.items);

    const order = await createPaypalOrder({
      items: priced.items.map((i) => ({
        name: i.productName,
        sku: i.productSku,
        quantity: i.quantity,
        unitAmount: i.price,
      })),
      subtotal: priced.subtotal,
      shipping: priced.shippingAmount,
      tax: priced.taxAmount,
      total: priced.totalAmount,
      currency: "GBP",
    });

    return NextResponse.json({
      id: order.id,
      status: order.status,
      amount: priced.totalAmount,
    });
  } catch (err: any) {
    console.error("[paypal/create-order] error", err);
    return NextResponse.json(
      { message: err?.message || "Failed to create PayPal order." },
      { status: 500 }
    );
  }
}
