import nodemailer from "nodemailer";

let _transporter: nodemailer.Transporter | null = null;
let _transporterVerified = false;

async function getTransporter(): Promise<nodemailer.Transporter> {
  if (_transporter && _transporterVerified) return _transporter;

  // Use real SMTP only when fully configured. If the host is set but the
  // username/password are missing, fall back to Ethereal rather than failing
  // every send with an auth error.
  if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) {
    _transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT || 587),
      secure: process.env.SMTP_SECURE === "true",
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });
  } else {
    // Use Ethereal test account for development
    console.log("[EMAIL] No SMTP configured – creating Ethereal test account...");
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
    console.log("[EMAIL] Ethereal test account ready (emails won't be delivered to real recipients)");
  }

  // Verify the connection works
  try {
    await _transporter.verify();
    _transporterVerified = true;
    console.log("[EMAIL] SMTP connection verified successfully");
  } catch (verifyError) {
    _transporter = null;
    _transporterVerified = false;
    const msg = verifyError instanceof Error ? verifyError.message : String(verifyError);
    throw new Error(`SMTP connection failed: ${msg}`);
  }

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

export interface EmailResult {
  success: boolean;
  previewUrl?: string;
  messageId?: string;
  error?: string;
}

const MAX_RETRIES = 2;
const RETRY_DELAY_MS = 1000;

async function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function sendMailWithRetry(
  to: string,
  subject: string,
  text: string,
  html: string,
  label: string,
): Promise<EmailResult> {
  let lastError: string | undefined;

  for (let attempt = 1; attempt <= MAX_RETRIES + 1; attempt++) {
    try {
      const transporter = await getTransporter();

      const info = await transporter.sendMail({ from: FROM_ADDRESS, to, subject, text, html });

      const previewUrl = nodemailer.getTestMessageUrl(info);
      if (previewUrl) {
        console.log(`[EMAIL] ${label} sent to ${to}`);
        console.log(`[EMAIL] Preview URL: ${previewUrl}`);
        return { success: true, previewUrl: previewUrl as string, messageId: info.messageId };
      }

      console.log(`[EMAIL] ${label} sent to ${to} (messageId: ${info.messageId})`);
      return { success: true, messageId: info.messageId };
    } catch (error) {
      lastError = error instanceof Error ? error.message : String(error);
      console.error(`[EMAIL] Attempt ${attempt}/${MAX_RETRIES + 1} failed for ${to}: ${lastError}`);

      if (lastError.includes("SMTP") || lastError.includes("connect") || lastError.includes("ECONNREFUSED")) {
        _transporter = null;
        _transporterVerified = false;
      }

      if (attempt <= MAX_RETRIES) {
        const delay = RETRY_DELAY_MS * attempt;
        console.log(`[EMAIL] Retrying in ${delay}ms...`);
        await sleep(delay);
      }
    }
  }

  console.error(`[EMAIL] All ${MAX_RETRIES + 1} attempts failed – ${label} to ${to}`);
  return { success: false, error: lastError };
}

export async function sendOrderConfirmationEmail(data: OrderEmailData): Promise<EmailResult> {
  return sendMailWithRetry(
    data.customerEmail,
    `Order Confirmed - #${data.orderNumber}`,
    buildOrderConfirmationText(data),
    buildOrderConfirmationHtml(data),
    "Order confirmation",
  );
}

// ---------------------------------------------------------------------------
// Verification email
// ---------------------------------------------------------------------------

export interface VerificationEmailData {
  recipientEmail: string;
  recipientName: string;
  verificationUrl: string;
}

