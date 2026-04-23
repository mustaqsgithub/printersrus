import {
  Eyes,
  Target,
  ClassicRunner,
  Configuration,
  BatchInfo,
  BrowserType,
  DeviceName,
  ScreenOrientation,
  VisualGridRunner,
} from "@applitools/eyes-playwright";
import { test, expect } from "@playwright/test";

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

// Toggle between ClassicRunner (single-browser screenshots taken locally)
// and VisualGridRunner (Ultrafast Grid – renders across many browsers/devices
// in the Applitools cloud). Set USE_ULTRAFAST_GRID=true in env to enable.
const USE_ULTRAFAST_GRID = process.env.USE_ULTRAFAST_GRID === "true";

let runner: ClassicRunner | VisualGridRunner;
let batchInfo: BatchInfo;

test.beforeAll(() => {
  batchInfo = new BatchInfo("PrintersRUs Visual Tests");

  if (USE_ULTRAFAST_GRID) {
    runner = new VisualGridRunner({ testConcurrency: 5 });
  } else {
    runner = new ClassicRunner();
  }
});

test.afterAll(async () => {
  // Wait for all visual checks to complete and get aggregated results
  const results = await runner.getAllTestResults(false);
  console.log("Applitools results:", results.toString());
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function createEyes(): Eyes {
  const eyes = new Eyes(runner);
  const config = new Configuration();

  config.setBatch(batchInfo);
  config.setAppName("PrintersRUs");

  if (USE_ULTRAFAST_GRID) {
    // Desktop browsers
    config.addBrowser(1280, 800, BrowserType.CHROME);
    config.addBrowser(1280, 800, BrowserType.FIREFOX);
    config.addBrowser(1280, 800, BrowserType.SAFARI);
    config.addBrowser(1280, 800, BrowserType.EDGE_CHROMIUM);
    // Mobile devices
    config.addDeviceEmulation(DeviceName.iPhone_13_Mini, ScreenOrientation.PORTRAIT);
    config.addDeviceEmulation(DeviceName.Pixel_5, ScreenOrientation.PORTRAIT);
    config.addDeviceEmulation(DeviceName.iPad, ScreenOrientation.LANDSCAPE);
  }

  eyes.setConfiguration(config);
  return eyes;
}

// ---------------------------------------------------------------------------
// 1. Homepage
// ---------------------------------------------------------------------------

test.describe("Applitools visual tests", () => {
  test("Homepage – full page", async ({ page }) => {
    const eyes = createEyes();
    await eyes.open(page, "PrintersRUs", "Homepage", { width: 1280, height: 800 });

    await page.goto("/");
    await expect(page.locator("header")).toBeVisible();
    await page.waitForSelector('h2:has-text("Featured Products")', { timeout: 10_000 });

    await eyes.check("Homepage", Target.window().fully(true));

    await eyes.close(false);
  });

  // ---------------------------------------------------------------------------
  // 2. Products listing
  // ---------------------------------------------------------------------------

  test("Products listing page", async ({ page }) => {
    const eyes = createEyes();
    await eyes.open(page, "PrintersRUs", "Products Listing", { width: 1280, height: 800 });

    await page.goto("/products");
    await page.waitForSelector('a[href^="/products/"]', { timeout: 10_000 });

    await eyes.check("Products Listing", Target.window().fully(true));

    await eyes.close(false);
  });

  // ---------------------------------------------------------------------------
  // 3. Product detail
  // ---------------------------------------------------------------------------

  test("Product detail page", async ({ page }) => {
    const eyes = createEyes();
    await eyes.open(page, "PrintersRUs", "Product Detail", { width: 1280, height: 800 });

    await page.goto("/products/hp-laserjet-pro-m404dn");
    await page.waitForSelector("text=HP LaserJet", { timeout: 10_000 });

    await eyes.check("Product Detail", Target.window().fully(true));

    await eyes.close(false);
  });

  // ---------------------------------------------------------------------------
  // 4. Cart (empty)
  // ---------------------------------------------------------------------------

  test("Cart page – empty state", async ({ page }) => {
    const eyes = createEyes();
    await eyes.open(page, "PrintersRUs", "Cart Empty", { width: 1280, height: 800 });

    await page.goto("/");
    await page.evaluate(() => localStorage.clear());
    await page.goto("/cart");
    await expect(page.locator('text="Your cart is empty"')).toBeVisible();

    await eyes.check("Cart Empty", Target.window().fully(true));

    await eyes.close(false);
  });

  // ---------------------------------------------------------------------------
  // 5. Login page
  // ---------------------------------------------------------------------------

  test("Login page", async ({ page }) => {
    const eyes = createEyes();
    await eyes.open(page, "PrintersRUs", "Login Page", { width: 1280, height: 800 });

    await page.goto("/login");
    await expect(page.locator("#email")).toBeVisible();

    await eyes.check("Login Page", Target.window().fully(true));

    await eyes.close(false);
  });

  // ---------------------------------------------------------------------------
  // 6. Signup page
  // ---------------------------------------------------------------------------

  test("Signup page", async ({ page }) => {
    const eyes = createEyes();
    await eyes.open(page, "PrintersRUs", "Signup Page", { width: 1280, height: 800 });

    await page.goto("/signup");
    await expect(page.locator("#firstName")).toBeVisible();

    await eyes.check("Signup Page", Target.window().fully(true));

    await eyes.close(false);
  });

  // ---------------------------------------------------------------------------
  // 7. Forgot password page
  // ---------------------------------------------------------------------------

  test("Forgot password page", async ({ page }) => {
    const eyes = createEyes();
    await eyes.open(page, "PrintersRUs", "Forgot Password", { width: 1280, height: 800 });

    await page.goto("/forgot-password");
    await expect(page.locator("#email")).toBeVisible();

    await eyes.check("Forgot Password", Target.window().fully(true));

    await eyes.close(false);
  });

  // ---------------------------------------------------------------------------
  // 8. Category-filtered products
  // ---------------------------------------------------------------------------

  test("Products filtered by category – Printers", async ({ page }) => {
    const eyes = createEyes();
    await eyes.open(page, "PrintersRUs", "Products – Printers", { width: 1280, height: 800 });

    await page.goto("/products?category=printers");
    await page.waitForSelector('a[href^="/products/"]', { timeout: 10_000 });

    await eyes.check("Products – Printers", Target.window().fully(true));

    await eyes.close(false);
  });

  // ---------------------------------------------------------------------------
  // 9. Sale items
  // ---------------------------------------------------------------------------

  test("Products filtered by sale", async ({ page }) => {
    const eyes = createEyes();
    await eyes.open(page, "PrintersRUs", "Products – Sale", { width: 1280, height: 800 });

    await page.goto("/products?sale=true");
    await page.waitForSelector('a[href^="/products/"]', { timeout: 10_000 });

    await eyes.check("Products – Sale", Target.window().fully(true));

    await eyes.close(false);
  });

  // ---------------------------------------------------------------------------
  // 10. Checkout page (with item in cart)
  // ---------------------------------------------------------------------------

  test("Checkout page", async ({ page }) => {
    const eyes = createEyes();
    await eyes.open(page, "PrintersRUs", "Checkout Page", { width: 1280, height: 800 });

    // Add an item to cart first
    await page.goto("/");
    await page.evaluate(() => localStorage.clear());
    await page.goto("/products");
    await page.locator('a[href^="/products/"]').first().click();
    await page.locator('button:has-text("Add to Cart")').first().click();
    await page.waitForTimeout(1_000);

    await page.goto("/checkout");
    await expect(page.locator("#firstName")).toBeVisible({ timeout: 10_000 });

    await eyes.check("Checkout Page", Target.window().fully(true));

    await eyes.close(false);
  });
});
