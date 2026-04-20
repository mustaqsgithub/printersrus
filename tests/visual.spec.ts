import { test, expect } from "@playwright/test";

test.describe("Visual tests", () => {
  test("Homepage loads with header, promo banner, and products", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator("header")).toBeVisible();
    await expect(page).toHaveTitle(/printer/i);
    await expect(page.locator("body")).toHaveScreenshot("homepage.png", {
      fullPage: true,
      maxDiffPixelRatio: 0.05,
    });
  });

  test("Products listing page", async ({ page }) => {
    await page.goto("/products");
    await expect(page.locator("header")).toBeVisible();
    // Wait for product cards to render
    await page.waitForSelector('[class*="product"], [class*="grid"]', { timeout: 10000 });
    await expect(page.locator("body")).toHaveScreenshot("products-listing.png", {
      fullPage: true,
      maxDiffPixelRatio: 0.05,
    });
  });

  test("Product detail page - HP LaserJet", async ({ page }) => {
    await page.goto("/products/hp-laserjet-pro-m404dn");
    await expect(page.locator("header")).toBeVisible();
    // Wait for product details to load
    await page.waitForSelector("text=HP LaserJet", { timeout: 10000 });
    await expect(page.locator("body")).toHaveScreenshot("product-detail.png", {
      fullPage: true,
      maxDiffPixelRatio: 0.05,
    });
  });

  test("Cart page (empty)", async ({ page }) => {
    await page.goto("/cart");
    await expect(page.locator("header")).toBeVisible();
    await expect(page.locator("body")).toHaveScreenshot("cart-empty.png", {
      fullPage: true,
      maxDiffPixelRatio: 0.05,
    });
  });

  test("Login page", async ({ page }) => {
    await page.goto("/login");
    await expect(page.locator("header")).toBeVisible();
    await expect(page.locator("body")).toHaveScreenshot("login.png", {
      fullPage: true,
      maxDiffPixelRatio: 0.05,
    });
  });

  test("Sign up page", async ({ page }) => {
    await page.goto("/signup");
    await expect(page.locator("header")).toBeVisible();
    await expect(page.locator("body")).toHaveScreenshot("signup.png", {
      fullPage: true,
      maxDiffPixelRatio: 0.05,
    });
  });

  test("Forgot password page", async ({ page }) => {
    await page.goto("/forgot-password");
    await expect(page.locator("header")).toBeVisible();
    await expect(page.locator("body")).toHaveScreenshot("forgot-password.png", {
      fullPage: true,
      maxDiffPixelRatio: 0.05,
    });
  });
});