function buildVerificationHtml(data: VerificationEmailData): string {
  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"/></head>
<body style="margin:0;padding:0;background:#f3f4f6;font-family:Arial,Helvetica,sans-serif;">
  <div style="max-width:600px;margin:0 auto;padding:24px;">
    <!-- Header -->
    <div style="background:#2563eb;padding:32px 24px;border-radius:12px 12px 0 0;text-align:center;">
      <h1 style="color:#fff;margin:0;font-size:28px;">PrintersRUs</h1>
      <p style="color:#bfdbfe;margin:8px 0 0;font-size:14px;">Verify Your Email</p>
    </div>

    <!-- Body -->
    <div style="background:#fff;padding:32px 24px;border-radius:0 0 12px 12px;">
      <h2 style="color:#111827;margin:0 0 8px;">Welcome to PrintersRUs!</h2>
      <p style="color:#4b5563;margin:0 0 24px;">
        Hi ${data.recipientName}, please verify your email address to complete your account setup.
      </p>

      <div style="text-align:center;margin:32px 0;">
        <a href="${data.verificationUrl}"
           style="display:inline-block;background:#2563eb;color:#fff;padding:14px 32px;border-radius:8px;text-decoration:none;font-weight:bold;font-size:16px;">
          Verify Email Address
        </a>
      </div>

      <p style="color:#4b5563;margin:24px 0 0;font-size:13px;">
        Or copy and paste this link in your browser:<br/>
        <span style="word-break:break-all;color:#2563eb;">${data.verificationUrl}</span>
      </p>

      <p style="color:#9ca3af;margin:24px 0 0;font-size:12px;">
        This link expires in 24 hours. If you didn&rsquo;t create an account, you can safely ignore this email.
      </p>
    </div>

    <!-- Footer -->
    <div style="text-align:center;padding:24px;color:#9ca3af;font-size:12px;">
      <p style="margin:0;">PrintersRUs &mdash; Your trusted source for printers and supplies</p>
      <p style="margin:4px 0 0;">This email was sent to ${data.recipientEmail}</p>
    </div>
  </div>
</body>
</html>`;
}

function buildVerificationText(data: VerificationEmailData): string {
  return `Welcome to PrintersRUs!

Hi ${data.recipientName},

Please verify your email address to complete your account setup.

Click here to verify: ${data.verificationUrl}

This link expires in 24 hours. If you didn't create an account, you can safely ignore this email.

PrintersRUs - Your trusted source for printers and supplies`;
}

export async function sendVerificationEmail(data: VerificationEmailData): Promise<EmailResult> {
  return sendMailWithRetry(
    data.recipientEmail,
    "Verify Your Email - PrintersRUs",
    buildVerificationText(data),
    buildVerificationHtml(data),
    "Verification email",
  );
}

// ---------------------------------------------------------------------------
// Admin invite email
// ---------------------------------------------------------------------------

export interface AdminInviteEmailData {
  recipientEmail: string;
  inviteUrl: string;
  existingAccount?: boolean;
}

function buildAdminInviteHtml(data: AdminInviteEmailData): string {
  const intro = data.existingAccount
    ? "You've been invited to join the PrintersRUs admin team. Click below and sign in with your existing account to activate your admin access."
    : "You've been invited to join the PrintersRUs admin team. Click below to set up your account and choose your own password.";
  const buttonLabel = data.existingAccount ? "Activate Admin Access" : "Set Up Your Account";
  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"/></head>
<body style="margin:0;padding:0;background:#f3f4f6;font-family:Arial,Helvetica,sans-serif;">
  <div style="max-width:600px;margin:0 auto;padding:24px;">
    <!-- Header -->
    <div style="background:#2563eb;padding:32px 24px;border-radius:12px 12px 0 0;text-align:center;">
      <h1 style="color:#fff;margin:0;font-size:28px;">PrintersRUs</h1>
      <p style="color:#bfdbfe;margin:8px 0 0;font-size:14px;">Admin Invitation</p>
    </div>

    <!-- Body -->
    <div style="background:#fff;padding:32px 24px;border-radius:0 0 12px 12px;">
      <h2 style="color:#111827;margin:0 0 8px;">You're invited to be an admin</h2>
      <p style="color:#4b5563;margin:0 0 24px;">${intro}</p>

      <div style="text-align:center;margin:32px 0;">
        <a href="${data.inviteUrl}"
           style="display:inline-block;background:#2563eb;color:#fff;padding:14px 32px;border-radius:8px;text-decoration:none;font-weight:bold;font-size:16px;">
          ${buttonLabel}
        </a>
      </div>

      <p style="color:#4b5563;margin:24px 0 0;font-size:13px;">
        Or copy and paste this link in your browser:<br/>
        <span style="word-break:break-all;color:#2563eb;">${data.inviteUrl}</span>
      </p>

      <p style="color:#9ca3af;margin:24px 0 0;font-size:12px;">
        This invitation expires in 7 days. If you weren&rsquo;t expecting this, you can safely ignore this email.
      </p>
    </div>

    <!-- Footer -->
    <div style="text-align:center;padding:24px;color:#9ca3af;font-size:12px;">
      <p style="margin:0;">PrintersRUs &mdash; Your trusted source for printers and supplies</p>
      <p style="margin:4px 0 0;">This email was sent to ${data.recipientEmail}</p>
    </div>
  </div>
</body>
</html>`;
}

