// Vercel Postgres database setup
// Note: Make sure POSTGRES_URL environment variable is set before using this module
import { sql } from "@vercel/postgres";
import crypto from "crypto";

// Initialize database schema
export async function initDatabase() {
  try {
    // Categories table
    await sql`
      CREATE TABLE IF NOT EXISTS categories (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        slug TEXT UNIQUE NOT NULL,
        description TEXT,
        image TEXT,
        parent_id TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `;

    // Products table
    await sql`
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
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (category_id) REFERENCES categories(id)
      )
    `;

    // Orders table
    await sql`
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
        shipped_at TIMESTAMP,
        delivered_at TIMESTAMP,
        payment_intent_id TEXT,
        paid_at TIMESTAMP,
        customer_notes TEXT,
        admin_notes TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `;

    // Users table
    await sql`
      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        first_name TEXT NOT NULL,
        last_name TEXT NOT NULL,
        email TEXT UNIQUE NOT NULL,
        phone TEXT,
        password_hash TEXT NOT NULL,
        role TEXT DEFAULT 'customer',
        email_verified_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `;

    // Sessions table
    await sql`
      CREATE TABLE IF NOT EXISTS sessions (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        token_hash TEXT UNIQUE NOT NULL,
        expires_at TIMESTAMP NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id)
      )
    `;

    // Email verification tokens table
    await sql`
      CREATE TABLE IF NOT EXISTS email_verification_tokens (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        token_hash TEXT UNIQUE NOT NULL,
        expires_at TIMESTAMP NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id)
      )
    `;

    // Password reset tokens table
    await sql`
      CREATE TABLE IF NOT EXISTS password_reset_tokens (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        token_hash TEXT UNIQUE NOT NULL,
        expires_at TIMESTAMP NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id)
      )
    `;

    // Backfill columns if users table existed before
    await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'customer'`;
    await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS email_verified_at TIMESTAMP`;

    // Carts table
    await sql`
      CREATE TABLE IF NOT EXISTS carts (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        status TEXT DEFAULT 'active',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id)
      )
    `;

    // Cart items table
    await sql`
      CREATE TABLE IF NOT EXISTS cart_items (
        id TEXT PRIMARY KEY,
        cart_id TEXT NOT NULL,
        product_id TEXT NOT NULL,
        variant_id TEXT DEFAULT '',
        quantity INTEGER NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (cart_id) REFERENCES carts(id),
        FOREIGN KEY (product_id) REFERENCES products(id),
        UNIQUE (cart_id, product_id, variant_id)
      )
    `;

    // Order items table
    await sql`
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
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (order_id) REFERENCES orders(id),
        FOREIGN KEY (product_id) REFERENCES products(id)
      )
    `;

    console.log('✅ Database initialized successfully!');
  } catch (error) {
    console.error('Error initializing database:', error);
    throw error;
  }
}

