// Single source of truth for shipping rules — shared by the server-side pricing
// logic (lib/pricing.ts) and the client cart/checkout pages so the threshold
// can never drift between the messaging and the actual totals.
export const FREE_SHIPPING_THRESHOLD = 250;
export const SHIPPING_FLAT_RATE = 8.99;
