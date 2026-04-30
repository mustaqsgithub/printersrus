import Stripe from "stripe";

let _stripe: Stripe | null = null;

export function getStripe(): Stripe {
  if (_stripe) return _stripe;
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) {
    throw new Error("STRIPE_SECRET_KEY is not set");
  }
  _stripe = new Stripe(key);
  return _stripe;
}

// Convert £ to pence (Stripe uses smallest currency unit)
export function toMinorUnits(amount: number, currency: string = "gbp"): number {
  const zeroDecimal = ["bif", "clp", "djf", "gnf", "jpy", "kmf", "krw", "mga", "pyg", "rwf", "ugx", "vnd", "vuv", "xaf", "xof", "xpf"];
  const isZeroDecimal = zeroDecimal.includes(currency.toLowerCase());
  return Math.round(amount * (isZeroDecimal ? 1 : 100));
}

export function fromMinorUnits(amount: number, currency: string = "gbp"): number {
  const zeroDecimal = ["bif", "clp", "djf", "gnf", "jpy", "kmf", "krw", "mga", "pyg", "rwf", "ugx", "vnd", "vuv", "xaf", "xof", "xpf"];
  const isZeroDecimal = zeroDecimal.includes(currency.toLowerCase());
  return amount / (isZeroDecimal ? 1 : 100);
}
