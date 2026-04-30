import { dbHelpers, initDatabase } from "@/lib/database";

export interface CartItemInput {
  productId: string;
  quantity: number;
  variantId?: string;
}

export interface PricedItem {
  productId: string;
  productName: string;
  productSku: string;
  productImage: string;
  quantity: number;
  price: number;
  totalPrice: number;
}

export interface PricedCart {
  items: PricedItem[];
  subtotal: number;
  shippingAmount: number;
  taxAmount: number;
  totalAmount: number;
  currency: string;
}

// Single source of truth for pricing — used by both checkout and PaymentIntent
// creation so the client cannot tamper with totals.
export async function priceCart(items: CartItemInput[]): Promise<PricedCart> {
  if (!items || items.length === 0) {
    throw new Error("No items in order.");
  }
  await initDatabase();

  let subtotal = 0;
  const priced: PricedItem[] = [];

  for (const item of items) {
    if (!item.productId || !item.quantity || item.quantity < 1) {
      throw new Error("Invalid item in cart.");
    }
    const product = (await dbHelpers.getProductById(item.productId)) as any;
    if (!product) throw new Error(`Product not found: ${item.productId}`);
    const unitPrice = product.sale_price || product.price;
    const lineTotal = unitPrice * item.quantity;
    subtotal += lineTotal;
    priced.push({
      productId: product.id,
      productName: product.name,
      productSku: product.sku,
      productImage: product.main_image,
      quantity: item.quantity,
      price: unitPrice,
      totalPrice: lineTotal,
    });
  }

  const shippingAmount = subtotal > 50 ? 0 : 8.99;
  const taxAmount = round2(subtotal * 0.08);
  const totalAmount = round2(subtotal + shippingAmount + taxAmount);

  return {
    items: priced,
    subtotal: round2(subtotal),
    shippingAmount,
    taxAmount,
    totalAmount,
    currency: "gbp",
  };
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