function buildAdminInviteText(data: AdminInviteEmailData): string {
  const intro = data.existingAccount
    ? "You've been invited to join the PrintersRUs admin team. Open the link below and sign in with your existing account to activate your admin access."
    : "You've been invited to join the PrintersRUs admin team. Open the link below to set up your account and choose your own password.";
  return `You're invited to be a PrintersRUs admin

${intro}

${data.inviteUrl}

This invitation expires in 7 days. If you weren't expecting this, you can safely ignore this email.

PrintersRUs - Your trusted source for printers and supplies`;
}

export async function sendAdminInviteEmail(data: AdminInviteEmailData): Promise<EmailResult> {
  return sendMailWithRetry(
    data.recipientEmail,
    "You're invited to be a PrintersRUs admin",
    buildAdminInviteText(data),
    buildAdminInviteHtml(data),
    "Admin invite",
  );
}

// ---------------------------------------------------------------------------
// Password reset email
// ---------------------------------------------------------------------------

export interface PasswordResetEmailData {
  recipientEmail: string;
  recipientName: string;
  resetUrl: string;
}

function buildPasswordResetHtml(data: PasswordResetEmailData): string {
  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"/></head>
<body style="margin:0;padding:0;background:#f3f4f6;font-family:Arial,Helvetica,sans-serif;">
  <div style="max-width:600px;margin:0 auto;padding:24px;">
    <!-- Header -->
    <div style="background:#2563eb;padding:32px 24px;border-radius:12px 12px 0 0;text-align:center;">
      <h1 style="color:#fff;margin:0;font-size:28px;">PrintersRUs</h1>
      <p style="color:#bfdbfe;margin:8px 0 0;font-size:14px;">Password Reset</p>
    </div>

    <!-- Body -->
    <div style="background:#fff;padding:32px 24px;border-radius:0 0 12px 12px;">
      <h2 style="color:#111827;margin:0 0 8px;">Reset your password</h2>
      <p style="color:#4b5563;margin:0 0 24px;">
        Hi ${data.recipientName}, we received a request to reset your password. Click the button below to choose a new one.
      </p>

      <div style="text-align:center;margin:32px 0;">
        <a href="${data.resetUrl}"
           style="display:inline-block;background:#2563eb;color:#fff;padding:14px 32px;border-radius:8px;text-decoration:none;font-weight:bold;font-size:16px;">
          Reset Password
        </a>
      </div>

      <p style="color:#4b5563;margin:24px 0 0;font-size:13px;">
        Or copy and paste this link in your browser:<br/>
        <span style="word-break:break-all;color:#2563eb;">${data.resetUrl}</span>
      </p>

      <p style="color:#9ca3af;margin:24px 0 0;font-size:12px;">
        This link expires in 1 hour. If you didn&rsquo;t request a password reset, you can safely ignore this email.
      </p>
    </div>

    <!-- Footer -->
    <div style="text-align:center;padding:24px;color:#9ca3af;font-size:12px;">
      <p style="margin:0;">PrintersRUs &mdash; Your trusted source for printers and supplies</p>
      <p style="margin:4px 0 0;">This email was sent to ${data.recipientEmail}</p>
    </div>
  </div>
</body>
</html>`;
}

function buildPasswordResetText(data: PasswordResetEmailData): string {
  return `Reset your PrintersRUs password

Hi ${data.recipientName},

We received a request to reset your password. Click the link below to choose a new one.

${data.resetUrl}

This link expires in 1 hour. If you didn't request a password reset, you can safely ignore this email.

PrintersRUs - Your trusted source for printers and supplies`;
}

export async function sendPasswordResetEmail(data: PasswordResetEmailData): Promise<EmailResult> {
  return sendMailWithRetry(
    data.recipientEmail,
    "Reset your password - PrintersRUs",
    buildPasswordResetText(data),
    buildPasswordResetHtml(data),
    "Password reset",
  );
}
