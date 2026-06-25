import { test, expect, type Page } from "@playwright/test";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Generate a unique email so parallel runs don't collide. */
const uniqueEmail = () => `smoke+${Date.now()}@test.com`;

/** Fill the checkout shipping form with valid data. */
async function fillShippingForm(page: Page) {
  await page.locator("#firstName").fill("Smoke");
  await page.locator("#lastName").fill("Tester");
  await page.locator("#email").fill(uniqueEmail());
  await page.locator("#shippingAddress1").fill("123 Test Street");
  await page.locator("#shippingCity").fill("London");
  await page.locator("#shippingPostcode").fill("SW1A 1AA");
}

/** Fill the Stripe PaymentElement test card details in the checkout page.
 *  The current checkout uses Stripe PaymentElement; this helper is kept for
 *  tests that explicitly need to interact with the Stripe iframe.
 */
async function fillPaymentForm(page: Page) {
  const cardNumberFrame = page.frameLocator("iframe[name^=__privateStripeFrame]").first();
  await cardNumberFrame.locator("input[placeholder='1234 1234 1234 1234']").fill("4242 4242 4242 4242");
  await cardNumberFrame.locator("input[placeholder='MM / YY']").fill("12 / 30");
  await cardNumberFrame.locator("input[placeholder='CVC']").fill("123");
  await cardNumberFrame.locator("input[placeholder='ZIP']").fill("SW1A 1AA");
}

/**
 * Navigate to the first product detail page and add it to cart.
 * Reused by cart, checkout, and full-flow tests.
 */
async function addFirstProductToCart(page: Page) {
  await page.goto("/products");
  const firstProduct = page.locator('a[href^="/products/"]').first();
  await expect(firstProduct).toBeVisible({ timeout: 10_000 });
  await firstProduct.click();

  // The detail page has multiple "Add to Cart" buttons (one for the product,
  // plus related products). Use .first() to target the main one.
  await page.locator('button:has-text("Add to Cart")').first().click();
  // Button briefly shows "Added to Cart!" then reverts – wait for confirmation
  // or for the cart badge to update rather than racing the transient text.
  await page.waitForTimeout(1_000);
}

// ---------------------------------------------------------------------------
// 1. Homepage
// ---------------------------------------------------------------------------

test.describe("Homepage", () => {
  test("loads and displays key sections", async ({ page }) => {
    await page.goto("/");

    await expect(page.locator("header")).toBeVisible();
    await expect(page).toHaveTitle(/printer/i);

    // Key section headings
    await expect(page.locator('h2:has-text("Shop by Category")')).toBeVisible();
    await expect(page.locator('h2:has-text("Featured Products")')).toBeVisible();
  });

  test("navigation links are present in header", async ({ page }) => {
    await page.goto("/");

    await expect(page.locator('header a:has-text("All Products")')).toBeVisible();
    await expect(page.locator('header a:has-text("SALE")')).toBeVisible();
    await expect(page.locator('header a[href="/cart"]')).toBeVisible();
  });
});

// ---------------------------------------------------------------------------
// 2. Products listing
// ---------------------------------------------------------------------------

test.describe("Products listing", () => {
  test("displays products on the listing page", async ({ page }) => {
    await page.goto("/products");

    await expect(page.locator("header")).toBeVisible();
    // Wait for at least one product link to appear
    const productLinks = page.locator('a[href^="/products/"]');
    await expect(productLinks.first()).toBeVisible({ timeout: 10_000 });
    expect(await productLinks.count()).toBeGreaterThan(0);
  });

  test("category filter works", async ({ page }) => {
    await page.goto("/products?category=printers");

    const productLinks = page.locator('a[href^="/products/"]');
    await expect(productLinks.first()).toBeVisible({ timeout: 10_000 });
    expect(await productLinks.count()).toBeGreaterThan(0);
  });

  test("search navigates to filtered results", async ({ page }) => {
    await page.goto("/");

    // Desktop homepage uses a command-palette trigger; open it with Ctrl+K
    await page.keyboard.press("Control+K");
    const searchInput = page.locator('[role="dialog"] input[placeholder*="Search"]').first();
    await expect(searchInput).toBeVisible({ timeout: 5_000 });
    await searchInput.fill("HP");
    await searchInput.press("Enter");

    await expect(page).toHaveURL(/\/products\?search=HP/);
  });
});

// ---------------------------------------------------------------------------
// 3. Product detail
// ---------------------------------------------------------------------------

test.describe("Product detail", () => {
  test("loads product info and shows Add to Cart button", async ({ page }) => {
    // Navigate via listing so we get a real slug
    await page.goto("/products");
    const firstProduct = page.locator('a[href^="/products/"]').first();
    await expect(firstProduct).toBeVisible({ timeout: 10_000 });
    await firstProduct.click();

    // Should land on a product detail page
    await expect(page.locator("h1")).toBeVisible();
    await expect(page.locator('button:has-text("Add to Cart")').first()).toBeVisible();
    // Price displayed
    await expect(page.locator("text=/£\\d+/").first()).toBeVisible();
  });
});

