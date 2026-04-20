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
- **Vercel Postgres** (PostgreSQL)
- **Zustand** (State management)

## 📋 Prerequisites

- Node.js 18+
- PostgreSQL database (Supabase, Neon, or Vercel Marketplace)

## 🚀 Quick Start

### 1. Install dependencies

```bash
npm install
```

### 2. Set up database

Choose one:

- **Vercel Marketplace**: Project → Storage → Add Neon/Prisma Postgres
- **Supabase**: [supabase.com](https://supabase.com) → Create project → Copy connection string
- **Neon**: [neon.tech](https://neon.tech) → Create project → Copy connection string

### 3. Configure environment

Create `.env.local`:

```env
POSTGRES_URL=your_connection_string
POSTGRES_PRISMA_URL=your_connection_string
POSTGRES_URL_NON_POOLING=your_connection_string
NEXT_PUBLIC_STORE_NAME=PrinterHub
ADMIN_SETUP_KEY=your_setup_key
```

### 4. Seed database (one-time or reset)

```bash
npm run db:seed
```

### 5. Run development server

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

Uses PostgreSQL with tables: `categories`, `products`, `orders`, `order_items`, `users`, `sessions`.

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
- Required columns:
  - `name`, `sku`, `description`, `price`, `mainImage`, `categorySlug`
- Optional columns:
  - `slug`, `salePrice`, `stockQuantity`, `inStock`, `featured`, `onSale`, `isActive`
  - `brand`, `longDescription`, `images`
  - `categoryName`, `categoryDescription`, `categoryImage`
- For `images`, use pipe-separated URLs (`url1|url2`) or a JSON array string.
- If `categorySlug` does not exist, include `categoryName` to auto-create the category.

### PDF version

- Open `USER_MANUAL.md` in your editor and export/print to PDF, or
- Convert via your preferred Markdown-to-PDF tool.

## 🎨 Customization

**Store name**: Edit `NEXT_PUBLIC_STORE_NAME` in `.env.local`

**Colors**: Edit `tailwind.config.ts`

**Products**: Use the Admin dashboard (or edit `scripts/seed-database.ts` then run `npm run db:seed` for sample data resets).

## 🌐 Deployment

### Vercel (Recommended)

1. Push to GitHub
2. Import on [Vercel](https://vercel.com)
3. Add PostgreSQL database from Marketplace
4. Add environment variables
5. Deploy

Connection strings are auto-provided for Marketplace databases.

## 🐛 Troubleshooting

**Missing connection string error:**

- Ensure `.env.local` exists in project root
- No spaces around `=` in env file
- Restart terminal after creating `.env.local`

**Connection issues:**

- Verify connection string format
- Check database is accessible
- Test connection string with a PostgreSQL client

## 📝 License

MIT License

---

**Built with Next.js, TypeScript, and Tailwind CSS**
