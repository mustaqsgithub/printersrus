import { NextRequest, NextResponse } from "next/server";
import { dbHelpers } from "@/lib/database";
import { getSessionUser } from "@/lib/auth";
import { getSessionToken } from "@/lib/auth-cookies";

export async function GET(request: NextRequest) {
  const id = request.nextUrl.searchParams.get("id");

  // If an order ID is provided, return that specific order
  if (id) {
    const order = await dbHelpers.getOrderById(id);
    if (!order) {
      return NextResponse.json({ message: "Order not found." }, { status: 404 });
    }
    return NextResponse.json({ order });
  }

  // Otherwise return all orders for the logged-in user
  const token = await getSessionToken();
  if (!token) {
    return NextResponse.json({ message: "Unauthorized." }, { status: 401 });
  }
  const user = await getSessionUser(token);
  if (!user) {
    return NextResponse.json({ message: "Unauthorized." }, { status: 401 });
  }

  const orders = await dbHelpers.getOrdersByEmail((user as any).email);
  return NextResponse.json({ orders });
}
