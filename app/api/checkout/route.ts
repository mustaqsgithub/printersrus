import { NextRequest, NextResponse } from "next/server";
import { initDatabase, dbHelpers } from "@/lib/database";
import { getDb } from "@/lib/db";
import { sendOrderConfirmationEmail } from "@/lib/email";
import { priceCart } from "@/lib/pricing";
import { getStripe, toMinorUnits } from "@/lib/stripe";
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

    const { customer, shippingAddress, billingAddress, items, payment } = body;

    if (!customer?.email || !customer?.firstName || !customer?.lastName) {
      return NextResponse.json({ message: "Missing customer information." }, { status: 400 });
    }
    if (!shippingAddress?.address1 || !shippingAddress?.city || !shippingAddress?.postcode) {
      return NextResponse.json({ message: "Missing shipping address." }, { status: 400 });
    }
    if (!items || items.length === 0) {
      return NextResponse.json({ message: "No items in order." }, { status: 400 });
    }
    if (!payment?.provider) {
      return NextResponse.json({ message: "Missing payment information." }, { status: 400 });
    }

    await initDatabase();
    const db = getDb();

    // Server-side pricing — never trust the client
    const priced = await priceCart(items);

    // Verify payment with the provider before creating the order
    let paymentReference: string;
    let paymentMethod: string;

    if (payment.provider === "stripe") {
      if (!payment.paymentIntentId) {
        return NextResponse.json({ message: "Missing paymentIntentId." }, { status: 400 });
      }
      const stripe = getStripe();
      if (!stripe) {
        return NextResponse.json(
          { message: "Stripe is not configured. Please set STRIPE_SECRET_KEY in environment variables." },
          { status: 503 }
        );
      }
      const intent = await stripe.paymentIntents.retrieve(payment.paymentIntentId);
      if (intent.status !== "succeeded") {
        return NextResponse.json(
          { message: `Payment not completed (status: ${intent.status}).` },
          { status: 400 }
        );
      }
      const expected = toMinorUnits(priced.totalAmount, priced.currency);
      if (intent.amount !== expected || intent.currency !== priced.currency) {
        return NextResponse.json(
          { message: "Payment amount/currency mismatch." },
          { status: 400 }
        );
      }
      paymentReference = intent.id;
      paymentMethod = "stripe";

      // Save payment method if user chose to save it and is logged in
      if (payment.savePaymentMethod && intent.customer && intent.payment_method) {
        try {
          const customerId = typeof intent.customer === "string" ? intent.customer : intent.customer.id;
          const paymentMethodId = typeof intent.payment_method === "string" ? intent.payment_method : intent.payment_method.id;
          
          const user = await dbHelpers.getUserByStripeCustomerId(customerId);
          if (user) {
            const pm = await stripe.paymentMethods.retrieve(paymentMethodId);
            if (pm.type === "card" && pm.card) {
              await dbHelpers.addStripePaymentMethod({
                userId: user.id,
                stripePaymentMethodId: pm.id,
                stripeCustomerId: customerId,
                cardType: pm.card.brand,
                lastFour: pm.card.last4,
                expiryMonth: pm.card.exp_month,
                expiryYear: pm.card.exp_year,
                cardholderName: pm.billing_details?.name || `${customer.firstName} ${customer.lastName}`,
              });
              console.log(`[CHECKOUT] Saved card ****${pm.card.last4} for user ${user.email}`);
            }
          }
        } catch (err) {
          console.error("[CHECKOUT] Failed to save payment method:", err);
          // Don't fail the checkout if saving payment method fails
        }
      }
    } else {
      return NextResponse.json({ message: "Unsupported payment provider." }, { status: 400 });
    }

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
      subtotal: priced.subtotal,
      taxAmount: priced.taxAmount,
      shippingAmount: priced.shippingAmount,
      discountAmount: 0,
      totalAmount: priced.totalAmount,
      status: "pending",
      paymentStatus: "paid",
      paymentMethod,
      paymentReference,
    } as any);

    // Insert order items
    const insertItem = db.prepare(`
      INSERT INTO order_items (id, order_id, product_id, product_name, product_sku, product_image, quantity, price, total_price)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    for (const oi of priced.items) {
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
    const itemSummary = priced.items.length === 1
      ? priced.items[0].productName
      : `${priced.items[0].productName} and ${priced.items.length - 1} other item(s)`;
    await dbHelpers.createNotification({
      userEmail: customer.email,
      type: "order_placed",
      title: "Order Confirmed",
      message: `Your order ${orderNumber} for ${itemSummary} has been placed. Total: £${priced.totalAmount.toFixed(2)}`,
      orderId,
    });

    // Send order confirmation email
    const emailResult = await sendOrderConfirmationEmail({
      orderNumber,
      orderId,
      customerName: `${customer.firstName} ${customer.lastName}`,
      customerEmail: customer.email,
      items: priced.items.map((oi) => ({
        productName: oi.productName,
        quantity: oi.quantity,
        price: oi.price,
        totalPrice: oi.totalPrice,
      })),
      subtotal: priced.subtotal,
      shippingAmount: priced.shippingAmount,
      taxAmount: priced.taxAmount,
      totalAmount: priced.totalAmount,
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
