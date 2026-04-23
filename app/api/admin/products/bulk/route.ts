import { NextRequest, NextResponse } from "next/server";
import { parse } from "csv-parse/sync";
import { dbHelpers } from "@/lib/database";
import { getSessionToken } from "@/lib/auth-cookies";
import { getSessionUser } from "@/lib/auth";

type CsvRow = Record<string, string>;

const requireAdmin = async () => {
  const token = await getSessionToken();
  if (!token) return null;
  const user = await getSessionUser(token);
  if (!user || user.role !== "admin") return null;
  return user;
};

const slugify = (value: string) =>
  value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

const parseBool = (value: string | undefined, defaultValue = false) => {
  if (value === undefined || value === null || value === "") return defaultValue;
  const normalized = value.toString().trim().toLowerCase();
  return ["true", "1", "yes", "y"].includes(normalized);
};

const parseNumber = (value: string | undefined, defaultValue = 0) => {
  if (value === undefined || value === null || value === "") return defaultValue;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : defaultValue;
};

export async function POST(request: NextRequest) {
  const admin = await requireAdmin();
  if (!admin) {
    return NextResponse.json({ message: "Unauthorized." }, { status: 401 });
  }

  try {
    const formData = await request.formData();
    const file = formData.get("file");
    if (!(file instanceof File)) {
      return NextResponse.json({ message: "CSV file is required." }, { status: 400 });
    }

    const text = await file.text();
    let records: CsvRow[] = [];
    try {
      records = parse(text, {
        columns: true,
        skip_empty_lines: true,
        trim: true,
        relax_quotes: true,
      }) as CsvRow[];
    } catch (parseError: any) {
      const details = parseError?.message || "Invalid CSV format.";
      return NextResponse.json(
        { message: `Invalid CSV format: ${details}` },
        { status: 400 }
      );
    }

    if (!records.length) {
      return NextResponse.json({ message: "CSV file is empty." }, { status: 400 });
    }

    const errors: Array<{ row: number; message: string }> = [];
    let createdProducts = 0;
    let createdCategories = 0;

    for (let index = 0; index < records.length; index += 1) {
      const rowNumber = index + 2;
      const row = records[index];

      const name = row.name?.trim();
      const sku = row.sku?.trim();
      const slug = row.slug?.trim() || (name ? slugify(name) : "");
      const description = row.description?.trim() || "";
      const mainImage = row.mainImage?.trim();
      const categorySlug = row.categorySlug?.trim() || (row.categoryName ? slugify(row.categoryName) : "");
      const categoryName = row.categoryName?.trim();

      if (!name || !sku || !slug || !description || !mainImage || !categorySlug) {
        errors.push({ row: rowNumber, message: "Missing required fields." });
        continue;
      }

      let category = await dbHelpers.getCategoryBySlug(categorySlug) as { id: string } | null;
      if (!category) {
        if (!categoryName) {
          errors.push({ row: rowNumber, message: `Category not found: ${categorySlug}` });
          continue;
        }
        await dbHelpers.insertCategory({
          id: crypto.randomUUID(),
          name: categoryName,
          slug: categorySlug,
          description: row.categoryDescription || null,
          image: row.categoryImage || null,
          parentId: null,
        });
        createdCategories += 1;
        category = await dbHelpers.getCategoryBySlug(categorySlug) as { id: string } | null;
      }

      if (!category) {
        errors.push({ row: rowNumber, message: `Failed to resolve category: ${categorySlug}` });
        continue;
      }

      const stockQuantity = parseNumber(row.stockQuantity, 0);
      const inStock = parseBool(row.inStock, stockQuantity > 0);

      const imagesValue = row.images?.trim();
      const images =
        imagesValue && imagesValue.startsWith("[")
          ? imagesValue
          : imagesValue
            ? JSON.stringify(
                imagesValue
                  .split("|")
                  .map((item) => item.trim())
                  .filter(Boolean)
              )
            : null;

      await dbHelpers.insertProduct({
        id: crypto.randomUUID(),
        sku,
        name,
        slug,
        description,
        longDescription: row.longDescription || null,
        price: parseNumber(row.price, 0),
        salePrice: row.salePrice ? parseNumber(row.salePrice, 0) : null,
        mainImage,
        images,
        brand: row.brand || null,
        categoryId: category.id,
        inStock,
        stockQuantity,
        featured: parseBool(row.featured, false),
        onSale: parseBool(row.onSale, false),
        isActive: parseBool(row.isActive, true),
      });
      createdProducts += 1;
    }

    return NextResponse.json({
      createdProducts,
      createdCategories,
      errors,
    });
  } catch (error) {
    console.error("Error importing CSV:", error);
    return NextResponse.json({ message: "Failed to import CSV." }, { status: 500 });
  }
}
