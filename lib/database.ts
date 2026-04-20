// SQLite database setup using better-sqlite3
import { getDb } from "./db";
import crypto from "crypto";

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
  getAllProducts: async (filters?: { category?: string; sale?: boolean; search?: string }) => {
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

    const where = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";
    return db.prepare(`SELECT * FROM products ${where} ORDER BY featured DESC, created_at DESC`).all(...params);
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

  // Orders
  createOrder: async (order: any) => {
    const db = getDb();
    db.prepare(`
      INSERT INTO orders (
        id, order_number, customer_email, customer_name, customer_phone,
        shipping_address, billing_address, subtotal, tax_amount,
        shipping_amount, discount_amount, total_amount, status, payment_status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
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
      order.paymentStatus || "pending"
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
};

// Note: Database initialization should be called explicitly via initDatabase()
// It's called in the seed script, not automatically on module load