// Helper functions for database operations
export const dbHelpers = {
  // Categories
  getAllCategories: async () => {
    const result = await sql`SELECT * FROM categories ORDER BY name`;
    return result.rows;
  },

  getCategoryBySlug: async (slug: string) => {
    const result = await sql`SELECT * FROM categories WHERE slug = ${slug}`;
    return result.rows[0] || null;
  },

  // Products
  getAllProducts: async (filters?: { category?: string; sale?: boolean; search?: string }) => {
    let result;
    
    if (filters?.category && filters?.sale && filters?.search) {
      const searchTerm = `%${filters.search}%`;
      result = await sql`
        SELECT * FROM products 
        WHERE is_active = 1 
        AND category_id IN (SELECT id FROM categories WHERE slug = ${filters.category})
        AND on_sale = 1
        AND (name ILIKE ${searchTerm} OR description ILIKE ${searchTerm} OR brand ILIKE ${searchTerm})
        ORDER BY featured DESC, created_at DESC
      `;
    } else if (filters?.category && filters?.sale) {
      result = await sql`
        SELECT * FROM products 
        WHERE is_active = 1 
        AND category_id IN (SELECT id FROM categories WHERE slug = ${filters.category})
        AND on_sale = 1
        ORDER BY featured DESC, created_at DESC
      `;
    } else if (filters?.category && filters?.search) {
      const searchTerm = `%${filters.search}%`;
      result = await sql`
        SELECT * FROM products 
        WHERE is_active = 1 
        AND category_id IN (SELECT id FROM categories WHERE slug = ${filters.category})
        AND (name ILIKE ${searchTerm} OR description ILIKE ${searchTerm} OR brand ILIKE ${searchTerm})
        ORDER BY featured DESC, created_at DESC
      `;
    } else if (filters?.sale && filters?.search) {
      const searchTerm = `%${filters.search}%`;
      result = await sql`
        SELECT * FROM products 
        WHERE is_active = 1 
        AND on_sale = 1
        AND (name ILIKE ${searchTerm} OR description ILIKE ${searchTerm} OR brand ILIKE ${searchTerm})
        ORDER BY featured DESC, created_at DESC
      `;
    } else if (filters?.category) {
      result = await sql`
        SELECT * FROM products 
        WHERE is_active = 1 
        AND category_id IN (SELECT id FROM categories WHERE slug = ${filters.category})
        ORDER BY featured DESC, created_at DESC
      `;
    } else if (filters?.sale) {
      result = await sql`
        SELECT * FROM products 
        WHERE is_active = 1 
        AND on_sale = 1
        ORDER BY featured DESC, created_at DESC
      `;
    } else if (filters?.search) {
      const searchTerm = `%${filters.search}%`;
      result = await sql`
        SELECT * FROM products 
        WHERE is_active = 1 
        AND (name ILIKE ${searchTerm} OR description ILIKE ${searchTerm} OR brand ILIKE ${searchTerm})
        ORDER BY featured DESC, created_at DESC
      `;
    } else {
      result = await sql`
        SELECT * FROM products 
        WHERE is_active = 1 
        ORDER BY featured DESC, created_at DESC
      `;
    }
    
    return result.rows;
  },

  getAllProductsAdmin: async () => {
    const result = await sql`SELECT * FROM products ORDER BY created_at DESC`;
    return result.rows;
  },

  getProductById: async (id: string) => {
    const result = await sql`SELECT * FROM products WHERE id = ${id}`;
    return result.rows[0] || null;
  },

  getProductBySlug: async (slug: string) => {
    const result = await sql`SELECT * FROM products WHERE slug = ${slug}`;
    return result.rows[0] || null;
  },

  getFeaturedProducts: async (limit = 8) => {
    const result = await sql`
      SELECT * FROM products 
      WHERE featured = 1 AND is_active = 1 
      ORDER BY created_at DESC 
      LIMIT ${limit}
    `;
    return result.rows;
  },

  // Insert product
  insertProduct: async (product: any) => {
    const result = await sql`
      INSERT INTO products (
        id, sku, name, slug, description, long_description, price, sale_price,
        main_image, images, brand, category_id, in_stock, stock_quantity,
        featured, on_sale, is_active
      ) VALUES (
        ${product.id},
        ${product.sku},
        ${product.name},
        ${product.slug},
        ${product.description},
        ${product.longDescription || null},
        ${product.price},
        ${product.salePrice || null},
        ${product.mainImage},
        ${product.images || null},
        ${product.brand || null},
        ${product.categoryId},
        ${product.inStock ? 1 : 0},
        ${product.stockQuantity},
        ${product.featured ? 1 : 0},
        ${product.onSale ? 1 : 0},
        ${product.isActive ? 1 : 0}
      )
    `;
    return result;
  },

  // Insert category
  insertCategory: async (category: any) => {
    const result = await sql`
      INSERT INTO categories (id, name, slug, description, image, parent_id)
      VALUES (
        ${category.id},
        ${category.name},
        ${category.slug},
        ${category.description || null},
        ${category.image || null},
        ${category.parentId || null}
      )
    `;
    return result;
  },

  updateCategory: async (id: string, updates: any) => {
    const fields: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    for (const [key, value] of Object.entries(updates)) {
      fields.push(`${key} = $${paramIndex}`);
      values.push(value);
      paramIndex++;
    }

    const setClause = fields.join(", ");
    values.push(id);

    const query = `UPDATE categories SET ${setClause}, updated_at = CURRENT_TIMESTAMP WHERE id = $${paramIndex}`;
    const result = await sql.query(query, values);
    return result;
  },

  deleteCategory: async (id: string) => {
    const result = await sql`DELETE FROM categories WHERE id = ${id}`;
    return result;
  },

  // Update product
  updateProduct: async (id: string, updates: any) => {
    const fields: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;
    
    for (const [key, value] of Object.entries(updates)) {
      fields.push(`${key} = $${paramIndex}`);
      values.push(value);
      paramIndex++;
    }
    
    const setClause = fields.join(', ');
    values.push(id);
    
    const query = `UPDATE products SET ${setClause}, updated_at = CURRENT_TIMESTAMP WHERE id = $${paramIndex}`;
    const result = await sql.query(query, values);
    return result;
  },

  // Delete product
  deleteProduct: async (id: string) => {
    const result = await sql`DELETE FROM products WHERE id = ${id}`;
    return result;
  },

  // Orders
  createOrder: async (order: any) => {
    const result = await sql`
      INSERT INTO orders (
        id, order_number, customer_email, customer_name, customer_phone,
        shipping_address, billing_address, subtotal, tax_amount,
        shipping_amount, discount_amount, total_amount, status, payment_status
      ) VALUES (
        ${order.id},
        ${order.orderNumber},
        ${order.customerEmail},
        ${order.customerName},
        ${order.customerPhone || null},
        ${order.shippingAddress},
        ${order.billingAddress},
        ${order.subtotal},
        ${order.taxAmount},
        ${order.shippingAmount},
        ${order.discountAmount || 0},
        ${order.totalAmount},
        ${order.status || 'pending'},
        ${order.paymentStatus || 'pending'}
      )
    `;
    return result;
  },

  getAllOrders: async () => {
    const result = await sql`SELECT * FROM orders ORDER BY created_at DESC`;
    return result.rows;
  },

  updateOrder: async (id: string, updates: any) => {
    const fields: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    for (const [key, value] of Object.entries(updates)) {
      fields.push(`${key} = $${paramIndex}`);
      values.push(value);
      paramIndex++;
    }

    const setClause = fields.join(", ");
    values.push(id);

    const query = `UPDATE orders SET ${setClause}, updated_at = CURRENT_TIMESTAMP WHERE id = $${paramIndex}`;
    const result = await sql.query(query, values);
    return result;
  },

  // Get order by ID
  getOrderById: async (id: string) => {
    const orderResult = await sql`SELECT * FROM orders WHERE id = ${id}`;
    const order = orderResult.rows[0];
    
    if (order) {
      const itemsResult = await sql`SELECT * FROM order_items WHERE order_id = ${id}`;
      return { ...order, items: itemsResult.rows };
    }
    return null;
  },

  // Cart helpers
  getOrCreateCartId: async (userId: string) => {
    const existing = await sql`
      SELECT id FROM carts WHERE user_id = ${userId} AND status = 'active' LIMIT 1
    `;
    if (existing.rows[0]) {
      return existing.rows[0].id as string;
    }
    const cartId = crypto.randomUUID();
    await sql`
      INSERT INTO carts (id, user_id, status)
      VALUES (${cartId}, ${userId}, 'active')
    `;
    return cartId;
  },

  getCartItemsForUser: async (userId: string) => {
    const result = await sql`
      SELECT ci.product_id, ci.quantity, ci.variant_id, p.*
      FROM carts c
      JOIN cart_items ci ON ci.cart_id = c.id
      JOIN products p ON p.id = ci.product_id
      WHERE c.user_id = ${userId} AND c.status = 'active'
      ORDER BY ci.created_at ASC
    `;
    return result.rows;
  },

  setCartItemsForUser: async (
    userId: string,
    items: Array<{ productId: string; quantity: number; variantId?: string }>
  ) => {
    const cartId = await dbHelpers.getOrCreateCartId(userId);
    await sql`DELETE FROM cart_items WHERE cart_id = ${cartId}`;

    for (const item of items) {
      await sql`
        INSERT INTO cart_items (id, cart_id, product_id, variant_id, quantity)
        VALUES (
          ${crypto.randomUUID()},
          ${cartId},
          ${item.productId},
          ${item.variantId || ""},
          ${item.quantity}
        )
      `;
    }

    await sql`UPDATE carts SET updated_at = CURRENT_TIMESTAMP WHERE id = ${cartId}`;
    return dbHelpers.getCartItemsForUser(userId);
  },

  clearCartForUser: async (userId: string) => {
    const cartId = await dbHelpers.getOrCreateCartId(userId);
    await sql`DELETE FROM cart_items WHERE cart_id = ${cartId}`;
    await sql`UPDATE carts SET updated_at = CURRENT_TIMESTAMP WHERE id = ${cartId}`;
  },

  mergeCartItemsForUser: async (
    userId: string,
    items: Array<{ productId: string; quantity: number; variantId?: string }>
  ) => {
    const cartId = await dbHelpers.getOrCreateCartId(userId);

    for (const item of items) {
      await sql`
        INSERT INTO cart_items (id, cart_id, product_id, variant_id, quantity)
        VALUES (
          ${crypto.randomUUID()},
          ${cartId},
          ${item.productId},
          ${item.variantId || ""},
          ${item.quantity}
        )
        ON CONFLICT (cart_id, product_id, variant_id)
        DO UPDATE SET
          quantity = GREATEST(cart_items.quantity, EXCLUDED.quantity),
          updated_at = CURRENT_TIMESTAMP
      `;
    }

    await sql`UPDATE carts SET updated_at = CURRENT_TIMESTAMP WHERE id = ${cartId}`;
    return dbHelpers.getCartItemsForUser(userId);
  },
};

// Note: Database initialization should be called explicitly via initDatabase()
// It's called in the seed script, not automatically on module load
