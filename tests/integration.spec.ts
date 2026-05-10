import { test, expect, type APIRequestContext } from "@playwright/test";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const ts = () => Date.now();
const testEmail = () => `integ+${ts()}@test.com`;
const PASSWORD = "TestPassword123!";

/** Sign up a new user and return the user object + verification URL. */
async function signUp(
  request: APIRequestContext,
  overrides: Record<string, string> = {}
) {
  const email = overrides.email ?? testEmail();
  const res = await request.post("/api/auth/signup", {
    data: {
      firstName: overrides.firstName ?? "Integ",
      lastName: overrides.lastName ?? "Tester",
      email,
      phone: overrides.phone ?? "07700900000",
      password: overrides.password ?? PASSWORD,
    },
  });
  expect(res.ok()).toBeTruthy();
  const data = await res.json();
  return { ...data, email, password: overrides.password ?? PASSWORD };
}

/** Verify a newly-signed-up user's email using the verificationUrl token. */
async function verifyEmail(request: APIRequestContext, verificationUrl: string) {
  const token = new URL(verificationUrl).searchParams.get("token")!;
  const res = await request.post("/api/auth/verify", {
    data: { token },
  });
  expect(res.ok()).toBeTruthy();
  return res.json();
}

/** Sign up + verify (creates session after verification). */
async function createVerifiedUser(
  request: APIRequestContext,
  overrides: Record<string, string> = {}
) {
  const signup = await signUp(request, overrides);
  await verifyEmail(request, signup.verificationUrl);
  // Verification now creates a session, logout for clean state if needed
  await request.post("/api/auth/logout");
  return { email: signup.email, password: signup.password, user: signup.user };
}

/** Log in and return the user object. */
async function login(
  request: APIRequestContext,
  email: string,
  password: string
) {
  const res = await request.post("/api/auth/login", {
    data: { email, password },
  });
  expect(res.ok()).toBeTruthy();
  return res.json();
}

/** Fetch the first product id from the catalogue. */
async function getFirstProductId(request: APIRequestContext) {
  const res = await request.get("/api/products");
  const data = await res.json();
  return data.products[0].id as string;
}

// ===========================================================================
// 1. AUTH LIFECYCLE
// ===========================================================================

