// SQLite database setup using better-sqlite3
import { getDb } from "./db";
import crypto from "crypto";

// Placeholder shown for freshly-imported products until the background
// enrichment worker fetches a real image. products.main_image is NOT NULL, so
// imported rows are inserted with this value.
export const PLACEHOLDER_IMAGE = "/placeholder-product.svg";

// Initialize database schema
export async function initDatabase() {
  try {
    const db = getDb();

    // Categories table
    db.exec(`
      CREATE TABLE IF NOT EXISTS categories (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        slug TEXT UNIQUE NOT NULL,
        description TEXT,
        image TEXT,
        parent_id TEXT,
        created_at TEXT DEFAULT (datetime('now')),
        updated_at TEXT DEFAULT (datetime('now'))
      )
    `);

    // Products table
    db.exec(`
      CREATE TABLE IF NOT EXISTS products (
        id TEXT PRIMARY KEY,
        sku TEXT UNIQUE NOT NULL,
        name TEXT NOT NULL,
        slug TEXT UNIQUE NOT NULL,
        description TEXT NOT NULL,
        long_description TEXT,
        price REAL NOT NULL,
        sale_price REAL,
        cost REAL,
        in_stock INTEGER DEFAULT 1,
        stock_quantity INTEGER DEFAULT 0,
        low_stock_threshold INTEGER DEFAULT 10,
        main_image TEXT NOT NULL,
        images TEXT,
        meta_title TEXT,
        meta_description TEXT,
        meta_keywords TEXT,
        brand TEXT,
        weight REAL,
        dimensions TEXT,
        category_id TEXT NOT NULL,
        tags TEXT,
        featured INTEGER DEFAULT 0,
        on_sale INTEGER DEFAULT 0,
        is_active INTEGER DEFAULT 1,
        created_at TEXT DEFAULT (datetime('now')),
        updated_at TEXT DEFAULT (datetime('now')),
        FOREIGN KEY (category_id) REFERENCES categories(id)
      )
    `);

    // Orders table
    db.exec(`
      CREATE TABLE IF NOT EXISTS orders (
        id TEXT PRIMARY KEY,
        order_number TEXT UNIQUE NOT NULL,
        customer_email TEXT NOT NULL,
        customer_name TEXT NOT NULL,
        customer_phone TEXT,
        shipping_address TEXT NOT NULL,
        billing_address TEXT NOT NULL,
        status TEXT DEFAULT 'pending',
        payment_status TEXT DEFAULT 'pending',
        payment_method TEXT,
        subtotal REAL NOT NULL,
        tax_amount REAL NOT NULL,
        shipping_amount REAL NOT NULL,
        discount_amount REAL DEFAULT 0,
        total_amount REAL NOT NULL,
        shipping_method TEXT,
        tracking_number TEXT,
        shipped_at TEXT,
        delivered_at TEXT,
        payment_intent_id TEXT,
        paid_at TEXT,
        customer_notes TEXT,
        admin_notes TEXT,
        created_at TEXT DEFAULT (datetime('now')),
        updated_at TEXT DEFAULT (datetime('now'))
      )
    `);

    // Users table
    db.exec(`
      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        first_name TEXT NOT NULL,
        last_name TEXT NOT NULL,
        email TEXT UNIQUE NOT NULL,
        phone TEXT,
        password_hash TEXT NOT NULL,
        role TEXT DEFAULT 'customer',
        email_verified_at TEXT,
        email_notifications INTEGER DEFAULT 1,
        created_at TEXT DEFAULT (datetime('now')),
        updated_at TEXT DEFAULT (datetime('now'))
      )
    `);

    // Sessions table
    db.exec(`
      CREATE TABLE IF NOT EXISTS sessions (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        token_hash TEXT UNIQUE NOT NULL,
        expires_at TEXT NOT NULL,
        created_at TEXT DEFAULT (datetime('now')),
        FOREIGN KEY (user_id) REFERENCES users(id)
      )
    `);

    // Email verification tokens table
    db.exec(`
      CREATE TABLE IF NOT EXISTS email_verification_tokens (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        token_hash TEXT UNIQUE NOT NULL,
        expires_at TEXT NOT NULL,
        created_at TEXT DEFAULT (datetime('now')),
        FOREIGN KEY (user_id) REFERENCES users(id)
      )
    `);

    // Password reset tokens table
    db.exec(`
      CREATE TABLE IF NOT EXISTS password_reset_tokens (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        token_hash TEXT UNIQUE NOT NULL,
        expires_at TEXT NOT NULL,
        created_at TEXT DEFAULT (datetime('now')),
        FOREIGN KEY (user_id) REFERENCES users(id)
      )
    `);

    // Backfill columns if users table existed before (safe no-op via try/catch)
    try { db.exec(`ALTER TABLE users ADD COLUMN role TEXT DEFAULT 'customer'`); } catch {}
    try { db.exec(`ALTER TABLE users ADD COLUMN email_verified_at TEXT`); } catch {}
    try { db.exec(`ALTER TABLE users ADD COLUMN email_notifications INTEGER DEFAULT 1`); } catch {}

    // Carts table
    db.exec(`
      CREATE TABLE IF NOT EXISTS carts (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        status TEXT DEFAULT 'active',
        created_at TEXT DEFAULT (datetime('now')),
        updated_at TEXT DEFAULT (datetime('now')),
        FOREIGN KEY (user_id) REFERENCES users(id)
      )
    `);

    // Cart items table
    db.exec(`
      CREATE TABLE IF NOT EXISTS cart_items (
        id TEXT PRIMARY KEY,
        cart_id TEXT NOT NULL,
        product_id TEXT NOT NULL,
        variant_id TEXT DEFAULT '',
        quantity INTEGER NOT NULL,
        created_at TEXT DEFAULT (datetime('now')),
        updated_at TEXT DEFAULT (datetime('now')),
        FOREIGN KEY (cart_id) REFERENCES carts(id),
        FOREIGN KEY (product_id) REFERENCES products(id),
        UNIQUE (cart_id, product_id, variant_id)
      )
    `);

    // Order items table
    db.exec(`
      CREATE TABLE IF NOT EXISTS order_items (
        id TEXT PRIMARY KEY,
        order_id TEXT NOT NULL,
        product_id TEXT NOT NULL,
        product_name TEXT NOT NULL,
        product_sku TEXT NOT NULL,
        product_image TEXT,
        variant_name TEXT,
        quantity INTEGER NOT NULL,
        price REAL NOT NULL,
        total_price REAL NOT NULL,
        created_at TEXT DEFAULT (datetime('now')),
        FOREIGN KEY (order_id) REFERENCES orders(id),
        FOREIGN KEY (product_id) REFERENCES products(id)
      )
    `);

    // Notifications table
    db.exec(`
      CREATE TABLE IF NOT EXISTS notifications (
        id TEXT PRIMARY KEY,
        user_email TEXT NOT NULL,
        type TEXT NOT NULL,
        title TEXT NOT NULL,
        message TEXT NOT NULL,
        order_id TEXT,
        read INTEGER DEFAULT 0,
        created_at TEXT DEFAULT (datetime('now')),
        FOREIGN KEY (order_id) REFERENCES orders(id)
      )
    `);

    // Payment methods table
    db.exec(`
      CREATE TABLE IF NOT EXISTS payment_methods (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        card_type TEXT NOT NULL,
        last_four TEXT NOT NULL,
        expiry_month INTEGER NOT NULL,
        expiry_year INTEGER NOT NULL,
        cardholder_name TEXT NOT NULL,
        is_default INTEGER DEFAULT 0,
        created_at TEXT DEFAULT (datetime('now')),
        FOREIGN KEY (user_id) REFERENCES users(id)
      )
    `);

    // Add Stripe token columns if missing (additive migration)
    const pmCols = db.prepare(`PRAGMA table_info(payment_methods)`).all() as Array<{ name: string }>;
    const colNames = new Set(pmCols.map((c) => c.name));
    if (!colNames.has("stripe_payment_method_id")) {
      db.exec(`ALTER TABLE payment_methods ADD COLUMN stripe_payment_method_id TEXT`);
    }
    if (!colNames.has("stripe_customer_id")) {
      db.exec(`ALTER TABLE payment_methods ADD COLUMN stripe_customer_id TEXT`);
    }

    // Add stripe_customer_id to users table if missing
    const userCols = db.prepare(`PRAGMA table_info(users)`).all() as Array<{ name: string }>;
    const userColNames = new Set(userCols.map((c) => c.name));
    if (!userColNames.has("stripe_customer_id")) {
      db.exec(`ALTER TABLE users ADD COLUMN stripe_customer_id TEXT`);
    }

    // Add product enrichment columns if missing (additive migration).
    // features/specifications hold scraped JSON; enrichment_status drives the
    // background fetch queue. Existing rows default to 'done' so they are never
    // re-fetched.
    const productCols = db.prepare(`PRAGMA table_info(products)`).all() as Array<{ name: string }>;
    const productColNames = new Set(productCols.map((c) => c.name));
    if (!productColNames.has("features")) {
      db.exec(`ALTER TABLE products ADD COLUMN features TEXT`);
    }
    if (!productColNames.has("specifications")) {
      db.exec(`ALTER TABLE products ADD COLUMN specifications TEXT`);
    }
    if (!productColNames.has("enrichment_status")) {
      db.exec(`ALTER TABLE products ADD COLUMN enrichment_status TEXT DEFAULT 'done'`);
    }
    if (!productColNames.has("enrichment_error")) {
      db.exec(`ALTER TABLE products ADD COLUMN enrichment_error TEXT`);
    }
    if (!productColNames.has("enrichment_attempts")) {
      db.exec(`ALTER TABLE products ADD COLUMN enrichment_attempts INTEGER DEFAULT 0`);
    }

    console.log('Database initialized successfully!');
  } catch (error) {
    console.error('Error initializing database:', error);
    throw error;
  }
}

