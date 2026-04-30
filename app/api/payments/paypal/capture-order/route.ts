import { NextRequest, NextResponse } from "next/server";
import { capturePaypalOrder } from "@/lib/paypal";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => null);
    const orderId = body?.orderId;
    if (!orderId) {
      return NextResponse.json({ message: "Missing orderId." }, { status: 400 });
    }
    const result = await capturePaypalOrder(orderId);
    if (result.status !== "COMPLETED") {
      return NextResponse.json(
        { message: `PayPal capture not completed: ${result.status}` },
        { status: 400 }
      );
    }
    return NextResponse.json({ status: result.status, id: result.id });
  } catch (err: any) {
    console.error("[paypal/capture-order] error", err);
    return NextResponse.json(
      { message: err?.message || "Failed to capture PayPal order." },
      { status: 500 }
    );
  }
}