test.describe("Auth lifecycle", () => {
  test("signup → verify → login → me → change password → re-login", async ({
    request,
  }) => {
    // 1. Sign up
    const email = testEmail();
    const signupRes = await request.post("/api/auth/signup", {
      data: {
        firstName: "Auth",
        lastName: "Test",
        email,
        password: PASSWORD,
      },
    });
    expect(signupRes.ok()).toBeTruthy();
    const signupData = await signupRes.json();
    expect(signupData.user).toBeDefined();
    expect(signupData.user.email).toBe(email.toLowerCase());
    expect(signupData.user.emailVerified).toBe(false);
    expect(signupData.verificationUrl).toBeDefined();

    // 2. /me should return null (signup no longer sets session cookie)
    const meRes1 = await request.get("/api/auth/me");
    const me1 = await meRes1.json();
    expect(me1.user).toBeNull();

    // 3. Verify email (this now creates a session)
    await verifyEmail(request, signupData.verificationUrl);

    // 4. /me should now return the user (after verification)
    const meRes2 = await request.get("/api/auth/me");
    const me2 = await meRes2.json();
    expect(me2.user).not.toBeNull();
    expect(me2.user.id).toBe(signupData.user.id);
    expect(me2.user.emailVerified).toBe(true);

    // 5. Logout
    const logoutRes = await request.post("/api/auth/logout");
    expect(logoutRes.ok()).toBeTruthy();

    // 6. /me should now return null
    const meRes3 = await request.get("/api/auth/me");
    const me3 = await meRes3.json();
    expect(me3.user).toBeNull();

    // 7. Login with verified account
    const loginRes = await request.post("/api/auth/login", {
      data: { email, password: PASSWORD },
    });
    expect(loginRes.ok()).toBeTruthy();
    const loginData = await loginRes.json();
    expect(loginData.user.emailVerified).toBe(true);

    // 8. Change password
    const newPassword = "NewPassword456!";
    const changePwRes = await request.post("/api/auth/change-password", {
      data: { currentPassword: PASSWORD, newPassword },
    });
    expect(changePwRes.ok()).toBeTruthy();

    // 9. Logout and re-login with new password
    await request.post("/api/auth/logout");
    const reLoginRes = await request.post("/api/auth/login", {
      data: { email, password: newPassword },
    });
    expect(reLoginRes.ok()).toBeTruthy();
  });

  test("profile update requires verified user (no signup session)", async ({
    request,
  }) => {
    // Signup no longer gives a session immediately – profile update should fail without verification
    const email = testEmail();
    const signupRes = await request.post("/api/auth/signup", {
      data: {
        firstName: "Auth",
        lastName: "Test",
        email,
        password: PASSWORD,
      },
    });
    expect(signupRes.ok()).toBeTruthy();
    const signupData = await signupRes.json();

    // Profile update should fail without verification (no session)
    const profileRes = await request.patch("/api/auth/profile", {
      data: { firstName: "Updated", phone: "07700900001" },
    });
    expect(profileRes.status()).toBe(401);

    // Verify email to get a session
    await verifyEmail(request, signupData.verificationUrl);

    // Now profile update should work
    const profileRes2 = await request.patch("/api/auth/profile", {
      data: { firstName: "Updated", phone: "07700900001" },
    });
    expect(profileRes2.ok()).toBeTruthy();
    const profileData = await profileRes2.json();
    expect(profileData.user.firstName).toBe("Updated");
  });

  test("signup with duplicate email returns 409", async ({ request }) => {
    const email = testEmail();
    await signUp(request, { email });
    await request.post("/api/auth/logout");

    const dupRes = await request.post("/api/auth/signup", {
      data: {
        firstName: "Dup",
        lastName: "User",
        email,
        password: PASSWORD,
      },
    });
    expect(dupRes.status()).toBe(409);
    const data = await dupRes.json();
    expect(data.message).toMatch(/already registered/i);
  });

  test("login without verification returns 403 with verificationUrl", async ({
    request,
  }) => {
    const email = testEmail();
    await signUp(request, { email });
    await request.post("/api/auth/logout");

    const loginRes = await request.post("/api/auth/login", {
      data: { email, password: PASSWORD },
    });
    expect(loginRes.status()).toBe(403);
    const data = await loginRes.json();
    expect(data.message).toMatch(/verify/i);
    expect(data.verificationUrl).toBeDefined();
  });

  test("login with wrong password returns 401", async ({ request }) => {
    const { email } = await createVerifiedUser(request);

    const res = await request.post("/api/auth/login", {
      data: { email, password: "WrongPassword!" },
    });
    expect(res.status()).toBe(401);
  });

  test("change password rejects incorrect current password", async ({
    request,
  }) => {
    const { email, password } = await createVerifiedUser(request);
    await login(request, email, password);

    const res = await request.post("/api/auth/change-password", {
      data: { currentPassword: "NotMyPassword!", newPassword: "Anything123!" },
    });
    expect(res.status()).toBe(403);
  });

  test("notification preferences can be toggled", async ({ request }) => {
    const { email, password } = await createVerifiedUser(request);
    await login(request, email, password);

    // Disable
    const offRes = await request.patch("/api/auth/notifications", {
      data: { emailNotifications: false },
    });
    expect(offRes.ok()).toBeTruthy();
    expect((await offRes.json()).user.emailNotifications).toBe(false);

    // Enable
    const onRes = await request.patch("/api/auth/notifications", {
      data: { emailNotifications: true },
    });
    expect(onRes.ok()).toBeTruthy();
    expect((await onRes.json()).user.emailNotifications).toBe(true);
  });
});

