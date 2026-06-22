import { NextRequest, NextResponse } from "next/server";
import { parse } from "csv-parse/sync";
import { dbHelpers } from "@/lib/database";
import { getSessionToken } from "@/lib/auth-cookies";
import { getSessionUser } from "@/lib/auth";
import { isStaffRole } from "@/lib/roles";
import { applyMarkup } from "@/lib/markup";
import { triggerEnrichment } from "@/lib/enrichment";

type CsvRow = Record<string, string>;

const requireAdmin = async () => {
  const token = await getSessionToken();
  if (!token) return null;
  const user = await getSessionUser(token);
  if (!user || !isStaffRole(user.role)) return null;
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

const normKey = (key: string) => key.toLowerCase().replace(/[^a-z0-9]/g, "");

const normalizeRow = (row: CsvRow): CsvRow => {
  const out: CsvRow = {};
  for (const [k, v] of Object.entries(row)) {
    if (k) out[normKey(k)] = v;
  }
  return out;
};

const getField = (row: CsvRow, ...keys: string[]): string | undefined => {
  for (const k of keys) {
    const v = row[normKey(k)];
    if (v !== undefined && v !== null && String(v).trim() !== "") return String(v).trim();
  }
  return undefined;
};

const parseImagesField = (value: string | undefined): string[] => {
  const trimmed = value?.trim();
  if (!trimmed) return [];
  if (trimmed.startsWith("[")) {
    try {
      const arr = JSON.parse(trimmed);
      if (Array.isArray(arr)) return arr.filter((s) => typeof s === "string" && s.trim());
    } catch {
      return [];
    }
    return [];
  }
  return trimmed
    .split("|")
    .map((item) => item.trim())
    .filter(Boolean);
};

type ParsedRow = {
  rowNumber: number;
  sku: string;
  name: string;
  slug: string;
  description: string;
  longDescription: string | null;
  basePrice: number;
  baseSalePrice: number | null;
  brand: string | null;
  stockQuantity: number;
  inStock: boolean;
  featured: boolean;
  onSale: boolean;
  isActive: boolean;
  images: string[];
  categorySlug: string;
  categoryName: string | null;
  categoryDescription: string | null;
  categoryImage: string | null;
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
      return NextResponse.json({ message: `Invalid CSV format: ${details}` }, { status: 400 });
    }

    if (!records.length) {
      return NextResponse.json({ message: "CSV file is empty." }, { status: 400 });
    }

    const errors: Array<{ row: number; message: string }> = [];
    const parsedRows: ParsedRow[] = [];
    const seenSkus = new Set<string>();

    records.forEach((rawRow, index) => {
      const rowNumber = index + 2; // +1 header, +1 for 1-based
      const row = normalizeRow(rawRow);

      const sku = getField(row, "sku") || "";
      const name = getField(row, "name", "productname", "title") || "";
      const priceStr = getField(row, "price");

      const explicitCategorySlug = getField(row, "categoryslug");
      const categoryDisplayName = getField(row, "categoryname", "category");
      const categorySlug = explicitCategorySlug
        ? slugify(explicitCategorySlug)
        : categoryDisplayName
          ? slugify(categoryDisplayName)
          : "";

      const rowErrors: string[] = [];
      if (!sku) rowErrors.push("Missing SKU");
      if (!name) rowErrors.push("Missing Name");
      if (!priceStr) rowErrors.push("Missing Price");
      if (!categorySlug) rowErrors.push("Missing Category");
      if (sku && seenSkus.has(sku)) rowErrors.push(`Duplicate SKU in file: ${sku}`);

      if (rowErrors.length > 0) {
        errors.push({ row: rowNumber, message: rowErrors.join("; ") });
        return;
      }
      seenSkus.add(sku);

      // Keep the raw CSV (supplier/base) price; markup is applied later, after
      // we know whether this is a new product or an existing one (so re-uploads
      // don't compound the markup).
      const basePrice = parseNumber(priceStr, 0);
      const salePriceStr = getField(row, "saleprice");
      const baseSalePrice = salePriceStr ? parseNumber(salePriceStr, 0) : null;
      const stockQuantity = parseNumber(getField(row, "stockquantity", "stock"), 0);
      const inStockField = getField(row, "instock");
      const inStock =
        inStockField !== undefined ? parseBool(inStockField, stockQuantity > 0) : stockQuantity > 0;
      const description = getField(row, "description") || name;
      const slug = getField(row, "slug") || slugify(name);

      parsedRows.push({
        rowNumber,
        sku,
        name,
        slug,
        description,
        longDescription: getField(row, "longdescription") || null,
        basePrice,
        baseSalePrice,
        brand: getField(row, "brand") || null,
        stockQuantity,
        inStock,
        featured: parseBool(getField(row, "featured"), false),
        onSale: parseBool(getField(row, "onsale"), false),
        isActive: parseBool(getField(row, "isactive"), true),
        images: parseImagesField(getField(row, "images")),
        categorySlug,
        categoryName: categoryDisplayName || null,
        categoryDescription: getField(row, "categorydescription") || null,
        categoryImage: getField(row, "categoryimage") || null,
      });
    });

    // Resolve (and create) categories once per distinct slug.
    const categoryIdBySlug = new Map<string, string>();
    let createdCategories = 0;
    const distinctCategories = new Map<string, ParsedRow>();
    for (const r of parsedRows) {
      if (!distinctCategories.has(r.categorySlug)) distinctCategories.set(r.categorySlug, r);
    }

    for (const [slug, sample] of distinctCategories) {
      const existing = (await dbHelpers.getCategoryBySlug(slug)) as { id: string } | null;
      if (existing) {
        categoryIdBySlug.set(slug, existing.id);
        continue;
      }
      if (!sample.categoryName) {
        // Cannot create without a display name; rows in this category will error.
        continue;
      }
      const id = crypto.randomUUID();
      await dbHelpers.insertCategory({
        id,
        name: sample.categoryName,
        slug,
        description: sample.categoryDescription || null,
        image: sample.categoryImage || null,
        parentId: null,
      });
      createdCategories += 1;
      categoryIdBySlug.set(slug, id);
    }

    // Existing products are loaded once up front (sku/slug/price/cost) so we can
    // decide insert-vs-update, keep slugs unique, and apply markup idempotently
    // without a point lookup per row.
    const { bySku: existingBySku, slugs: takenSlugs } = await dbHelpers.getAllProductKeys();

    // Free the current slug of every product being updated, so an unchanged slug
    // doesn't collide with itself during uniquification below.
    for (const r of parsedRows) {
      const existing = existingBySku.get(r.sku);
      if (existing) takenSlugs.delete(existing.slug);
    }

    // Ensure every row gets a slug unique against the DB and the rest of the
    // file (slug is UNIQUE; a collision would otherwise abort a whole batch).
    for (const r of parsedRows) {
      const base = r.slug || slugify(r.name) || r.sku.toLowerCase();
      let candidate = base;
      let n = 2;
      while (takenSlugs.has(candidate)) {
        candidate = `${base}-${n++}`;
      }
      takenSlugs.add(candidate);
      r.slug = candidate;
    }

    // Treat the CSV Price as the supplier/base price: store it in `cost` and the
    // marked-up value in `price`. On re-upload, if the incoming value matches the
    // already-marked-up stored price (and not the stored cost), assume the admin
    // re-exported marked-up prices and keep the values as-is rather than
    // compounding the markup.
    const approxEqual = (a: number, b: number | null | undefined) =>
      b != null && Math.abs(a - b) < 0.005;

    const inserts: Parameters<typeof dbHelpers.bulkApplyImport>[0]["inserts"] = [];
    const updates: Parameters<typeof dbHelpers.bulkApplyImport>[0]["updates"] = [];

    for (const r of parsedRows) {
      const categoryId = categoryIdBySlug.get(r.categorySlug);
      if (!categoryId) {
        errors.push({
          row: r.rowNumber,
          message: `Category not found: ${r.categorySlug} (provide a Category name to create it)`,
        });
        continue;
      }

      const existing = existingBySku.get(r.sku);

      if (existing) {
        // Re-upload: update price/stock and other declared fields only. No image
        // or detail fetching — the item is already enriched.
        const reExportedMarkedUp =
          existing.cost != null &&
          approxEqual(r.basePrice, existing.price) &&
          !approxEqual(r.basePrice, existing.cost);

        const cost = reExportedMarkedUp ? existing.cost : r.basePrice;
        const price = reExportedMarkedUp ? existing.price : applyMarkup(r.basePrice);
        const salePrice = reExportedMarkedUp
          ? existing.sale_price
          : r.baseSalePrice != null
            ? applyMarkup(r.baseSalePrice)
            : null;

        const columns: Record<string, string | number | null> = {
          name: r.name,
          slug: r.slug,
          description: r.description,
          long_description: r.longDescription,
          price,
          sale_price: salePrice,
          cost,
          brand: r.brand,
          category_id: categoryId,
          stock_quantity: r.stockQuantity,
          in_stock: r.inStock ? 1 : 0,
          featured: r.featured ? 1 : 0,
          on_sale: r.onSale ? 1 : 0,
          is_active: r.isActive ? 1 : 0,
        };
        // Only overwrite gallery images when the CSV actually provides them, so a
        // re-upload without an Images column doesn't wipe existing gallery images.
        if (r.images.length) columns.images = JSON.stringify(r.images);

        updates.push({ id: existing.id, columns });
      } else {
        inserts.push({
          id: crypto.randomUUID(),
          sku: r.sku,
          name: r.name,
          slug: r.slug,
          description: r.description,
          longDescription: r.longDescription,
          price: applyMarkup(r.basePrice),
          salePrice: r.baseSalePrice != null ? applyMarkup(r.baseSalePrice) : null,
          cost: r.basePrice,
          brand: r.brand,
          categoryId,
          inStock: r.inStock,
          stockQuantity: r.stockQuantity,
          featured: r.featured,
          onSale: r.onSale,
          isActive: r.isActive,
          images: r.images.length ? JSON.stringify(r.images) : null,
        });
      }
    }

    let created = 0;
    let updated = 0;
    try {
      const result = await dbHelpers.bulkApplyImport({ inserts, updates });
      created = result.created;
      updated = result.updated;
    } catch (applyError: any) {
      console.error("Error applying bulk import:", applyError);
      return NextResponse.json(
        { message: applyError?.message || "Failed to write products." },
        { status: 500 }
      );
    }

    // Kick off background enrichment for the newly inserted (pending) products.
    if (created > 0) {
      triggerEnrichment();
    }

    return NextResponse.json({
      created,
      updated,
      createdCategories,
      pendingEnrichment: created,
      errors,
    });
  } catch (error) {
    console.error("Error processing bulk import:", error);
    return NextResponse.json({ message: "Failed to process bulk import." }, { status: 500 });
  }
}
