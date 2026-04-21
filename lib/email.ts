import nodemailer from "nodemailer";

let _transporter: nodemailer.Transporter | null = null;

async function getTransporter(): Promise<nodemailer.Transporter> {
  if (_transporter) return _transporter;

  // Use real SMTP if configured
  if (process.env.SMTP_HOST) {
    _transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT || 587),
      secure: process.env.SMTP_SECURE === "true",
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });
    return _transporter;
  }

  // Use Ethereal test account for development
  const testAccount = await nodemailer.createTestAccount();
  _transporter = nodemailer.createTransport({
    host: testAccount.smtp.host,
    port: testAccount.smtp.port,
    secure: testAccount.smtp.secure,
    auth: {
      user: testAccount.user,
      pass: testAccount.pass,
    },
  });
  return _transporter;
}

const FROM_ADDRESS = process.env.EMAIL_FROM || "PrintersRUs <orders@printersrus.co.uk>";

export interface OrderEmailData {
  orderNumber: string;
  orderId: string;
  customerName: string;
  customerEmail: string;
  items: Array<{
    productName: string;
    quantity: number;
    price: number;
    totalPrice: number;
  }>;
  subtotal: number;
  shippingAmount: number;
  taxAmount: number;
  totalAmount: number;
  shippingAddress: {
    address1: string;
    address2?: string;
    city: string;
    county?: string;
    postcode: string;
    country: string;
  };
}

function buildOrderConfirmationHtml(data: OrderEmailData): string {
  const itemRows = data.items
    .map(
      (item) => `
      <tr>
        <td style="padding:12px 8px;border-bottom:1px solid #e5e7eb;">${item.productName}</td>
        <td style="padding:12px 8px;border-bottom:1px solid #e5e7eb;text-align:center;">${item.quantity}</td>
        <td style="padding:12px 8px;border-bottom:1px solid #e5e7eb;text-align:right;">&pound;${item.price.toFixed(2)}</td>
        <td style="padding:12px 8px;border-bottom:1px solid #e5e7eb;text-align:right;">&pound;${item.totalPrice.toFixed(2)}</td>
      </tr>`
    )
    .join("");

  const addr = data.shippingAddress;
  const addressLines = [
    addr.address1,
    addr.address2,
    addr.city,
    addr.county,
    addr.postcode,
    addr.country === "GB" ? "United Kingdom" : addr.country,
  ]
    .filter(Boolean)
    .join("<br/>");

  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"/></head>
<body style="margin:0;padding:0;background:#f3f4f6;font-family:Arial,Helvetica,sans-serif;">
  <div style="max-width:600px;margin:0 auto;padding:24px;">
    <!-- Header -->
    <div style="background:#2563eb;padding:32px 24px;border-radius:12px 12px 0 0;text-align:center;">
      <h1 style="color:#fff;margin:0;font-size:28px;">PrintersRUs</h1>
      <p style="color:#bfdbfe;margin:8px 0 0;font-size:14px;">Order Confirmation</p>
    </div>

    <!-- Body -->
    <div style="background:#fff;padding:32px 24px;border-radius:0 0 12px 12px;">
      <h2 style="color:#111827;margin:0 0 8px;">Thank you for your order!</h2>
      <p style="color:#4b5563;margin:0 0 24px;">
        Hi ${data.customerName}, your order <strong>#${data.orderNumber}</strong> has been confirmed and is being processed.
      </p>

      <!-- Order Items -->
      <table style="width:100%;border-collapse:collapse;margin-bottom:24px;">
        <thead>
          <tr style="background:#f9fafb;">
            <th style="padding:12px 8px;text-align:left;font-size:13px;color:#6b7280;border-bottom:2px solid #e5e7eb;">Item</th>
            <th style="padding:12px 8px;text-align:center;font-size:13px;color:#6b7280;border-bottom:2px solid #e5e7eb;">Qty</th>
            <th style="padding:12px 8px;text-align:right;font-size:13px;color:#6b7280;border-bottom:2px solid #e5e7eb;">Price</th>
            <th style="padding:12px 8px;text-align:right;font-size:13px;color:#6b7280;border-bottom:2px solid #e5e7eb;">Total</th>
          </tr>
        </thead>
        <tbody>
          ${itemRows}
        </tbody>
      </table>

      <!-- Totals -->
      <table style="width:100%;margin-bottom:24px;">
        <tr>
          <td style="padding:4px 0;color:#4b5563;">Subtotal</td>
          <td style="padding:4px 0;text-align:right;color:#111827;">&pound;${data.subtotal.toFixed(2)}</td>
        </tr>
        <tr>
          <td style="padding:4px 0;color:#4b5563;">Shipping</td>
          <td style="padding:4px 0;text-align:right;color:#111827;">${data.shippingAmount === 0 ? '<span style="color:#16a34a;">FREE</span>' : `&pound;${data.shippingAmount.toFixed(2)}`}</td>
        </tr>
        <tr>
          <td style="padding:4px 0;color:#4b5563;">Tax</td>
          <td style="padding:4px 0;text-align:right;color:#111827;">&pound;${data.taxAmount.toFixed(2)}</td>
        </tr>
        <tr>
          <td style="padding:12px 0 0;font-weight:bold;font-size:18px;color:#111827;border-top:2px solid #e5e7eb;">Total</td>
          <td style="padding:12px 0 0;text-align:right;font-weight:bold;font-size:18px;color:#111827;border-top:2px solid #e5e7eb;">&pound;${data.totalAmount.toFixed(2)}</td>
        </tr>
      </table>

      <!-- Shipping Address -->
      <div style="background:#f9fafb;border-radius:8px;padding:16px;margin-bottom:24px;">
        <h3 style="margin:0 0 8px;font-size:14px;color:#6b7280;">Shipping Address</h3>
        <p style="margin:0;color:#111827;line-height:1.6;">${addressLines}</p>
      </div>

      <!-- CTA -->
      <div style="text-align:center;margin-top:24px;">
        <a href="${process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000"}/orders/${data.orderId}"
           style="display:inline-block;background:#2563eb;color:#fff;padding:14px 32px;border-radius:8px;text-decoration:none;font-weight:bold;">
          View Order Details
        </a>
      </div>
    </div>

    <!-- Footer -->
    <div style="text-align:center;padding:24px;color:#9ca3af;font-size:12px;">
      <p style="margin:0;">PrintersRUs &mdash; Your trusted source for printers and supplies</p>
      <p style="margin:4px 0 0;">This email was sent to ${data.customerEmail}</p>
    </div>
  </div>