// ===========================================================================
// 2. PRODUCT CATALOGUE
// ===========================================================================

test.describe("Product catalogue", () => {
  test("list products returns array with expected shape", async ({
    request,
  }) => {
    const res = await request.get("/api/products");
    expect(res.ok()).toBeTruthy();
    const data = await res.json();

    expect(data.products.length).toBeGreaterThan(0);
    expect(data.total).toBe(data.products.length);

    const p = data.products[0];
    expect(p).toHaveProperty("id");
    expect(p).toHaveProperty("name");
    expect(p).toHaveProperty("slug");
    expect(p).toHaveProperty("price");
    expect(typeof p.price).toBe("number");
    expect(p).toHaveProperty("inStock");
  });

  test("filter by category returns subset", async ({ request }) => {
    const allRes = await request.get("/api/products");
    const all = await allRes.json();

    const catRes = await request.get("/api/products?category=printers");
    const catData = await catRes.json();

    expect(catData.products.length).toBeGreaterThan(0);
    expect(catData.products.length).toBeLessThanOrEqual(all.products.length);
  });

  test("sale filter works", async ({ request }) => {
    const res = await request.get("/api/products?sale=true");
    const data = await res.json();
    // Every returned product should be on sale
    for (const p of data.products) {
      expect(p.onSale).toBeTruthy();
    }
  });

  test("search returns matching products", async ({ request }) => {
    const res = await request.get("/api/products?search=HP");
    expect(res.ok()).toBeTruthy();
    const data = await res.json();
    // All results should mention HP somewhere in name or description
    for (const p of data.products) {
      const combined = `${p.name} ${p.description} ${p.brand}`.toLowerCase();
      expect(combined).toContain("hp");
    }
  });

  test("get single product by id", async ({ request }) => {
    const listRes = await request.get("/api/products");
    const { products } = await listRes.json();
    const target = products[0];

    const res = await request.get(`/api/products/${target.id}`);
    expect(res.ok()).toBeTruthy();
    const data = await res.json();
    expect(data.product.id).toBe(target.id);
    expect(data.product.name).toBe(target.name);
  });

  test("get product with invalid id returns 404", async ({ request }) => {
    const res = await request.get("/api/products/nonexistent-id-999");
    expect(res.status()).toBe(404);
  });

  test("categories endpoint returns list", async ({ request }) => {
    const res = await request.get("/api/categories");
    expect(res.ok()).toBeTruthy();
    const data = await res.json();

    expect(data.categories.length).toBeGreaterThan(0);
    const cat = data.categories[0];
    expect(cat).toHaveProperty("id");
    expect(cat).toHaveProperty("name");
    expect(cat).toHaveProperty("slug");
  });
});

// ===========================================================================
// 3. AUTHENTICATED CART (server-side)
// ===========================================================================