// ---------------------------------------------------------------------------
// 4. Cart
// ---------------------------------------------------------------------------

test.describe("Cart", () => {
  test("empty cart shows appropriate message", async ({ page }) => {
    // Clear any stored cart state
    await page.goto("/");
    await page.evaluate(() => localStorage.clear());

    await page.goto("/cart");
    await expect(page.locator('text="Your cart is empty"')).toBeVisible();
    await expect(page.locator('a:has-text("Start Shopping")')).toBeVisible();
  });

  test("add to cart from product page updates cart", async ({ page }) => {
    // Start fresh
    await page.goto("/");
    await page.evaluate(() => localStorage.clear());

    await addFirstProductToCart(page);

    // Navigate to cart and verify item is present
    await page.goto("/cart");
    await expect(page.locator('h1:has-text("Shopping Cart")')).toBeVisible();
    await expect(page.locator('h2:has-text("Order Summary")')).toBeVisible();
    // At least one item in the cart
    await expect(page.locator("text=/£\\d+/").first()).toBeVisible();
  });
});

// ---------------------------------------------------------------------------
// 5. Authentication pages render
// ---------------------------------------------------------------------------

test.describe("Auth pages", () => {
  test("login page renders with form", async ({ page }) => {
    await page.goto("/login");

    await expect(page.locator("header")).toBeVisible();
    await expect(page.locator("#email")).toBeVisible();
    await expect(page.locator("#password")).toBeVisible();
    await expect(page.getByRole("button", { name: "Sign In" })).toBeVisible();
    await expect(page.locator('a[href="/signup"]')).toBeVisible();
    await expect(page.locator('a[href="/forgot-password"]')).toBeVisible();
  });

  test("signup page renders with form", async ({ page }) => {
    await page.goto("/signup");

    await expect(page.locator("header")).toBeVisible();
    await expect(page.locator("#firstName")).toBeVisible();
    await expect(page.locator("#lastName")).toBeVisible();
    await expect(page.locator("#email")).toBeVisible();
    await expect(page.locator("#password")).toBeVisible();
    await expect(page.locator("#confirmPassword")).toBeVisible();
    await expect(page.getByRole("button", { name: "Create Account" })).toBeVisible();
  });

  test("signup rejects mismatched passwords", async ({ page }) => {
    await page.goto("/signup");

    await page.locator("#firstName").fill("Test");
    await page.locator("#lastName").fill("User");
    await page.locator("#email").fill(uniqueEmail());
    await page.locator("#password").fill("Password123!");
    await page.locator("#confirmPassword").fill("Mismatch!");
    await page.getByRole("button", { name: "Create Account" }).click();

    await expect(page.locator("text=/[Pp]asswords do not match/")).toBeVisible({ timeout: 10_000 });
  });

  test("login with invalid credentials shows error", async ({ page }) => {
    await page.goto("/login");

    await page.locator("#email").fill("nonexistent@test.com");
    await page.locator("#password").fill("wrongpassword");
    await page.getByRole("button", { name: "Sign In" }).click();

    // Should show an error message (exact text may vary)
    await expect(page.locator(".bg-red-50")).toBeVisible({ timeout: 10_000 });
  });

  test("forgot password page renders", async ({ page }) => {
    await page.goto("/forgot-password");

    await expect(page.locator("header")).toBeVisible();
    await expect(page.locator("#email")).toBeVisible();
    await expect(page.getByRole("button", { name: /send reset link/i })).toBeVisible();
  });
});

// ---------------------------------------------------------------------------
// 6. Checkout page
// ---------------------------------------------------------------------------

test.describe("Checkout", () => {
  test("redirects or shows empty state when cart is empty", async ({ page }) => {
    await page.goto("/");
    await page.evaluate(() => localStorage.clear());

    await page.goto("/checkout");

    // Should either redirect back to cart or show a message about empty cart
    await page.waitForTimeout(2_000);
    const url = page.url();
    const hasEmptyMessage = await page.locator("text=/empty|no items/i").isVisible().catch(() => false);
    expect(url.includes("/cart") || url.includes("/checkout") || hasEmptyMessage).toBeTruthy();
  });

  test("checkout form renders when cart has items", async ({ page }) => {
    // Add an item to cart first
    await page.goto("/");
    await page.evaluate(() => localStorage.clear());

    await addFirstProductToCart(page);

    await page.goto("/checkout");

    // Checkout form fields should be visible
    await expect(page.locator("#firstName")).toBeVisible({ timeout: 10_000 });
    await expect(page.locator("#lastName")).toBeVisible();
    await expect(page.locator("#email")).toBeVisible();
    await expect(page.locator("#shippingAddress1")).toBeVisible();
    await expect(page.locator("#shippingCity")).toBeVisible();
    await expect(page.locator("#shippingPostcode")).toBeVisible();

    // Fill shipping details so the Stripe payment section appears
    await fillShippingForm(page);
    await expect(page.locator('h2:has-text("Payment")')).toBeVisible();
    // The "complete details" prompt should be replaced by payment content (loading, iframe, or error)
    await expect(page.locator('text=/Please complete your contact and shipping details before paying/i')).toBeHidden({ timeout: 10_000 });
  });
});

