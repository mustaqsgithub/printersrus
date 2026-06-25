// Retail markup applied to prices imported via the admin CSV bulk import.
// Uploaded prices are stored 10% higher than the CSV value, so the catalogue,
// cart, and checkout all show the marked-up price. Applied once at import time
// (in the bulk-import preview step) so admins see the final price before
// confirming.
export const PRICE_MARKUP_MULTIPLIER = 1.1;

// Apply the markup and round to 2 decimal places. Returns null for null input
// so an absent sale price stays absent.
export function applyMarkup(value: number): number;
export function applyMarkup(value: number | null): number | null;
export function applyMarkup(value: number | null): number | null {
  if (value === null || !Number.isFinite(value)) return value;
  return Math.round(value * PRICE_MARKUP_MULTIPLIER * 100) / 100;
}