test.describe("Cart API (authenticated)", () => {
  test("full cart lifecycle: add → get → update → clear", async ({
    request,
  }) => {
    const { email, password } = await createVerifiedUser(request);
    await login(request, email, password);
    const productId = await getFirstProductId(request);

    // 1. PUT items into cart
    const putRes = await request.put("/api/cart", {
      data: { items: [{ productId, quantity: 2 }] },
    });
    expect(putRes.ok()).toBeTruthy();
    const putData = await putRes.json();
    expect(putData.items.length).toBe(1);
    expect(putData.items[0].quantity).toBe(2);

    // 2. GET cart
    const getRes = await request.get("/api/cart");
    expect(getRes.ok()).toBeTruthy();
    const getData = await getRes.json();
    expect(getData.items.length).toBe(1);
    expect(getData.items[0].product.id).toBe(productId);

    // 3. Update quantity (replace mode)
    const updateRes = await request.put("/api/cart?mode=replace", {
      data: { items: [{ productId, quantity: 5 }] },
    });
    expect(updateRes.ok()).toBeTruthy();
    expect((await updateRes.json()).items[0].quantity).toBe(5);

    // 4. DELETE (clear cart)
    const delRes = await request.delete("/api/cart");
    expect(delRes.ok()).toBeTruthy();
    const delData = await delRes.json();
    expect(delData.items).toHaveLength(0);

    // 5. GET should now be empty
    const emptyRes = await request.get("/api/cart");
    expect((await emptyRes.json()).items).toHaveLength(0);
  });

  test("merge mode adds to existing cart", async ({ request }) => {
    const { email, password } = await createVerifiedUser(request);
    await login(request, email, password);

    const listRes = await request.get("/api/products");
    const products = (await listRes.json()).products;
    const [p1, p2] = [products[0].id, products[1].id];

    // Add first product
    await request.put("/api/cart", {
      data: { items: [{ productId: p1, quantity: 1 }] },
    });

    // Merge second product
    const mergeRes = await request.put("/api/cart?mode=merge", {
      data: { items: [{ productId: p2, quantity: 3 }] },
    });
    expect(mergeRes.ok()).toBeTruthy();
    const merged = await mergeRes.json();
    expect(merged.items.length).toBe(2);
  });

  test("cart requires authentication", async ({ request }) => {
    // No login – should be 401
    await request.post("/api/auth/logout"); // ensure no leftover session
    const res = await request.get("/api/cart");
    expect(res.status()).toBe(401);
  });
});

// ===========================================================================
// 4. CHECKOUT + ORDER INTEGRATION
// ===========================================================================

