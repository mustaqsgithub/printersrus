import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { getSessionToken } from "@/lib/auth-cookies";
import { dbHelpers } from "@/lib/database";

const toProduct = (row: any) => ({
  id: row.id,
  sku: row.sku,
  name: row.name,
  slug: row.slug,
  description: row.description,
  longDescription: row.long_description,
  price: Number(row.price),
  salePrice: row.sale_price !== null ? Number(row.sale_price) : null,
  mainImage: row.main_image,
  images: row.images,
  brand: row.brand,
  categoryId: row.category_id,
  inStock: Boolean(row.in_stock),
  stockQuantity: Number(row.stock_quantity),
  featured: Boolean(row.featured),
  onSale: Boolean(row.on_sale),
  isActive: Boolean(row.is_active),
  createdAt: new Date(row.created_at),
  updatedAt: new Date(row.updated_at),
  rating: row.rating ?? undefined,
  reviewCount: row.review_count ?? undefined,
});

const toCartItems = (rows: any[]) =>
  rows.map((row) => ({
    product: toProduct(row),
    quantity: Number(row.quantity),
    variantId: row.variant_id || undefined,
  }));

const requireUser = async () => {
  const token = await getSessionToken();
  if (!token) {
    return null;
  }
  return getSessionUser(token);
};

export async function GET() {
  const user = await requireUser();
  if (!user) {
    return NextResponse.json({ message: "Unauthorized." }, { status: 401 });
  }

  const rows = await dbHelpers.getCartItemsForUser(user.id);
  return NextResponse.json({ items: toCartItems(rows) });
}

export async function PUT(request: NextRequest) {
  const user = await requireUser();
  if (!user) {
    return NextResponse.json({ message: "Unauthorized." }, { status: 401 });
  }

  const mode = request.nextUrl.searchParams.get("mode") || "replace";
  const body = await request.json().catch(() => null);
  if (!body?.items || !Array.isArray(body.items)) {
    return NextResponse.json({ message: "Invalid cart payload." }, { status: 400 });
  }

  const cleanItems = body.items
    .filter((item: any) => item?.productId && item?.quantity)
    .map((item: any) => ({
      productId: String(item.productId),
      quantity: Math.max(1, Number(item.quantity)),
      variantId: item.variantId ? String(item.variantId) : undefined,
    }));

  const rows =
    mode === "merge"
      ? await dbHelpers.mergeCartItemsForUser(user.id, cleanItems)
      : await dbHelpers.setCartItemsForUser(user.id, cleanItems);
  return NextResponse.json({ items: toCartItems(rows) });
}

export async function DELETE() {
  const user = await requireUser();
  if (!user) {
    return NextResponse.json({ message: "Unauthorized." }, { status: 401 });
  }

  await dbHelpers.clearCartForUser(user.id);
  return NextResponse.json({ items: [] });
}
