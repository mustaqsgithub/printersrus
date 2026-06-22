import { NextRequest, NextResponse } from "next/server";
import { dbHelpers } from "@/lib/database";
import { getSessionToken } from "@/lib/auth-cookies";
import { getSessionUser } from "@/lib/auth";
import { isStaffRole } from "@/lib/roles";

const toApiOrder = (order: any) => ({
  id: order.id,
  orderNumber: order.order_number,
  customerEmail: order.customer_email,
  customerName: order.customer_name,
  customerPhone: order.customer_phone,
  shippingAddress: order.shipping_address,
  billingAddress: order.billing_address,
  status: order.status,
  paymentStatus: order.payment_status,
  paymentMethod: order.payment_method,
  subtotal: order.subtotal,
  taxAmount: order.tax_amount,
  shippingAmount: order.shipping_amount,
  discountAmount: order.discount_amount,
  totalAmount: order.total_amount,
  shippingMethod: order.shipping_method,
  trackingNumber: order.tracking_number,
  shippedAt: order.shipped_at,
  deliveredAt: order.delivered_at,
  paidAt: order.paid_at,
  createdAt: order.created_at,
  updatedAt: order.updated_at,
});

const mapOrderUpdates = (updates: Record<string, any>) => {
  const mapped: Record<string, any> = {};

  if (updates.status !== undefined) mapped.status = updates.status;
  if (updates.paymentStatus !== undefined) mapped.payment_status = updates.paymentStatus;
  if (updates.shippingMethod !== undefined) mapped.shipping_method = updates.shippingMethod;
  if (updates.trackingNumber !== undefined) mapped.tracking_number = updates.trackingNumber;
  if (updates.shippedAt !== undefined) mapped.shipped_at = updates.shippedAt;
  if (updates.deliveredAt !== undefined) mapped.delivered_at = updates.deliveredAt;
  if (updates.paidAt !== undefined) mapped.paid_at = updates.paidAt;
  if (updates.adminNotes !== undefined) mapped.admin_notes = updates.adminNotes;

  return mapped;
};

const requireAdmin = async () => {
  const token = await getSessionToken();
  if (!token) return null;
  const user = await getSessionUser(token);
  if (!user || !isStaffRole(user.role)) return null;
  return user;
};

export async function GET() {
  const admin = await requireAdmin();
  if (!admin) {
    return NextResponse.json({ message: "Unauthorized." }, { status: 401 });
  }

  try {
    const orders = await dbHelpers.getAllOrders();
    return NextResponse.json({ orders: orders.map(toApiOrder) });
  } catch (error) {
    console.error("Error fetching admin orders:", error);
    return NextResponse.json({ message: "Failed to fetch orders." }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  const admin = await requireAdmin();
  if (!admin) {
    return NextResponse.json({ message: "Unauthorized." }, { status: 401 });
  }

  try {
    const body = await request.json();
    const id = body.id;
    if (!id) {
      return NextResponse.json({ message: "Order id is required." }, { status: 400 });
    }

    const updates = mapOrderUpdates(body.updates || {});
    if (!Object.keys(updates).length) {
      return NextResponse.json({ message: "No updates provided." }, { status: 400 });
    }

    // Fetch order before update to detect status change
    const orderBefore = await dbHelpers.getOrderById(id);

    await dbHelpers.updateOrder(id, updates);

    // Send notification on status change
    if (orderBefore && updates.status && updates.status !== (orderBefore as any).status) {
      const order = orderBefore as any;
      const statusLabels: Record<string, string> = {
        pending: "Pending",
        processing: "Processing",
        shipped: "Shipped",
        delivered: "Delivered",
        cancelled: "Cancelled",
      };
      const newStatusLabel = statusLabels[updates.status] || updates.status;
      const trackingInfo = updates.tracking_number
        ? ` Tracking: ${updates.tracking_number}`
        : "";

      await dbHelpers.createNotification({
        userEmail: order.customer_email,
        type: "order_status",
        title: `Order ${newStatusLabel}`,
        message: `Your order ${order.order_number} has been updated to ${newStatusLabel}.${trackingInfo}`,
        orderId: id,
      });
    }

    return NextResponse.json({ id });
  } catch (error) {
    console.error("Error updating order:", error);
    return NextResponse.json({ message: "Failed to update order." }, { status: 500 });
  }
}