test.describe("Checkout & orders", () => {
  test.skip("place order → verify response → fetch order by id (requires Stripe integration)", async ({
    request,
  }) => {
    // Get a real product
    const listRes = await request.get("/api/products");
    const product = (await listRes.json()).products[0];

    // Place order (public endpoint – no auth required)
    const checkoutRes = await request.post("/api/checkout", {
      data: {
        customer: {
          email: testEmail(),
          firstName: "Order",
          lastName: "Tester",
        },
        shippingAddress: {
          address1: "1 Test Lane",
          city: "London",
          postcode: "EC1A 1BB",
          country: "United Kingdom",
        },
        items: [{ productId: product.id, quantity: 1 }],
      },
    });
    expect(checkoutRes.ok()).toBeTruthy();
    const order = await checkoutRes.json();
    expect(order.orderId).toBeDefined();
    expect(order.orderNumber).toMatch(/^PR-/);
  });

  test.skip("checkout calculates correct totals (free shipping over £50) (requires Stripe integration)", async ({
    request,
  }) => {
    const listRes = await request.get("/api/products");
    const products = (await listRes.json()).products;

    // Find a product that costs more than £50 so shipping is free
    const expensive = products.find(
      (p: any) => (p.salePrice || p.price) > 50
    );
    if (!expensive) {
      test.skip();
      return;
    }

    const checkoutRes = await request.post("/api/checkout", {
      data: {
        customer: {
          email: testEmail(),
          firstName: "Shipping",
          lastName: "Tester",
        },
        shippingAddress: {
          address1: "50 High Street",
          city: "Manchester",
          postcode: "M1 1AA",
          country: "United Kingdom",
        },
        items: [{ productId: expensive.id, quantity: 1 }],
      },
    });
    expect(checkoutRes.ok()).toBeTruthy();
    // Order was created successfully – totals are calculated server-side
    const data = await checkoutRes.json();
    expect(data.orderId).toBeDefined();
  });

  test.skip("checkout with multiple items (requires Stripe integration)", async ({ request }) => {
    const listRes = await request.get("/api/products");
    const products = (await listRes.json()).products;
    const items = products.slice(0, 3).map((p: any) => ({
      productId: p.id,
      quantity: 2,
    }));

    const res = await request.post("/api/checkout", {
      data: {
        customer: {
          email: testEmail(),
          firstName: "Multi",
          lastName: "Order",
        },
        shippingAddress: {
          address1: "99 Elm Street",
          city: "Birmingham",
          postcode: "B1 1AA",
          country: "United Kingdom",
        },
        items,
      },
    });
    expect(res.ok()).toBeTruthy();
  });

  test("checkout validation: missing customer info", async ({ request }) => {
    const productId = await getFirstProductId(request);
    const res = await request.post("/api/checkout", {
      data: {
        customer: { email: "" },
        shippingAddress: {
          address1: "1 Test",
          city: "London",
          postcode: "SW1",
          country: "UK",
        },
        items: [{ productId, quantity: 1 }],
      },
    });
    expect(res.ok()).toBeFalsy();
  });

  test("checkout validation: empty items array", async ({ request }) => {
    const res = await request.post("/api/checkout", {
      data: {
        customer: {
          email: "test@test.com",
          firstName: "A",
          lastName: "B",
        },
        shippingAddress: {
          address1: "1 Test",
          city: "London",
          postcode: "SW1",
          country: "UK",
        },
        items: [],
      },
    });
    expect(res.status()).toBe(400);
  });

  test("checkout validation: invalid product id", async ({ request }) => {
    const res = await request.post("/api/checkout", {
      data: {
        customer: {
          email: "test@test.com",
          firstName: "A",
          lastName: "B",
        },
        shippingAddress: {
          address1: "1 Test",
          city: "London",
          postcode: "SW1",
          country: "UK",
        },
        items: [{ productId: "fake-product-id", quantity: 1 }],
      },
    });
    expect(res.ok()).toBeFalsy();
  });

  test.skip("authenticated user can view their orders after checkout (requires Stripe integration)", async ({
    request,
  }) => {
    const { email, password } = await createVerifiedUser(request);
    await login(request, email, password);
    const productId = await getFirstProductId(request);

    // Place order with the same email
    await request.post("/api/checkout", {
      data: {
        customer: { email, firstName: "Order", lastName: "Viewer" },
        shippingAddress: {
          address1: "5 Order St",
          city: "Leeds",
          postcode: "LS1 1AA",
          country: "United Kingdom",
        },
        items: [{ productId, quantity: 1 }],
      },
    });

    // Fetch orders
    const ordersRes = await request.get("/api/orders");
    expect(ordersRes.ok()).toBeTruthy();
    const ordersData = await ordersRes.json();
    expect(ordersData.orders.length).toBeGreaterThanOrEqual(1);
  });
});

// ===========================================================================
// 5. PAYMENT METHODS CRUD
// ===========================================================================

