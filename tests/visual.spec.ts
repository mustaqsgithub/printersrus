import { test, expect } from "@playwright/test";
import * as allure from "allure-js-commons";

test.describe("Visual tests", () => {
  test.beforeEach(async ({}, testInfo) => {
    const browser = testInfo.project.name;
    await allure.tag(browser);
    await allure.label("browser", browser);
    await allure.suite("Visual tests");
    await allure.feature(`Visual – ${browser}`);
  });

  test("Homepage loads with header, promo banner, and products", async ({ page, browserName }) => {
    await page.goto("/");
    await expect(page.locator("header")).toBeVisible();
    await expect(page).toHaveTitle(/printer/i);
    await expect(page.locator("body")).toHaveScreenshot(`${browserName}-homepage.png`, {
      fullPage: true,
      maxDiffPixelRatio: 0.05,
    });
  });

  test("Products listing page", async ({ page, browserName }) => {
    await page.goto("/products");
    await expect(page.locator("header")).toBeVisible();
    // Wait for product cards to render
    await page.waitForSelector('[class*="product"], [class*="grid"]', { timeout: 10000 });
    await expect(page.locator("body")).toHaveScreenshot(`${browserName}-products-listing.png`, {
      fullPage: true,
      maxDiffPixelRatio: 0.05,
    });
  });

  test("Product detail page - HP LaserJet", async ({ page, browserName }) => {
    await page.goto("/products/hp-laserjet-pro-m404dn");
    await expect(page.locator("header")).toBeVisible();
    // Wait for product details to load
    await page.waitForSelector("text=HP LaserJet", { timeout: 10000 });
    await expect(page.locator("body")).toHaveScreenshot(`${browserName}-product-detail.png`, {
      fullPage: true,
      maxDiffPixelRatio: 0.05,
    });
  });

  test("Cart page (empty)", async ({ page, browserName }) => {
    await page.goto("/cart");
    await expect(page.locator("header")).toBeVisible();
    await expect(page.locator("body")).toHaveScreenshot(`${browserName}-cart-empty.png`, {
      fullPage: true,
      maxDiffPixelRatio: 0.05,
    });
  });

  test("Login page", async ({ page, browserName }) => {
    await page.goto("/login");
    await expect(page.locator("header")).toBeVisible();
    await expect(page.locator("body")).toHaveScreenshot(`${browserName}-login.png`, {
      fullPage: true,
      maxDiffPixelRatio: 0.05,
    });
  });

  test("Sign up page", async ({ page, browserName }) => {
    await page.goto("/signup");
    await expect(page.locator("header")).toBeVisible();
    await expect(page.locator("body")).toHaveScreenshot(`${browserName}-signup.png`, {
      fullPage: true,
      maxDiffPixelRatio: 0.05,
    });
  });

  test("Forgot password page", async ({ page, browserName }) => {
    await page.goto("/forgot-password");
    await expect(page.locator("header")).toBeVisible();
    await expect(page.locator("body")).toHaveScreenshot(`${browserName}-forgot-password.png`, {
      fullPage: true,
      maxDiffPixelRatio: 0.05,
    });
  });
});