</body>
</html>`;
}

function buildOrderConfirmationText(data: OrderEmailData): string {
  const itemLines = data.items
    .map((item) => `  - ${item.productName} x${item.quantity} = £${item.totalPrice.toFixed(2)}`)
    .join("\n");

  const addr = data.shippingAddress;
  const addressStr = [addr.address1, addr.address2, addr.city, addr.county, addr.postcode, addr.country === "GB" ? "United Kingdom" : addr.country]
    .filter(Boolean)
    .join(", ");

  return `Order Confirmation - PrintersRUs

Hi ${data.customerName},

Thank you for your order! Your order #${data.orderNumber} has been confirmed.

Items:
${itemLines}

Subtotal: £${data.subtotal.toFixed(2)}
Shipping: ${data.shippingAmount === 0 ? "FREE" : `£${data.shippingAmount.toFixed(2)}`}
Tax: £${data.taxAmount.toFixed(2)}
Total: £${data.totalAmount.toFixed(2)}

Shipping to: ${addressStr}

View your order: ${process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000"}/orders/${data.orderId}

PrintersRUs - Your trusted source for printers and supplies`;
}

export async function sendOrderConfirmationEmail(data: OrderEmailData): Promise<string | null> {
  try {
    const transporter = await getTransporter();

    const info = await transporter.sendMail({
      from: FROM_ADDRESS,
      to: data.customerEmail,
      subject: `Order Confirmed - #${data.orderNumber}`,
      text: buildOrderConfirmationText(data),
      html: buildOrderConfirmationHtml(data),
    });

    // In development with Ethereal, log the preview URL
    const previewUrl = nodemailer.getTestMessageUrl(info);
    if (previewUrl) {
      console.log(`[EMAIL] Order confirmation sent to ${data.customerEmail}`);
      console.log(`[EMAIL] Preview URL: ${previewUrl}`);
      return previewUrl as string;
    }

    console.log(`[EMAIL] Order confirmation sent to ${data.customerEmail} (messageId: ${info.messageId})`);
    return null;
  } catch (error) {
    console.error("[EMAIL] Failed to send order confirmation:", error);
    return null;
  }
}
