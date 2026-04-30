// Minimal PayPal REST client. Avoids depending on @paypal/paypal-server-sdk
// surface area churn — uses fetch directly against the v2 Orders API.

const SANDBOX = "https://api-m.sandbox.paypal.com";
const LIVE = "https://api-m.paypal.com";

export function paypalBaseUrl(): string {
  return (process.env.PAYPAL_ENV || "sandbox").toLowerCase() === "live" ? LIVE : SANDBOX;
}

let cachedToken: { token: string; expiresAt: number } | null = null;

async function getAccessToken(): Promise<string> {
  if (cachedToken && cachedToken.expiresAt > Date.now() + 30_000) {
    return cachedToken.token;
  }
  const id = process.env.PAYPAL_CLIENT_ID;
  const secret = process.env.PAYPAL_CLIENT_SECRET;
  if (!id || !secret) {
    throw new Error("PAYPAL_CLIENT_ID / PAYPAL_CLIENT_SECRET not set");
  }
  const auth = Buffer.from(`${id}:${secret}`).toString("base64");
  const res = await fetch(`${paypalBaseUrl()}/v1/oauth2/token`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${auth}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
  });
  if (!res.ok) {
    throw new Error(`PayPal auth failed: ${res.status} ${await res.text()}`);
  }
  const data = (await res.json()) as { access_token: string; expires_in: number };
  cachedToken = {
    token: data.access_token,
    expiresAt: Date.now() + data.expires_in * 1000,
  };
  return data.access_token;
}

export interface PaypalOrderItem {
  name: string;
  sku?: string;
  quantity: number;
  unitAmount: number; // in major units (e.g. pounds)
}

export async function createPaypalOrder(opts: {
  items: PaypalOrderItem[];
  subtotal: number;
  shipping: number;
  tax: number;
  total: number;
  currency?: string;
}): Promise<{ id: string; status: string }> {
  const currency = (opts.currency || "GBP").toUpperCase();
  const token = await getAccessToken();
  const body = {
    intent: "CAPTURE",
    purchase_units: [
      {
        amount: {
          currency_code: currency,
          value: opts.total.toFixed(2),
          breakdown: {
            item_total: { currency_code: currency, value: opts.subtotal.toFixed(2) },
            shipping: { currency_code: currency, value: opts.shipping.toFixed(2) },
            tax_total: { currency_code: currency, value: opts.tax.toFixed(2) },
          },
        },
        items: opts.items.map((i) => ({
          name: i.name.slice(0, 127),
          sku: i.sku?.slice(0, 127),
          quantity: String(i.quantity),
          unit_amount: { currency_code: currency, value: i.unitAmount.toFixed(2) },
        })),
      },
    ],
  };

  const res = await fetch(`${paypalBaseUrl()}/v2/checkout/orders`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    throw new Error(`PayPal create order failed: ${res.status} ${await res.text()}`);
  }
  return res.json();
}

export async function capturePaypalOrder(orderId: string): Promise<any> {
  const token = await getAccessToken();
  const res = await fetch(`${paypalBaseUrl()}/v2/checkout/orders/${orderId}/capture`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
  });
  if (!res.ok) {
    throw new Error(`PayPal capture failed: ${res.status} ${await res.text()}`);
  }
  return res.json();
}

export async function getPaypalOrder(orderId: string): Promise<any> {
  const token = await getAccessToken();
  const res = await fetch(`${paypalBaseUrl()}/v2/checkout/orders/${orderId}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    throw new Error(`PayPal get order failed: ${res.status} ${await res.text()}`);
  }
  return res.json();
}
