import { NextRequest, NextResponse } from "next/server";
import { dbHelpers } from "@/lib/database";
import { getSessionToken } from "@/lib/auth-cookies";
import { getSessionUser } from "@/lib/auth";

const requireAdmin = async () => {
  const token = await getSessionToken();
  if (!token) return null;
  const user = await getSessionUser(token);
  if (!user || user.role !== "admin") return null;
  return user;
};

type IncomingRow = {
  rowNumber: number;
  include: boolean;
  fields: {
    name: string;
    sku: string;
    slug: string;
    description: string;
    longDescription?: string | null;
    price: number;
    salePrice?: number | null;
    brand?: string | null;
    stockQuantity: number;
    inStock: boolean;
    featured: boolean;
    onSale: boolean;
    isActive: boolean;
    images?: string[];
  };
  category: {
    slug: string;
    name?: string | null;
    description?: string | null;
    image?: string | null;
  };
  mainImage: string | null;
};

const normalizeImages = (images: string[] | undefined) => {
  if (!images || images.length === 0) return null;
  return JSON.stringify(images);
};

export async function POST(request: NextRequest) {
  const admin = await requireAdmin();
  if (!admin) {
    return NextResponse.json({ message: "Unauthorized." }, { status: 401 });
  }

  try {
    const body = await request.json().catch(() => null);
    if (!body || !Array.isArray(body.rows)) {
      return NextResponse.json(
        { message: "Invalid request body. Expected { rows: [...] }." },
        { status: 400 }
      );
    }

    const rows = (body.rows as IncomingRow[]).filter((r) => r && r.include !== false);
    if (rows.length === 0) {
      return NextResponse.json(
        { message: "No rows selected for import." },
        { status: 400 }
      );
    }

    const errors: Array<{ row: number; message: string }> = [];
    let createdProducts = 0;
    let createdCategories = 0;

    for (const row of rows) {
      const rowNumber = row.rowNumber;
      const f = row.fields || ({} as IncomingRow["fields"]);
      const c = row.category || ({} as IncomingRow["category"]);

      if (!f.name || !f.sku || !f.slug) {
        errors.push({ row: rowNumber, message: "Missing required product fields (name/sku/slug)." });
        continue;
      }
      if (!c.slug) {
        errors.push({ row: rowNumber, message: "Missing category slug." });
        continue;
      }
      if (!row.mainImage) {
        errors.push({ row: rowNumber, message: "Main image is required." });
        continue;
      }

      try {
        let category = (await dbHelpers.getCategoryBySlug(c.slug)) as
          | { id: string }
          | null;

        if (!category) {
          if (!c.name) {
            errors.push({
              row: rowNumber,
              message: `Category not found: ${c.slug}`,
            });
            continue;
          }
          await dbHelpers.insertCategory({
            id: crypto.randomUUID(),
            name: c.name,
            slug: c.slug,
            description: c.description || null,
            image: c.image || null,
            parentId: null,
          });
          createdCategories += 1;
          category = (await dbHelpers.getCategoryBySlug(c.slug)) as
            | { id: string }
            | null;
        }

        if (!category) {
          errors.push({
            row: rowNumber,
            message: `Failed to resolve category: ${c.slug}`,
          });
          continue;
        }

        await dbHelpers.insertProduct({
          id: crypto.randomUUID(),
          sku: f.sku,
          name: f.name,
          slug: f.slug,
          description: f.description,
          longDescription: f.longDescription || null,
          price: Number(f.price) || 0,
          salePrice: f.salePrice ? Number(f.salePrice) : null,
          mainImage: row.mainImage,
          images: normalizeImages(f.images),
          brand: f.brand || null,
          categoryId: category.id,
          inStock: Boolean(f.inStock),
          stockQuantity: Number(f.stockQuantity) || 0,
          featured: Boolean(f.featured),
          onSale: Boolean(f.onSale),
          isActive: f.isActive ?? true,
        });
        createdProducts += 1;
      } catch (rowError: any) {
        console.error(`Error inserting row ${rowNumber}:`, rowError);
        errors.push({
          row: rowNumber,
          message: rowError?.message || "Failed to insert row.",
        });
      }
    }

    return NextResponse.json({ createdProducts, createdCategories, errors });
  } catch (error) {
    console.error("Error confirming bulk import:", error);
    return NextResponse.json(
      { message: "Failed to confirm bulk import." },
      { status: 500 }
    );
  }
}
