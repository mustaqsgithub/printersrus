import { NextRequest, NextResponse } from "next/server";
import { parse } from "csv-parse/sync";
import { dbHelpers } from "@/lib/database";
import { getSessionToken } from "@/lib/auth-cookies";
import { getSessionUser } from "@/lib/auth";
import { pickBestImage, searchImages, type ImageResult } from "@/lib/image-search";
import { applyMarkup } from "@/lib/markup";

type CsvRow = Record<string, string>;

const MAX_ROWS = 100;
const SEARCH_CONCURRENCY = 5;

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

const buildImageQuery = (description: string, max = 120): string => {
  const cleaned = description.replace(/\s+/g, " ").trim();
  if (cleaned.length <= max) return cleaned;
  const slice = cleaned.slice(0, max);
  const lastSpace = slice.lastIndexOf(" ");
  return lastSpace > max * 0.6 ? slice.slice(0, lastSpace) : slice;
};

export type StagedRow = {
  rowNumber: number;
  include: boolean;
  fields: {
    name: string;
    sku: string;
    slug: string;
    description: string;
    longDescription: string | null;
    price: number;
    salePrice: number | null;
    brand: string | null;
    stockQuantity: number;
    inStock: boolean;
    featured: boolean;
    onSale: boolean;
    isActive: boolean;
    images: string[];
  };
  category: {
    slug: string;
    name: string | null;
    description: string | null;
    image: string | null;
    willCreate: boolean;
  };
  mainImage: string | null;
  candidateImages: ImageResult[];
  errors: string[];
};

async function runWithConcurrency<T, R>(
  items: T[],
  limit: number,
  worker: (item: T, index: number) => Promise<R>
): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let cursor = 0;

  const runners = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (true) {
      const index = cursor;
      cursor += 1;
      if (index >= items.length) return;
      results[index] = await worker(items[index], index);
    }
  });

  await Promise.all(runners);
  return results;
}

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

    if (records.length > MAX_ROWS) {
      return NextResponse.json(
        { message: `Too many rows. Max ${MAX_ROWS} per upload (got ${records.length}).` },
        { status: 400 }
      );
    }

    const staged: StagedRow[] = await runWithConcurrency(
      records,
      SEARCH_CONCURRENCY,
      async (rawRow, index) => {
        const rowNumber = index + 2;
        const errors: string[] = [];
        const row = normalizeRow(rawRow);

        const sku = getField(row, "sku") || "";
        const name = getField(row, "name", "productname", "title") || "";
        const priceStr = getField(row, "price");
        // Store the price 10% above the uploaded CSV value (applied here so the
        // marked-up price is visible in the import preview).
        const price = priceStr ? applyMarkup(parseNumber(priceStr, 0)) : 0;

        const explicitCategorySlug = getField(row, "categoryslug");
        const categoryDisplayName = getField(row, "categoryname", "category");
        const categorySlug = explicitCategorySlug
          ? slugify(explicitCategorySlug)
          : categoryDisplayName
            ? slugify(categoryDisplayName)
            : "";
        const categoryName = categoryDisplayName || null;

        const description = getField(row, "description") || name;
        const slug = getField(row, "slug") || (name ? slugify(name) : "");
        const longDescription = getField(row, "longdescription") || null;
        const brand = getField(row, "brand") || null;

        const stockQuantity = parseNumber(getField(row, "stockquantity", "stock"), 0);
        const inStockField = getField(row, "instock");
        const inStock =
          inStockField !== undefined ? parseBool(inStockField, stockQuantity > 0) : stockQuantity > 0;

        const salePriceStr = getField(row, "saleprice");
        const salePrice = salePriceStr ? applyMarkup(parseNumber(salePriceStr, 0)) : null;
        const featured = parseBool(getField(row, "featured"), false);
        const onSale = parseBool(getField(row, "onsale"), false);
        const isActive = parseBool(getField(row, "isactive"), true);

        const explicitMainImage = getField(row, "mainimage", "image");
        const imagesField = getField(row, "images");
        const categoryDescription = getField(row, "categorydescription") || null;
        const categoryImage = getField(row, "categoryimage") || null;

        if (!sku) errors.push("Missing required field: SKU");
        if (!name) errors.push("Missing required field: Name");
        if (!priceStr) errors.push("Missing required field: Price");
        if (!categorySlug) errors.push("Missing required field: Category");

        let willCreateCategory = false;
        if (categorySlug) {
          const existing = (await dbHelpers.getCategoryBySlug(categorySlug)) as
            | { id: string }
            | null;
          if (!existing) {
            if (!categoryName) {
              errors.push(
                `Category not found: ${categorySlug} (provide a Category name to create it)`
              );
            } else {
              willCreateCategory = true;
            }
          }
        }

        let candidates: ImageResult[] = [];
        let mainImage: string | null = explicitMainImage || null;

        const querySource = description || name || sku || "";
        const imageQuery = querySource ? buildImageQuery(querySource) : "";
        if (imageQuery) {
          try {
            candidates = await searchImages(imageQuery);
          } catch (searchError) {
            console.error(`Image search failed for row ${rowNumber}:`, searchError);
          }

          if (!mainImage) {
            const best = pickBestImage(candidates);
            if (best) {
              mainImage = best.url;
            } else if (candidates.length > 0) {
              mainImage = candidates[0].url;
            } else {
              errors.push("No image found for this product.");
            }
          }
        }

        return {
          rowNumber,
          include: errors.length === 0,
          fields: {
            name,
            sku,
            slug,
            description,
            longDescription,
            price,
            salePrice,
            brand,
            stockQuantity,
            inStock,
            featured,
            onSale,
            isActive,
            images: parseImagesField(imagesField),
          },
          category: {
            slug: categorySlug,
            name: categoryName,
            description: categoryDescription,
            image: categoryImage,
            willCreate: willCreateCategory,
          },
          mainImage,
          candidateImages: candidates,
          errors,
        };
      }
    );

    return NextResponse.json({ rows: staged });
  } catch (error) {
    console.error("Error previewing CSV:", error);
    return NextResponse.json({ message: "Failed to preview CSV." }, { status: 500 });
  }
}
