# Printers E-Commerce Platform

A modern e-commerce web application for selling printers, ink, toner, and accessories. Built with Next.js 16, React 19, TypeScript, and Tailwind CSS.

## 🚀 Features

- Product catalog with search and filters
- Shopping cart with persistent storage
- Product detail pages with image gallery
- Checkout flow
- Responsive design
- SEO optimized

## 🛠️ Tech Stack

- **Next.js 16** (App Router)
- **React 19** & **TypeScript**
- **Tailwind CSS**
- **SQLite** (via better-sqlite3)
- **Zustand** (State management)

## 📋 Prerequisites

- Node.js 18+

## 🚀 Quick Start

### 1. Install dependencies

```bash
npm install
```

### 2. Configure environment

Create `.env.local`:

```env
NEXT_PUBLIC_STORE_NAME=PrinterHub
ADMIN_SETUP_KEY=your_setup_key
```

### 3. Seed database (one-time or reset)

```bash
npm run db:seed
```

### 4. Run development server

```bash
npm run dev
```

Visit [http://localhost:3000](http://localhost:3000)

## 🔧 Available Scripts

```bash
npm run dev          # Start dev server
npm run build        # Build for production
npm start            # Start production server
npm run db:seed      # Seed database
npm run db:reset     # Reset and reseed database
npm run lint         # Run ESLint
```

## 🗄️ Database

Uses SQLite (via better-sqlite3) stored at `data/printers.db` with tables: `categories`, `products`, `orders`, `order_items`, `users`, `sessions`.

Use `npm run db:seed` only for first-time setup or to reset sample data.
After that, manage products and categories from the Admin dashboard.

## 📖 User Manual

See `USER_MANUAL.md` for setup, storefront usage, auth flows, cart behavior, and admin access.

## 🧑‍💼 Admin Access

- First-time setup: `http://localhost:3000/admin/setup` (requires `ADMIN_SETUP_KEY`)
- Admin login: `http://localhost:3000/admin/login`
- Admin dashboard: `http://localhost:3000/admin`

### Bulk Product Import (CSV)

- Go to `/admin` → **Products** → **Bulk Import (CSV)**
- **Required columns**: `SKU`, `Name`, `Price`, `Category`
- **Optional columns**: `Stock`, `Brand`, `Description`, `Slug`, `SalePrice`, `InStock`, `Featured`, `OnSale`, `IsActive`, `LongDescription`, `Images`, `CategoryDescription`, `CategoryImage`
- **Header parsing**: Column names are case- and punctuation-insensitive — `SKU`, `sku`, `S K U` all match. `Product_ID` is accepted as a column and ignored.
- **Category**: Provide a display name (e.g. `Sticky Notes`) or a slug. We slugify it automatically. If the slug doesn't exist yet, the category is auto-created using the display name.
- **SKU-based upsert**: New SKUs are inserted immediately with a placeholder image; existing SKUs are updated in place (price/stock/fields) without re-fetching anything.
- **Background enrichment**: After import, new items are processed in batches of 25 — each gets an auto-picked image (DuckDuckGo, best-fit, near-square, ≥400px) plus web-scraped features and specifications. A progress bar tracks enriched/remaining/failed, with a **Retry / resume** action.
- **Description fallback**: If `Description` is empty, the product's stored description defaults to the `Name`.
- **One-step flow**: Upload CSV → products and categories are written immediately → enrichment runs in the background. New products are visible right away with a placeholder image.
- For `Images`, use pipe-separated URLs (`url1|url2`) or a JSON array string (stored as gallery images, not touched by enrichment).
- No row limit — writes are batched (500/transaction) and enrichment runs 25 at a time, so any size CSV works.

### PDF version

- Open `USER_MANUAL.md` in your editor and export/print to PDF, or
- Convert via your preferred Markdown-to-PDF tool.

## 🎨 Customization

**Store name**: Edit `NEXT_PUBLIC_STORE_NAME` in `.env.local`

**Colors**: Edit `tailwind.config.ts`

**Products**: Use the Admin dashboard (or edit `scripts/seed-database.ts` then run `npm run db:seed` for sample data resets).

## 🌐 Deployment

### AWS EC2

1. Push to GitHub
2. Deploy to an EC2 instance
3. Configure your domain (e.g. via GoDaddy)
4. Set up nginx with SSL
5. Add environment variables and start the app

## 🐛 Troubleshooting

**Database issues:**

- Ensure `data/` directory exists and is writable
- Run `npm run db:seed` to create and populate the database
- Delete `data/printers.db` and reseed if the schema is corrupted

## 📝 License

MIT License

---

**Built with Next.js, TypeScript, and Tailwind CSS**