// Helper functions for database operations
export const dbHelpers = {
  // Categories
  getAllCategories: async () => {
    const db = getDb();
    return db.prepare(`SELECT * FROM categories ORDER BY name`).all();
  },

  getCategoryBySlug: async (slug: string) => {
    const db = getDb();
    return db.prepare(`SELECT * FROM categories WHERE slug = ?`).get(slug) || null;
  },

  // Products
  getAllProducts: async (filters?: {
    category?: string;
    sale?: boolean;
    search?: string;
    brands?: string[];
    minPrice?: number;
    maxPrice?: number;
  }) => {
    const db = getDb();
    const conditions: string[] = ["is_active = 1"];
    const params: any[] = [];

    if (filters?.category) {
      conditions.push("category_id IN (SELECT id FROM categories WHERE slug = ?)");
      params.push(filters.category);
    }
    if (filters?.sale) {
      conditions.push("on_sale = 1");
    }
    if (filters?.search) {
      const searchTerm = `%${filters.search}%`;
      conditions.push("(name LIKE ? COLLATE NOCASE OR description LIKE ? COLLATE NOCASE OR brand LIKE ? COLLATE NOCASE)");
      params.push(searchTerm, searchTerm, searchTerm);
    }
    if (filters?.brands && filters.brands.length > 0) {
      const placeholders = filters.brands.map(() => "?").join(",");
      conditions.push(`brand COLLATE NOCASE IN (${placeholders})`);
      params.push(...filters.brands);
    }
    // Use sale_price when on sale, else price, for the bounds check.
    const effectivePrice = "COALESCE(CASE WHEN on_sale = 1 THEN sale_price END, price)";
    if (typeof filters?.minPrice === "number" && !Number.isNaN(filters.minPrice)) {
      conditions.push(`${effectivePrice} >= ?`);
      params.push(filters.minPrice);
    }
    if (typeof filters?.maxPrice === "number" && !Number.isNaN(filters.maxPrice)) {
      conditions.push(`${effectivePrice} <= ?`);
      params.push(filters.maxPrice);
    }

    const where = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";
    return db.prepare(`SELECT * FROM products ${where} ORDER BY featured DESC, created_at DESC`).all(...params);
  },

  getDistinctBrands: async () => {
    const db = getDb();
    const rows = db
      .prepare(
        `SELECT DISTINCT brand FROM products WHERE is_active = 1 AND brand IS NOT NULL AND TRIM(brand) <> '' ORDER BY brand COLLATE NOCASE`,
      )
      .all() as Array<{ brand: string }>;
    return rows.map((r) => r.brand);
  },

  getProductPriceRange: async () => {
    const db = getDb();
    const row = db
      .prepare(
        `SELECT
           MIN(COALESCE(CASE WHEN on_sale = 1 THEN sale_price END, price)) AS min,
           MAX(COALESCE(CASE WHEN on_sale = 1 THEN sale_price END, price)) AS max
         FROM products WHERE is_active = 1`,
      )
      .get() as { min: number | null; max: number | null } | undefined;
    return {
      min: row?.min ?? 0,
      max: row?.max ?? 0,
    };
  },

  getAllProductsAdmin: async () => {
    const db = getDb();
    return db.prepare(`SELECT * FROM products ORDER BY created_at DESC`).all();
  },

  getProductById: async (id: string) => {
    const db = getDb();
    return db.prepare(`SELECT * FROM products WHERE id = ?`).get(id) || null;
  },

  getProductBySlug: async (slug: string) => {
    const db = getDb();
    return db.prepare(`SELECT * FROM products WHERE slug = ?`).get(slug) || null;
  },

  getFeaturedProducts: async (limit = 8) => {
    const db = getDb();
    return db
      .prepare(`SELECT * FROM products WHERE featured = 1 AND is_active = 1 ORDER BY created_at DESC LIMIT ?`)
      .all(limit);
  },

  // Insert product
  insertProduct: async (product: any) => {
    const db = getDb();
    db.prepare(`
      INSERT INTO products (
        id, sku, name, slug, description, long_description, price, sale_price,
        main_image, images, brand, category_id, in_stock, stock_quantity,
        featured, on_sale, is_active
      ) VALUES (
        ?, ?, ?, ?, ?, ?, ?, ?,
        ?, ?, ?, ?, ?, ?,
        ?, ?, ?
      )
    `).run(
      product.id,
      product.sku,
      product.name,
      product.slug,
      product.description,
      product.longDescription || null,
      product.price,
      product.salePrice || null,
      product.mainImage,
      product.images || null,
      product.brand || null,
      product.categoryId,
      product.inStock ? 1 : 0,
      product.stockQuantity,
      product.featured ? 1 : 0,
      product.onSale ? 1 : 0,
      product.isActive ? 1 : 0
    );
  },

  // Insert category
  insertCategory: async (category: any) => {
    const db = getDb();
    db.prepare(`
      INSERT INTO categories (id, name, slug, description, image, parent_id)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(
      category.id,
      category.name,
      category.slug,
      category.description || null,
      category.image || null,
      category.parentId || null
    );
  },

  updateCategory: async (id: string, updates: any) => {
    const db = getDb();
    const fields: string[] = [];
    const values: any[] = [];

    for (const [key, value] of Object.entries(updates)) {
      fields.push(`${key} = ?`);
      values.push(value);
    }

    const setClause = fields.join(", ");
    values.push(id);

    db.prepare(`UPDATE categories SET ${setClause}, updated_at = datetime('now') WHERE id = ?`).run(...values);
  },

  deleteCategory: async (id: string) => {
    const db = getDb();
    db.prepare(`DELETE FROM categories WHERE id = ?`).run(id);
  },

  // Update product
  updateProduct: async (id: string, updates: any) => {
    const db = getDb();
    const fields: string[] = [];
    const values: any[] = [];

    for (const [key, value] of Object.entries(updates)) {
      fields.push(`${key} = ?`);
      values.push(value);
    }

    const setClause = fields.join(", ");
    values.push(id);

    db.prepare(`UPDATE products SET ${setClause}, updated_at = datetime('now') WHERE id = ?`).run(...values);
  },

  // Delete product
  deleteProduct: async (id: string) => {
    const db = getDb();
    db.prepare(`DELETE FROM products WHERE id = ?`).run(id);
  },

  getProductBySku: async (sku: string) => {
    const db = getDb();
    return db.prepare(`SELECT * FROM products WHERE sku = ?`).get(sku) || null;
  },

  // Load identity/pricing keys for every existing product in one query. Used by
  // bulk import so it can decide insert-vs-update, keep slugs unique, and apply
  // markup idempotently without a point lookup per row (prohibitively slow for
  // very large CSVs).
  getAllProductKeys: async () => {
    const db = getDb();
    const rows = db
      .prepare(`SELECT sku, id, slug, price, cost, sale_price FROM products`)
      .all() as Array<{
      sku: string;
      id: string;
      slug: string;
      price: number;
      cost: number | null;
      sale_price: number | null;
    }>;
    const bySku = new Map<string, (typeof rows)[number]>();
    const slugs = new Set<string>();
    for (const r of rows) {
      bySku.set(r.sku, r);
      slugs.add(r.slug);
    }
    return { bySku, slugs };
  },

  // Insert a product from a bulk import. The image/features/specifications are
  // filled in later by the background enrichment worker, so this inserts a
  // placeholder image and marks the row as pending enrichment.
  insertImportedProduct: async (product: {
    id: string;
    sku: string;
    name: string;
    slug: string;
    description: string;
    longDescription?: string | null;
    price: number;
    salePrice?: number | null;
    brand?: string | null;
    categoryId: string;
    inStock: boolean;
    stockQuantity: number;
    featured: boolean;
    onSale: boolean;
    isActive: boolean;
    images?: string | null;
  }) => {
    const db = getDb();
    db.prepare(`
      INSERT INTO products (
        id, sku, name, slug, description, long_description, price, sale_price,
        main_image, images, brand, category_id, in_stock, stock_quantity,
        featured, on_sale, is_active, enrichment_status, enrichment_attempts
      ) VALUES (
        ?, ?, ?, ?, ?, ?, ?, ?,
        ?, ?, ?, ?, ?, ?,
        ?, ?, ?, 'pending', 0
      )
    `).run(
      product.id,
      product.sku,
      product.name,
      product.slug,
      product.description,
      product.longDescription || null,
      product.price,
      product.salePrice || null,
      PLACEHOLDER_IMAGE,
      product.images || null,
      product.brand || null,
      product.categoryId,
      product.inStock ? 1 : 0,
      product.stockQuantity,
      product.featured ? 1 : 0,
      product.onSale ? 1 : 0,
      product.isActive ? 1 : 0
    );
  },

  // Apply a bulk import (inserts + updates) in chunked transactions so a CSV of
  // any size imports without holding one enormous transaction. Categories must
  // already be resolved to ids by the caller. New products are inserted as
  // pending enrichment with a placeholder image; existing products only get the
  // provided columns updated (never the image/features/specs/enrichment state).
  bulkApplyImport: async (ops: {
    inserts: Array<{
      id: string;
      sku: string;
      name: string;
      slug: string;
      description: string;
      longDescription: string | null;
      price: number;
      salePrice: number | null;
      cost: number | null;
      brand: string | null;
      categoryId: string;
      inStock: boolean;
      stockQuantity: number;
      featured: boolean;
      onSale: boolean;
      isActive: boolean;
      images: string | null;
    }>;
    updates: Array<{ id: string; columns: Record<string, string | number | null> }>;
  }) => {
    const db = getDb();

    const insertStmt = db.prepare(`
      INSERT INTO products (
        id, sku, name, slug, description, long_description, price, sale_price, cost,
        main_image, images, brand, category_id, in_stock, stock_quantity,
        featured, on_sale, is_active, enrichment_status, enrichment_attempts
      ) VALUES (
        @id, @sku, @name, @slug, @description, @long_description, @price, @sale_price, @cost,
        @main_image, @images, @brand, @category_id, @in_stock, @stock_quantity,
        @featured, @on_sale, @is_active, 'pending', 0
      )
    `);

    const CHUNK = 500;
    // Yield to the event loop between chunks so a very large import doesn't
    // block other requests for the whole duration. better-sqlite3 is
    // synchronous, so each chunk still runs to completion, but the gaps let
    // pending I/O (other HTTP requests) make progress.
    const yieldToLoop = () => new Promise<void>((resolve) => setImmediate(resolve));

    const insertChunk = db.transaction((rows: typeof ops.inserts) => {
      for (const p of rows) {
        insertStmt.run({
          id: p.id,
          sku: p.sku,
          name: p.name,
          slug: p.slug,
          description: p.description,
          long_description: p.longDescription || null,
          price: p.price,
          sale_price: p.salePrice ?? null,
          cost: p.cost ?? null,
          main_image: PLACEHOLDER_IMAGE,
          images: p.images || null,
          brand: p.brand || null,
          category_id: p.categoryId,
          in_stock: p.inStock ? 1 : 0,
          stock_quantity: p.stockQuantity,
          featured: p.featured ? 1 : 0,
          on_sale: p.onSale ? 1 : 0,
          is_active: p.isActive ? 1 : 0,
        });
      }
    });

    const updateChunk = db.transaction((rows: typeof ops.updates) => {
      for (const u of rows) {
        const keys = Object.keys(u.columns);
        if (keys.length === 0) continue;
        const setClause = keys.map((k) => `${k} = ?`).join(", ");
        const values = keys.map((k) => u.columns[k]);
        values.push(u.id);
        db.prepare(
          `UPDATE products SET ${setClause}, updated_at = datetime('now') WHERE id = ?`
        ).run(...values);
      }
    });

    for (let i = 0; i < ops.inserts.length; i += CHUNK) {
      insertChunk(ops.inserts.slice(i, i + CHUNK));
      await yieldToLoop();
    }
    for (let i = 0; i < ops.updates.length; i += CHUNK) {
      updateChunk(ops.updates.slice(i, i + CHUNK));
      await yieldToLoop();
    }

    return { created: ops.inserts.length, updated: ops.updates.length };
  },

  // Enrichment queue helpers --------------------------------------------------

  // Reset rows stuck in 'processing' (e.g. after a server restart) back to
  // 'pending' so they get picked up again.
  resetStuckEnrichment: async () => {
    const db = getDb();
    const info = db
      .prepare(`UPDATE products SET enrichment_status = 'pending' WHERE enrichment_status = 'processing'`)
      .run();
    return info.changes;
  },

  // Atomically claim up to `limit` pending products: select + mark 'processing'
  // inside one IMMEDIATE transaction so two concurrent drains (even across
  // connections/processes) can't grab the same rows.
  claimPendingEnrichment: async (limit: number) => {
    const db = getDb();
    const claim = db.transaction((lim: number) => {
      const rows = db
        .prepare(
          `SELECT * FROM products WHERE enrichment_status = 'pending' ORDER BY created_at ASC LIMIT ?`
        )
        .all(lim) as any[];
      if (rows.length > 0) {
        const ids = rows.map((r) => r.id);
        const placeholders = ids.map(() => "?").join(",");
        db.prepare(
          `UPDATE products SET enrichment_status = 'processing', enrichment_attempts = enrichment_attempts + 1 WHERE id IN (${placeholders})`
        ).run(...ids);
      }
      return rows;
    });
    return claim.immediate(limit) as any[];
  },

  setEnrichmentResult: async (
    id: string,
    result: {
      status: "done" | "failed";
      mainImage?: string | null;
      features?: string[] | null;
      specifications?: Record<string, string> | null;
      error?: string | null;
    }
  ) => {
    const db = getDb();
    const fields: string[] = ["enrichment_status = ?", "enrichment_error = ?"];
    const values: any[] = [result.status, result.error || null];

    if (result.mainImage) {
      fields.push("main_image = ?");
      values.push(result.mainImage);
    }
    if (result.features !== undefined) {
      fields.push("features = ?");
      values.push(result.features && result.features.length ? JSON.stringify(result.features) : null);
    }
    if (result.specifications !== undefined) {
      fields.push("specifications = ?");
      values.push(
        result.specifications && Object.keys(result.specifications).length
          ? JSON.stringify(result.specifications)
          : null
      );
    }

    values.push(id);
    db.prepare(
      `UPDATE products SET ${fields.join(", ")}, updated_at = datetime('now') WHERE id = ?`
    ).run(...values);
  },

  // Re-queue failed rows for another enrichment attempt.
  requeueFailedEnrichment: async () => {
    const db = getDb();
    const info = db
      .prepare(`UPDATE products SET enrichment_status = 'pending' WHERE enrichment_status = 'failed'`)
      .run();
    return info.changes;
  },

  countEnrichmentStatuses: async () => {
    const db = getDb();
    const rows = db
      .prepare(
        `SELECT enrichment_status AS status, COUNT(*) AS count FROM products GROUP BY enrichment_status`
      )
      .all() as Array<{ status: string | null; count: number }>;
    const counts = { pending: 0, processing: 0, done: 0, failed: 0, total: 0 };
    for (const row of rows) {
      const key = (row.status || "done") as keyof typeof counts;
      if (key in counts && key !== "total") counts[key] = row.count;
      counts.total += row.count;
    }
    return counts;
  },

  // Orders
  createOrder: async (order: any) => {
    const db = getDb();
    db.prepare(`
      INSERT INTO orders (
        id, order_number, customer_email, customer_name, customer_phone,
        shipping_address, billing_address, subtotal, tax_amount,
        shipping_amount, discount_amount, total_amount, status, payment_status,
        payment_method, payment_intent_id, paid_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      order.id,
      order.orderNumber,
      order.customerEmail,
      order.customerName,
      order.customerPhone || null,
      order.shippingAddress,
      order.billingAddress,
      order.subtotal,
      order.taxAmount,
      order.shippingAmount,
      order.discountAmount || 0,
      order.totalAmount,
      order.status || "pending",
      order.paymentStatus || "pending",
      order.paymentMethod || null,
      order.paymentReference || null,
      order.paymentStatus === "paid" ? new Date().toISOString() : null,
    );
  },

  getAllOrders: async () => {
    const db = getDb();
    return db.prepare(`SELECT * FROM orders ORDER BY created_at DESC`).all();
  },

  getOrdersByEmail: async (email: string) => {
    const db = getDb();
    const orders = db.prepare(
      `SELECT * FROM orders WHERE customer_email = ? ORDER BY created_at DESC`
    ).all(email) as any[];

    // Attach item count to each order
    const countStmt = db.prepare(
      `SELECT COALESCE(SUM(quantity), 0) as item_count FROM order_items WHERE order_id = ?`
    );
    return orders.map((order) => {
      const row = countStmt.get(order.id) as any;
      return { ...order, item_count: row?.item_count ?? 0 };
    });
  },

  updateOrder: async (id: string, updates: any) => {
    const db = getDb();
    const fields: string[] = [];
    const values: any[] = [];

    for (const [key, value] of Object.entries(updates)) {
      fields.push(`${key} = ?`);
      values.push(value);
    }

    const setClause = fields.join(", ");
    values.push(id);

    db.prepare(`UPDATE orders SET ${setClause}, updated_at = datetime('now') WHERE id = ?`).run(...values);
  },

  // Get order by ID
  getOrderById: async (id: string) => {
    const db = getDb();
    const order = db.prepare(`SELECT * FROM orders WHERE id = ?`).get(id) as any;

    if (order) {
      const items = db.prepare(`SELECT * FROM order_items WHERE order_id = ?`).all(id);
      return { ...order, items };
    }
    return null;
  },

  // Cart helpers
  getOrCreateCartId: async (userId: string) => {
    const db = getDb();
    const existing = db.prepare(
      `SELECT id FROM carts WHERE user_id = ? AND status = 'active' LIMIT 1`
    ).get(userId) as any;

    if (existing) {
      return existing.id as string;
    }

    const cartId = crypto.randomUUID();
    db.prepare(`INSERT INTO carts (id, user_id, status) VALUES (?, ?, 'active')`).run(cartId, userId);
    return cartId;
  },

  getCartItemsForUser: async (userId: string) => {
    const db = getDb();
    return db.prepare(`
      SELECT ci.product_id, ci.quantity, ci.variant_id, p.*
      FROM carts c
      JOIN cart_items ci ON ci.cart_id = c.id
      JOIN products p ON p.id = ci.product_id
      WHERE c.user_id = ? AND c.status = 'active'
      ORDER BY ci.created_at ASC
    `).all(userId);
  },

  setCartItemsForUser: async (
    userId: string,
    items: Array<{ productId: string; quantity: number; variantId?: string }>
  ) => {
    const db = getDb();
    const cartId = await dbHelpers.getOrCreateCartId(userId);
    db.prepare(`DELETE FROM cart_items WHERE cart_id = ?`).run(cartId);

    const insert = db.prepare(`
      INSERT INTO cart_items (id, cart_id, product_id, variant_id, quantity)
      VALUES (?, ?, ?, ?, ?)
    `);

    for (const item of items) {
      insert.run(crypto.randomUUID(), cartId, item.productId, item.variantId || "", item.quantity);
    }

    db.prepare(`UPDATE carts SET updated_at = datetime('now') WHERE id = ?`).run(cartId);
    return dbHelpers.getCartItemsForUser(userId);
  },

  clearCartForUser: async (userId: string) => {
    const db = getDb();
    const cartId = await dbHelpers.getOrCreateCartId(userId);
    db.prepare(`DELETE FROM cart_items WHERE cart_id = ?`).run(cartId);
    db.prepare(`UPDATE carts SET updated_at = datetime('now') WHERE id = ?`).run(cartId);
  },

  mergeCartItemsForUser: async (
    userId: string,
    items: Array<{ productId: string; quantity: number; variantId?: string }>
  ) => {
    const db = getDb();
    const cartId = await dbHelpers.getOrCreateCartId(userId);

    const upsert = db.prepare(`
      INSERT INTO cart_items (id, cart_id, product_id, variant_id, quantity)
      VALUES (?, ?, ?, ?, ?)
      ON CONFLICT (cart_id, product_id, variant_id)
      DO UPDATE SET
        quantity = MAX(cart_items.quantity, excluded.quantity),
        updated_at = datetime('now')
    `);

    for (const item of items) {
      upsert.run(crypto.randomUUID(), cartId, item.productId, item.variantId || "", item.quantity);
    }

    db.prepare(`UPDATE carts SET updated_at = datetime('now') WHERE id = ?`).run(cartId);
    return dbHelpers.getCartItemsForUser(userId);
  },

  // Notifications
  createNotification: async (notification: {
    userEmail: string;
    type: string;
    title: string;
    message: string;
    orderId?: string;
  }) => {
    const db = getDb();
    // Only create if user has email_notifications enabled
    const user = db.prepare(
      `SELECT email_notifications FROM users WHERE LOWER(email) = ?`
    ).get(notification.userEmail.toLowerCase()) as any;
    if (user && !user.email_notifications) return null;

    const id = crypto.randomUUID();
    db.prepare(`
      INSERT INTO notifications (id, user_email, type, title, message, order_id)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(
      id,
      notification.userEmail.toLowerCase(),
      notification.type,
      notification.title,
      notification.message,
      notification.orderId || null
    );
    return id;
  },

  getNotificationsByEmail: async (email: string) => {
    const db = getDb();
    return db.prepare(
      `SELECT * FROM notifications WHERE user_email = ? ORDER BY created_at DESC LIMIT 50`
    ).all(email.toLowerCase());
  },

  getUnreadNotificationCount: async (email: string) => {
    const db = getDb();
    const row = db.prepare(
      `SELECT COUNT(*) as count FROM notifications WHERE user_email = ? AND read = 0`
    ).get(email.toLowerCase()) as any;
    return row?.count ?? 0;
  },

  markNotificationRead: async (id: string, email: string) => {
    const db = getDb();
    db.prepare(
      `UPDATE notifications SET read = 1 WHERE id = ? AND user_email = ?`
    ).run(id, email.toLowerCase());
  },

  markAllNotificationsRead: async (email: string) => {
    const db = getDb();
    db.prepare(
      `UPDATE notifications SET read = 1 WHERE user_email = ? AND read = 0`
    ).run(email.toLowerCase());
  },

  // Payment methods
  getPaymentMethodsByUserId: async (userId: string) => {
    const db = getDb();
    return db.prepare(
      `SELECT * FROM payment_methods WHERE user_id = ? ORDER BY is_default DESC, created_at DESC`
    ).all(userId);
  },

  addPaymentMethod: async (pm: {
    userId: string;
    cardType: string;
    lastFour: string;
    expiryMonth: number;
    expiryYear: number;
    cardholderName: string;
  }) => {
    const db = getDb();
    const id = crypto.randomUUID();
    // If this is the first card, make it default
    const existing = db.prepare(
      `SELECT COUNT(*) as count FROM payment_methods WHERE user_id = ?`
    ).get(pm.userId) as any;
    const isDefault = existing.count === 0 ? 1 : 0;

    db.prepare(`
      INSERT INTO payment_methods (id, user_id, card_type, last_four, expiry_month, expiry_year, cardholder_name, is_default)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(id, pm.userId, pm.cardType, pm.lastFour, pm.expiryMonth, pm.expiryYear, pm.cardholderName, isDefault);

    return id;
  },

  deletePaymentMethod: async (id: string, userId: string) => {
    const db = getDb();
    const pm = db.prepare(
      `SELECT * FROM payment_methods WHERE id = ? AND user_id = ?`
    ).get(id, userId) as any;
    if (!pm) return false;

    db.prepare(`DELETE FROM payment_methods WHERE id = ? AND user_id = ?`).run(id, userId);

    // If deleted card was default, promote the next one
    if (pm.is_default) {
      const next = db.prepare(
        `SELECT id FROM payment_methods WHERE user_id = ? ORDER BY created_at ASC LIMIT 1`
      ).get(userId) as any;
      if (next) {
        db.prepare(`UPDATE payment_methods SET is_default = 1 WHERE id = ?`).run(next.id);
      }
    }
    return true;
  },

  setDefaultPaymentMethod: async (id: string, userId: string) => {
    const db = getDb();
    db.prepare(`UPDATE payment_methods SET is_default = 0 WHERE user_id = ?`).run(userId);
    db.prepare(`UPDATE payment_methods SET is_default = 1 WHERE id = ? AND user_id = ?`).run(id, userId);
  },

  // Stripe token-based payment methods
  addStripePaymentMethod: async (pm: {
    userId: string;
    stripePaymentMethodId: string;
    stripeCustomerId: string;
    cardType: string;
    lastFour: string;
    expiryMonth: number;
    expiryYear: number;
    cardholderName: string;
  }) => {
    const db = getDb();
    const id = crypto.randomUUID();
    const existing = db.prepare(
      `SELECT COUNT(*) as count FROM payment_methods WHERE user_id = ?`
    ).get(pm.userId) as any;
    const isDefault = existing.count === 0 ? 1 : 0;
    db.prepare(`
      INSERT INTO payment_methods
        (id, user_id, card_type, last_four, expiry_month, expiry_year, cardholder_name,
         is_default, stripe_payment_method_id, stripe_customer_id)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id,
      pm.userId,
      pm.cardType,
      pm.lastFour,
      pm.expiryMonth,
      pm.expiryYear,
      pm.cardholderName,
      isDefault,
      pm.stripePaymentMethodId,
      pm.stripeCustomerId,
    );
    return id;
  },

  getPaymentMethodById: async (id: string, userId: string) => {
    const db = getDb();
    return db.prepare(
      `SELECT * FROM payment_methods WHERE id = ? AND user_id = ?`
    ).get(id, userId);
  },

  // Stripe customer linkage on users
  getUserStripeCustomerId: async (userId: string): Promise<string | null> => {
    const db = getDb();
    const row = db.prepare(`SELECT stripe_customer_id FROM users WHERE id = ?`).get(userId) as any;
    return row?.stripe_customer_id || null;
  },

  setUserStripeCustomerId: async (userId: string, stripeCustomerId: string) => {
    const db = getDb();
    db.prepare(`UPDATE users SET stripe_customer_id = ? WHERE id = ?`).run(stripeCustomerId, userId);
  },
};

// Note: Database initialization should be called explicitly via initDatabase()
// It's called in the seed script, not automatically on module load