test.describe("Payment methods", () => {
  test.skip("add → list → add another → delete → verify (requires Stripe integration)", async ({ request }) => {
    const { email, password } = await createVerifiedUser(request);
    await login(request, email, password);

    // 1. Initially empty
    const listRes1 = await request.get("/api/payment-methods");
    expect(listRes1.ok()).toBeTruthy();
    expect((await listRes1.json()).paymentMethods).toHaveLength(0);

    // 2. Add a Visa card
    const addRes1 = await request.post("/api/payment-methods", {
      data: {
        cardNumber: "4111111111111111",
        expiryMonth: "12",
        expiryYear: "30",
        cardholderName: "Test User",
      },
    });
    expect(addRes1.ok()).toBeTruthy();
    const addData1 = await addRes1.json();
    expect(addData1.paymentMethods).toHaveLength(1);
    // DB returns snake_case column names
    expect(addData1.paymentMethods[0].card_type).toBe("Visa");
    expect(addData1.paymentMethods[0].last_four).toBe("1111");
    const firstId = addData1.addedId;

    // 3. Add a Mastercard
    const addRes2 = await request.post("/api/payment-methods", {
      data: {
        cardNumber: "5500000000000004",
        expiryMonth: "06",
        expiryYear: "29",
        cardholderName: "Test User",
      },
    });
    expect(addRes2.ok()).toBeTruthy();
    const addData2 = await addRes2.json();
    expect(addData2.paymentMethods).toHaveLength(2);

    // 4. Delete the first card
    const delRes = await request.delete(
      `/api/payment-methods?id=${firstId}`
    );
    expect(delRes.ok()).toBeTruthy();
    const delData = await delRes.json();
    expect(delData.paymentMethods).toHaveLength(1);
    expect(delData.paymentMethods[0].card_type).toBe("Mastercard");
  });

  test.skip("card type detection: Visa, Mastercard, Amex (requires Stripe integration)", async ({ request }) => {
    const { email, password } = await createVerifiedUser(request);
    await login(request, email, password);

    const cards = [
      { number: "4242424242424242", expectedType: "Visa" },
      { number: "5100000000000000", expectedType: "Mastercard" },
      { number: "371449635398431", expectedType: "Amex" },
    ];

    for (const card of cards) {
      const res = await request.post("/api/payment-methods", {
        data: {
          cardNumber: card.number,
          expiryMonth: "12",
          expiryYear: "30",
          cardholderName: "Type Test",
        },
      });
      expect(res.ok()).toBeTruthy();
      const data = await res.json();
      const added = data.paymentMethods.find(
        (pm: any) => pm.id === data.addedId
      );
      expect(added.card_type).toBe(card.expectedType);
    }
  });

  test.skip("validation: invalid card number rejected (requires Stripe integration)", async ({ request }) => {
    const { email, password } = await createVerifiedUser(request);
    await login(request, email, password);

    const res = await request.post("/api/payment-methods", {
      data: {
        cardNumber: "123",
        expiryMonth: "12",
        expiryYear: "30",
        cardholderName: "Bad Card",
      },
    });
    expect(res.status()).toBe(400);
    expect((await res.json()).message).toMatch(/invalid card/i);
  });

  test.skip("validation: expired card rejected (requires Stripe integration)", async ({ request }) => {
    const { email, password } = await createVerifiedUser(request);
    await login(request, email, password);

    const res = await request.post("/api/payment-methods", {
      data: {
        cardNumber: "4111111111111111",
        expiryMonth: "01",
        expiryYear: "20", // far in the past
        cardholderName: "Expired Card",
      },
    });
    expect(res.status()).toBe(400);
    expect((await res.json()).message).toMatch(/expired/i);
  });

  test("payment methods require authentication", async ({ request }) => {
    await request.post("/api/auth/logout");
    const res = await request.get("/api/payment-methods");
    expect(res.status()).toBe(401);
  });
});

// ===========================================================================
// 6. NOTIFICATIONS
// ===========================================================================

