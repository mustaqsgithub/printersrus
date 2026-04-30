import { NextRequest, NextResponse } from "next/server";
import { initDatabase, dbHelpers } from "@/lib/database";
import { getDb } from "@/lib/db";
import { sendOrderConfirmationEmail } from "@/lib/email";
import crypto from "crypto";

interface AddressInput {
  address1: string;
  address2?: string;
  city: string;
  county?: string;
  postcode: string;
  country: string;
}

function formatAddress(addr: AddressInput): string {
  return JSON.stringify(addr);
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => null);
    if (!body) {
      return NextResponse.json({ message: "Invalid request body." }, { status: 400 });
    }

    const { customer, shippingAddress, billingAddress, items } = body;

    if (!customer?.email || !customer?.firstName || !customer?.lastName) {
      return NextResponse.json({ message: "Missing customer information." }, { status: 400 });
    }
    if (!shippingAddress?.address1 || !shippingAddress?.city || !shippingAddress?.postcode) {
      return NextResponse.json({ message: "Missing shipping address." }, { status: 400 });
    }
    if (!items || items.length === 0) {
      return NextResponse.json({ message: "No items in order." }, { status: 400 });
    }

    await initDatabase();
    const db = getDb();

    // Look up products and calculate totals
    let subtotal = 0;
    const orderItems: Array<{
      productId: string;
      productName: string;
      productSku: string;
      productImage: string;
      quantity: number;
      price: number;
      totalPrice: number;
    }> = [];

    for (const item of items) {
      const product = await dbHelpers.getProductById(item.productId);
      if (!product) {
        return NextResponse.json(
          { message: `Product not found: ${item.productId}` },
          { status: 400 }
        );
      }
      const p = product as any;
      const unitPrice = p.sale_price || p.price;
      const lineTotal = unitPrice * item.quantity;
      subtotal += lineTotal;

      orderItems.push({
        productId: p.id,
        productName: p.name,
        productSku: p.sku,
        productImage: p.main_image,
        quantity: item.quantity,
        price: unitPrice,
        totalPrice: lineTotal,
      });
    }

    const shippingAmount = subtotal > 50 ? 0 : 8.99;
    const taxAmount = subtotal * 0.08;
    const totalAmount = subtotal + shippingAmount + taxAmount;

    const orderId = crypto.randomUUID();
    const orderNumber = `PR-${Date.now().toString(36).toUpperCase()}`;

    // Create the order
    await dbHelpers.createOrder({
      id: orderId,
      orderNumber,
      customerEmail: customer.email,
      customerName: `${customer.firstName} ${customer.lastName}`,
      customerPhone: customer.phone || null,
      shippingAddress: formatAddress(shippingAddress),
      billingAddress: formatAddress(billingAddress || shippingAddress),
      subtotal,
      taxAmount,
      shippingAmount,
      discountAmount: 0,
      totalAmount,
      status: "pending",
      paymentStatus: "paid",
    });

    // Insert order items
    const insertItem = db.prepare(`
      INSERT INTO order_items (id, order_id, product_id, product_name, product_sku, product_image, quantity, price, total_price)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    for (const oi of orderItems) {
      insertItem.run(
        crypto.randomUUID(),
        orderId,
        oi.productId,
        oi.productName,
        oi.productSku,
        oi.productImage,
        oi.quantity,
        oi.price,
        oi.totalPrice
      );
    }

    // Send order confirmation notification
    const itemSummary = orderItems.length === 1
      ? orderItems[0].productName
      : `${orderItems[0].productName} and ${orderItems.length - 1} other item(s)`;
    await dbHelpers.createNotification({
      userEmail: customer.email,
      type: "order_placed",
      title: "Order Confirmed",
      message: `Your order ${orderNumber} for ${itemSummary} has been placed. Total: £${totalAmount.toFixed(2)}`,
      orderId,
    });

    // Send order confirmation email
    const emailResult = await sendOrderConfirmationEmail({
      orderNumber,
      orderId,
      customerName: `${customer.firstName} ${customer.lastName}`,
      customerEmail: customer.email,
      items: orderItems.map((oi) => ({
        productName: oi.productName,
        quantity: oi.quantity,
        price: oi.price,
        totalPrice: oi.totalPrice,
      })),
      subtotal,
      shippingAmount,
      taxAmount,
      totalAmount,
      shippingAddress,
    });

    if (!emailResult.success) {
      console.error(`[CHECKOUT] Email failed for order ${orderNumber}: ${emailResult.error}`);
    }

    return NextResponse.json({
      orderId,
      orderNumber,
      emailPreviewUrl: emailResult.previewUrl || null,
      emailSent: emailResult.success,
    });
  } catch (error) {
    console.error("Checkout error:", error);
    return NextResponse.json({ message: "Checkout failed." }, { status: 500 });
  }
}
