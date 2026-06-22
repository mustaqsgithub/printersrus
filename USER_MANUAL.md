# User Manual - Printers E-Commerce

## Overview

This application is a modern e-commerce storefront for printers and accessories. It supports product browsing, cart and checkout, user accounts, email verification, password reset, and admin-only access.

## Getting Started

1. Install dependencies:
   - `npm install`
2. Configure `.env.local`:
   - `POSTGRES_URL=...`
   - `POSTGRES_PRISMA_URL=...`
   - `POSTGRES_URL_NON_POOLING=...`
   - `NEXT_PUBLIC_STORE_NAME=PrinterHub`
3. Initialize the database:
   - `npm run db:seed`
4. Run the app:
   - `npm run dev`
5. Open:
   - `http://localhost:3000`

## Browsing Products

- Use the header search bar to find products by name or brand.
- Filter by category, sale items, and sort options on the products page.
- Open any product to see details, images, and specifications.

## Cart

- Add items from product pages.
- Update quantities or remove items in the cart page.
- The cart is user-specific:
  - Guests have a guest cart.
  - Signed-in users have a server-backed cart that syncs across devices.
  - On login, the guest cart merges into the user cart (max quantity per item).

## Account and Authentication

### Sign Up

- Go to `/signup` and create an account.
- You will receive a verification link (shown in UI for now).
- Verify your email before signing in.

### Sign In

- Go to `/login`.
- If your email is not verified, a verification link appears.

### Email Verification

- Visit the verification link or go to `/verify?token=...`.
- You can resend the verification email from the account page.

### Password Reset

- Go to `/forgot-password` and request a reset link.
- Use the link to reset your password at `/reset-password?token=...`.

### Account Page

- Open `/account` to view and edit your profile.
- View order history (mock data until orders are fully wired).

## Checkout

- Go to `/checkout`.
- Fill in customer, shipping, and payment details.
- Currently payment is simulated and an order confirmation is shown.

## Admin Access

- Admin-only page: `/admin`
- First-time setup: `/admin/setup` (requires `ADMIN_SETUP_KEY` in `.env.local`)
- Sign in at `/admin/login`
- Use the **Users** tab to create additional admins or reset passwords.

### Bulk Product Import (CSV)

- Go to `/admin` → **Products** → **Bulk Import (CSV)**
- **Required columns**: `SKU`, `Name`, `Price`, `Category`
- **Optional columns**: `Stock`, `Brand`, `Description`, `Slug`, `SalePrice`, `InStock`, `Featured`, `OnSale`, `IsActive`, `LongDescription`, `Images`, `CategoryDescription`, `CategoryImage`
- Column names are case- and punctuation-insensitive (so `SKU`, `sku`, and `S K U` all match). `Product_ID` is accepted as a column and ignored, so you can drop in exports that include it.
- **Category** can be a display name like `Sticky Notes` or a slug — both work. If the category doesn't exist yet, it's auto-created on import.
- **Items are matched by `SKU`:**
  - A **new** SKU is imported immediately with a placeholder image and queued for background enrichment.
  - An **existing** SKU is updated in place — `Price`, `Stock`, and the other declared fields are refreshed. The image, features, and specifications are **not** re-fetched (the item is already enriched).
- The flow is one step:
  1. **Upload** — choose your CSV and click **Import CSV**. New products and any new categories are written straight away, so even thousands of rows import in seconds. Rows with missing required fields or duplicate SKUs are skipped and listed.
  2. **Background enrichment** — for each new item the server fetches a product image (DuckDuckGo, best-fit, near-square, ≥400px) plus **features** and **specifications** scraped from the web, in batches of 25. A progress bar shows how many are enriched / remaining / failed. Use **Retry / resume** to re-queue failures or restart after a server restart.
- Until enrichment finishes, new products are visible on the storefront with a "Image coming soon" placeholder.
- `Description` is optional. If omitted, the product's stored description defaults to the `Name`.
- For `Images`, use pipe-separated URLs (`url1|url2`) or a JSON array string. These are stored as additional gallery images and are not affected by enrichment.
- No row limit — items are written to the database in batches and images/specifications are fetched in the background, so any size CSV works.

## Troubleshooting

### Database not initialized

- Run `npm run db:seed` to create tables and sample data.

### Cannot sign in

- Ensure email is verified.
- Use the reset password flow if needed.

### Cart not syncing

- Confirm you are signed in.
- Check the dev server console for `/api/cart` errors.

## Notes

- Email delivery is simulated by returning verification/reset URLs in API responses.
- Replace this with a real email provider for production (SendGrid, Resend, etc.).