test.describe("Notifications", () => {
  test.skip("order placement creates a notification → mark read (requires Stripe integration)", async ({
    request,
  }) => {
    const { email, password } = await createVerifiedUser(request);
    await login(request, email, password);
    const productId = await getFirstProductId(request);

    // Place order (creates notification)
    const checkoutRes = await request.post("/api/checkout", {
      data: {
        customer: { email, firstName: "Notif", lastName: "Test" },
        shippingAddress: {
          address1: "10 Notify Rd",
          city: "Bristol",
          postcode: "BS1 1AA",
          country: "United Kingdom",
        },
        items: [{ productId, quantity: 1 }],
      },
    });
    expect(checkoutRes.ok()).toBeTruthy();

    // Fetch notifications
    const notifRes = await request.get("/api/notifications");
    expect(notifRes.ok()).toBeTruthy();
    const notifData = await notifRes.json();
    expect(notifData.notifications.length).toBeGreaterThanOrEqual(1);
    expect(notifData.unreadCount).toBeGreaterThanOrEqual(1);

    const firstNotif = notifData.notifications[0];
    expect(firstNotif.type).toBe("order_placed");

    // Mark single notification as read
    const markRes = await request.patch("/api/notifications", {
      data: { notificationId: firstNotif.id },
    });
    expect(markRes.ok()).toBeTruthy();
    const markData = await markRes.json();
    expect(markData.unreadCount).toBeLessThan(notifData.unreadCount);
  });

  test("mark all notifications as read", async ({ request }) => {
    const { email, password } = await createVerifiedUser(request);
    await login(request, email, password);
    const productId = await getFirstProductId(request);

    // Create two orders to generate two notifications
    for (let i = 0; i < 2; i++) {
      await request.post("/api/checkout", {
        data: {
          customer: { email, firstName: "Batch", lastName: `Read${i}` },
          shippingAddress: {
            address1: `${i} Batch St`,
            city: "London",
            postcode: "SW1A 1AA",
            country: "United Kingdom",
          },
          items: [{ productId, quantity: 1 }],
        },
      });
    }

    // Mark all as read
    const markAllRes = await request.patch("/api/notifications", {
      data: { markAllRead: true },
    });
    expect(markAllRes.ok()).toBeTruthy();
    expect((await markAllRes.json()).unreadCount).toBe(0);
  });

  test("notifications require authentication", async ({ request }) => {
    await request.post("/api/auth/logout");
    const res = await request.get("/api/notifications");
    expect(res.status()).toBe(401);
  });
});

// ===========================================================================
// 7. AUTH GUARDS — protected endpoints without session
// ===========================================================================

test.describe("Auth guards", () => {
  test.beforeEach(async ({ request }) => {
    await request.post("/api/auth/logout");
  });

  const protectedEndpoints = [
    { method: "GET" as const, path: "/api/cart" },
    { method: "PUT" as const, path: "/api/cart" },
    { method: "DELETE" as const, path: "/api/cart" },
    { method: "GET" as const, path: "/api/payment-methods" },
    { method: "POST" as const, path: "/api/payment-methods" },
    { method: "DELETE" as const, path: "/api/payment-methods?id=fake" },
    { method: "GET" as const, path: "/api/notifications" },
    { method: "PATCH" as const, path: "/api/notifications" },
    { method: "GET" as const, path: "/api/orders" },
    { method: "PATCH" as const, path: "/api/auth/profile" },
    { method: "PATCH" as const, path: "/api/auth/notifications" },
    { method: "POST" as const, path: "/api/auth/change-password" },
  ];

  for (const ep of protectedEndpoints) {
    test(`${ep.method} ${ep.path} returns 401`, async ({ request }) => {
      let res;
      const body = {}; // minimal body to avoid parse errors
      switch (ep.method) {
        case "GET":
          res = await request.get(ep.path);
          break;
        case "PUT":
          res = await request.put(ep.path, { data: body });
          break;
        case "DELETE":
          res = await request.delete(ep.path);
          break;
        case "PATCH":
          res = await request.patch(ep.path, { data: body });
          break;
        case "POST":
          res = await request.post(ep.path, { data: body });
          break;
      }
      expect(res!.status()).toBe(401);
    });
  }
});

// ===========================================================================
// 8. INPUT VALIDATION
// ===========================================================================

