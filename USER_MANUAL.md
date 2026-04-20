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
- Required columns:
  - `name`, `sku`, `description`, `price`, `mainImage`, `categorySlug`
- Optional columns:
  - `slug`, `salePrice`, `stockQuantity`, `inStock`, `featured`, `onSale`, `isActive`
  - `brand`, `longDescription`, `images`
  - `categoryName`, `categoryDescription`, `categoryImage`
- For `images`, use pipe-separated URLs (`url1|url2`) or a JSON array string.
- If `categorySlug` does not exist, include `categoryName` to create it automatically.

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
