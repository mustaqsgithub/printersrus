import { NextRequest, NextResponse } from "next/server";
import { dbHelpers } from "@/lib/database";
import { getSessionToken } from "@/lib/auth-cookies";
import { getSessionUser } from "@/lib/auth";

const toApiProduct = (product: any) => ({
  id: product.id,
  sku: product.sku,
  name: product.name,
  slug: product.slug,
  description: product.description,
  longDescription: product.long_description,
  price: product.price,
  salePrice: product.sale_price,
  mainImage: product.main_image,
  images: product.images,
  brand: product.brand,
  categoryId: product.category_id,
  inStock: Boolean(product.in_stock),
  stockQuantity: product.stock_quantity,
  featured: Boolean(product.featured),
  onSale: Boolean(product.on_sale),
  isActive: Boolean(product.is_active),
  createdAt: product.created_at,
  updatedAt: product.updated_at,
});

const normalizeImages = (value: unknown) => {
  if (!value) return null;
  if (Array.isArray(value)) return JSON.stringify(value);
  if (typeof value === "string") return value;
  return null;
};

const mapProductUpdates = (updates: Record<string, any>) => {
  const mapped: Record<string, any> = {};

  if (updates.name !== undefined) mapped.name = updates.name;
  if (updates.sku !== undefined) mapped.sku = updates.sku;
  if (updates.slug !== undefined) mapped.slug = updates.slug;
  if (updates.description !== undefined) mapped.description = updates.description;
  if (updates.longDescription !== undefined) mapped.long_description = updates.longDescription;
  if (updates.price !== undefined) mapped.price = updates.price;
  if (updates.salePrice !== undefined) mapped.sale_price = updates.salePrice;
  if (updates.mainImage !== undefined) mapped.main_image = updates.mainImage;
  if (updates.images !== undefined) mapped.images = normalizeImages(updates.images);
  if (updates.brand !== undefined) mapped.brand = updates.brand;
  if (updates.categoryId !== undefined) mapped.category_id = updates.categoryId;
  if (updates.inStock !== undefined) mapped.in_stock = updates.inStock ? 1 : 0;
  if (updates.stockQuantity !== undefined) mapped.stock_quantity = updates.stockQuantity;
  if (updates.featured !== undefined) mapped.featured = updates.featured ? 1 : 0;
  if (updates.onSale !== undefined) mapped.on_sale = updates.onSale ? 1 : 0;
  if (updates.isActive !== undefined) mapped.is_active = updates.isActive ? 1 : 0;

  return mapped;
};

const requireAdmin = async () => {
  const token = await getSessionToken();
  if (!token) return null;
  const user = await getSessionUser(token);
  if (!user || user.role !== "admin") return null;
  return user;
};

export async function GET() {
  const admin = await requireAdmin();
  if (!admin) {
    return NextResponse.json({ message: "Unauthorized." }, { status: 401 });
  }

  try {
    const products = await dbHelpers.getAllProductsAdmin();
    return NextResponse.json({ products: products.map(toApiProduct) });
  } catch (error) {
    console.error("Error fetching admin products:", error);
    return NextResponse.json({ message: "Failed to fetch products." }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const admin = await requireAdmin();
  if (!admin) {
    return NextResponse.json({ message: "Unauthorized." }, { status: 401 });
  }

  try {
    const body = await request.json();
    const id = crypto.randomUUID();

    await dbHelpers.insertProduct({
      id,
      sku: body.sku,
      name: body.name,
      slug: body.slug,
      description: body.description,
      longDescription: body.longDescription || null,
      price: Number(body.price),
      salePrice: body.salePrice ? Number(body.salePrice) : null,
      mainImage: body.mainImage,
      images: normalizeImages(body.images),
      brand: body.brand || null,
      categoryId: body.categoryId,
      inStock: body.inStock ?? Number(body.stockQuantity) > 0,
      stockQuantity: Number(body.stockQuantity) || 0,
      featured: Boolean(body.featured),
      onSale: Boolean(body.onSale),
      isActive: body.isActive ?? true,
    });

    return NextResponse.json({ id }, { status: 201 });
  } catch (error) {
    console.error("Error creating product:", error);
    return NextResponse.json({ message: "Failed to create product." }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  const admin = await requireAdmin();
  if (!admin) {
    return NextResponse.json({ message: "Unauthorized." }, { status: 401 });
  }

  try {
    const body = await request.json();
    const id = body.id;
    if (!id) {
      return NextResponse.json({ message: "Product id is required." }, { status: 400 });
    }

    const updates = mapProductUpdates(body.updates || {});
    if (!Object.keys(updates).length) {
      return NextResponse.json({ message: "No updates provided." }, { status: 400 });
    }

    await dbHelpers.updateProduct(id, updates);
    return NextResponse.json({ id });
  } catch (error) {
    console.error("Error updating product:", error);
    return NextResponse.json({ message: "Failed to update product." }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  const admin = await requireAdmin();
  if (!admin) {
    return NextResponse.json({ message: "Unauthorized." }, { status: 401 });
  }

  try {
    const id = request.nextUrl.searchParams.get("id");
    if (!id) {
      return NextResponse.json({ message: "Product id is required." }, { status: 400 });
    }

    await dbHelpers.deleteProduct(id);
    return NextResponse.json({ id });
  } catch (error) {
    console.error("Error deleting product:", error);
    return NextResponse.json({ message: "Failed to delete product." }, { status: 500 });
  }
}