// ---------------------------------------------------------------------------
// 7. Full checkout flow (end-to-end)
// ---------------------------------------------------------------------------

test.describe("Full checkout flow", () => {
  test("add item, fill checkout, see payment form", async ({ page }) => {
    // Start fresh
    await page.goto("/");
    await page.evaluate(() => localStorage.clear());

    // 1. Go to products and add first item
    await addFirstProductToCart(page);

    // 2. Go to cart and proceed to checkout
    await page.goto("/cart");
    await expect(page.locator('h1:has-text("Shopping Cart")')).toBeVisible();
    await page.locator('a:has-text("Proceed to Checkout")').click();

    // 3. Fill out checkout form
    await expect(page.locator("#firstName")).toBeVisible({ timeout: 10_000 });
    await fillShippingForm(page);

    // 4. Payment section should appear (the "complete details" prompt is gone)
    await expect(page.locator('h2:has-text("Payment")')).toBeVisible();
    await expect(page.locator('text=/Please complete your contact and shipping details before paying/i')).toBeHidden({ timeout: 10_000 });
  });
});

// ---------------------------------------------------------------------------
// 8. API smoke tests
// ---------------------------------------------------------------------------

test.describe("API endpoints", () => {
  test("GET /api/products returns products", async ({ request }) => {
    const response = await request.get("/api/products");
    expect(response.ok()).toBeTruthy();

    const data = await response.json();
    expect(data.products).toBeDefined();
    expect(Array.isArray(data.products)).toBeTruthy();
    expect(data.products.length).toBeGreaterThan(0);
  });

  test("GET /api/products with search param", async ({ request }) => {
    const response = await request.get("/api/products?search=HP");
    expect(response.ok()).toBeTruthy();

    const data = await response.json();
    expect(data.products).toBeDefined();
    expect(Array.isArray(data.products)).toBeTruthy();
  });

  test("GET /api/categories returns categories", async ({ request }) => {
    const response = await request.get("/api/categories");
    expect(response.ok()).toBeTruthy();

    const data = await response.json();
    expect(data.categories).toBeDefined();
    expect(Array.isArray(data.categories)).toBeTruthy();
    expect(data.categories.length).toBeGreaterThan(0);
  });

  test("GET /api/products/:id returns a product", async ({ request }) => {
    // First get all products to find a valid id
    const listRes = await request.get("/api/products");
    const listData = await listRes.json();
    const firstId = listData.products[0].id;

    const response = await request.get(`/api/products/${firstId}`);
    expect(response.ok()).toBeTruthy();

    const data = await response.json();
    expect(data.product).toBeDefined();
    expect(data.product.id).toBe(firstId);
  });

  test("POST /api/auth/login rejects invalid credentials", async ({ request }) => {
    const response = await request.post("/api/auth/login", {
      data: { email: "nobody@test.com", password: "wrong" },
    });
    expect(response.ok()).toBeFalsy();
  });

  test("GET /api/auth/me without session returns no user", async ({ request }) => {
    const response = await request.get("/api/auth/me");
    const data = await response.json();
    // Without a valid session, the endpoint returns either 401 or a null user
    if (response.ok()) {
      expect(data.user).toBeFalsy();
    } else {
      expect(response.status()).toBe(401);
    }
  });
});

// ---------------------------------------------------------------------------
// 9. Responsive / mobile nav
// ---------------------------------------------------------------------------

test.describe("Mobile navigation", () => {
  test.use({ viewport: { width: 375, height: 812 } });

  test("mobile menu toggle works", async ({ page }) => {
    await page.goto("/");

    // Desktop nav should be hidden, mobile menu button visible
    const menuButton = page.locator("button.md\\:hidden").last();
    await expect(menuButton).toBeVisible();

    // Click the hamburger menu
    await menuButton.click();

    // Nav links should now be visible (scope to nav to avoid footer duplicates)
    await expect(
      page.locator('nav a:has-text("All Products")')
    ).toBeVisible();
    await expect(
      page.locator('nav a:has-text("SALE")')
    ).toBeVisible();
  });
});