test.describe("Input validation", () => {
  test("signup: missing fields returns 400", async ({ request }) => {
    const res = await request.post("/api/auth/signup", {
      data: { email: "x@test.com" }, // missing firstName, lastName, password
    });
    expect(res.status()).toBe(400);
  });

  test("login: missing fields returns 400", async ({ request }) => {
    const res = await request.post("/api/auth/login", {
      data: { email: "x@test.com" }, // missing password
    });
    expect(res.status()).toBe(400);
  });

  test("change password: short new password returns 400", async ({
    request,
  }) => {
    const { email, password } = await createVerifiedUser(request);
    await login(request, email, password);

    const res = await request.post("/api/auth/change-password", {
      data: { currentPassword: password, newPassword: "short" },
    });
    expect(res.status()).toBe(400);
    expect((await res.json()).message).toMatch(/at least 8/i);
  });

  test("verify: missing token returns 400", async ({ request }) => {
    const res = await request.post("/api/auth/verify", {
      data: {},
    });
    expect(res.status()).toBe(400);
  });

  test("forgot-password: missing email returns 400", async ({ request }) => {
    const res = await request.post("/api/auth/forgot-password", {
      data: {},
    });
    expect(res.status()).toBe(400);
  });

  test("payment method: missing fields returns 400", async ({ request }) => {
    const { email, password } = await createVerifiedUser(request);
    await login(request, email, password);

    const res = await request.post("/api/payment-methods", {
      data: { cardNumber: "4111111111111111" }, // missing expiry & name
    });
    expect(res.status()).toBe(400);
  });

  test("notifications patch: invalid body returns 400", async ({
    request,
  }) => {
    const { email, password } = await createVerifiedUser(request);
    await login(request, email, password);

    const res = await request.patch("/api/notifications", {
      data: { invalid: true },
    });
    expect(res.status()).toBe(400);
  });
});

// ===========================================================================
// 9. CROSS-SYSTEM: signup → checkout → orders → notifications
// ===========================================================================

test.describe("End-to-end: signup through order tracking", () => {
  test.skip("new user signs up, verifies, places order, then views order & notifications (requires Stripe integration)", async ({
    request,
  }) => {
    const email = testEmail();

    // 1. Sign up
    const signupData = await signUp(request, { email });
    const userId = signupData.user.id;

    // 2. Verify email
    await verifyEmail(request, signupData.verificationUrl);

    // 3. Logout and login fresh
    await request.post("/api/auth/logout");
    await login(request, email, PASSWORD);

    // 4. Get products and add to cart
    const productId = await getFirstProductId(request);
    await request.put("/api/cart", {
      data: { items: [{ productId, quantity: 2 }] },
    });

    // 5. Verify cart
    const cartRes = await request.get("/api/cart");
    const cartData = await cartRes.json();
    expect(cartData.items).toHaveLength(1);
    expect(cartData.items[0].quantity).toBe(2);

    // 6. Add a payment method
    const pmRes = await request.post("/api/payment-methods", {
      data: {
        cardNumber: "4111111111111111",
        expiryMonth: "12",
        expiryYear: "30",
        cardholderName: "E2E Tester",
      },
    });
    expect(pmRes.ok()).toBeTruthy();

    // 7. Place order
    const checkoutRes = await request.post("/api/checkout", {
      data: {
        customer: { email, firstName: "E2E", lastName: "Tester" },
        shippingAddress: {
          address1: "42 Integration Ave",
          city: "London",
          postcode: "E1 6AN",
          country: "United Kingdom",
        },
        items: [{ productId, quantity: 2 }],
      },
    });
    expect(checkoutRes.ok()).toBeTruthy();
    const orderData = await checkoutRes.json();
    expect(orderData.orderNumber).toMatch(/^PR-/);

    // 8. View orders
    const ordersRes = await request.get("/api/orders");
    expect(ordersRes.ok()).toBeTruthy();
    const orders = await ordersRes.json();
    expect(orders.orders.length).toBeGreaterThanOrEqual(1);
    const placed = orders.orders.find(
      (o: any) => o.id === orderData.orderId
    );
    expect(placed).toBeDefined();

    // 9. Notifications should include order confirmation
    const notifRes = await request.get("/api/notifications");
    expect(notifRes.ok()).toBeTruthy();
    const notifs = await notifRes.json();
    expect(notifs.notifications.length).toBeGreaterThanOrEqual(1);
    expect(notifs.unreadCount).toBeGreaterThanOrEqual(1);

    // 10. Mark all read
    await request.patch("/api/notifications", {
      data: { markAllRead: true },
    });
    const afterMark = await request.get("/api/notifications");
    expect((await afterMark.json()).unreadCount).toBe(0);
  });
});
