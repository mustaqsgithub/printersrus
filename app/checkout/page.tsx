"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { ArrowLeft, Lock } from "lucide-react";
import { useCartStore } from "@/lib/cart-store";
import { useAuthStore } from "@/lib/auth-store";
import StripePaymentForm from "@/components/StripePaymentForm";
import PaypalCheckoutButton from "@/components/PaypalCheckoutButton";
import { FREE_SHIPPING_THRESHOLD, SHIPPING_FLAT_RATE } from "@/lib/shipping";

type PaymentTab = "stripe" | "paypal";

export default function CheckoutPage() {
  const router = useRouter();
  const { items, getTotalPrice, clearCart } = useCartStore();
  const { user, loadUser } = useAuthStore();

  const [paymentTab, setPaymentTab] = useState<PaymentTab>("stripe");
  const [submitting, setSubmitting] = useState(false);
  const [globalError, setGlobalError] = useState<string | null>(null);
  const [savePaymentMethod, setSavePaymentMethod] = useState(false);

  const totalPrice = getTotalPrice();
  const shippingCost = totalPrice > FREE_SHIPPING_THRESHOLD ? 0 : SHIPPING_FLAT_RATE;
  const tax = totalPrice * 0.08;
  const grandTotal = totalPrice + shippingCost + tax;

  const [formData, setFormData] = useState({
    email: "",
    firstName: "",
    lastName: "",
    phone: "",
    shippingAddress1: "",
    shippingAddress2: "",
    shippingCity: "",
    shippingCounty: "",
    shippingPostcode: "",
    shippingCountry: "GB",
    billingAddress1: "",
    billingAddress2: "",
    billingCity: "",
    billingCounty: "",
    billingPostcode: "",
    billingCountry: "GB",
  });
  const [sameAsShipping, setSameAsShipping] = useState(true);

  useEffect(() => {
    loadUser();
  }, [loadUser]);

  useEffect(() => {
    if (!user) return;
    setFormData((prev) => ({
      ...prev,
      email: prev.email || user.email,
      firstName: prev.firstName || user.firstName,
      lastName: prev.lastName || user.lastName,
      phone: prev.phone || user.phone || "",
    }));
  }, [user]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const cartPayload = useMemo(
    () =>
      items.map((i) => ({
        productId: i.product.id,
        quantity: i.quantity,
        variantId: i.variantId,
      })),
    [items]
  );

  const requiredAddressFilled =
    formData.email &&
    formData.firstName &&
    formData.lastName &&
    formData.shippingAddress1 &&
    formData.shippingCity &&
    formData.shippingPostcode &&
    (sameAsShipping ||
      (formData.billingAddress1 && formData.billingCity && formData.billingPostcode));

  const buildAddresses = () => {
    const billing = sameAsShipping
      ? {
          address1: formData.shippingAddress1,
          address2: formData.shippingAddress2,
          city: formData.shippingCity,
          county: formData.shippingCounty,
          postcode: formData.shippingPostcode,
          country: formData.shippingCountry,
        }
      : {
          address1: formData.billingAddress1,
          address2: formData.billingAddress2,
          city: formData.billingCity,
          county: formData.billingCounty,
          postcode: formData.billingPostcode,
          country: formData.billingCountry,
        };
    return {
      shippingAddress: {
        address1: formData.shippingAddress1,
        address2: formData.shippingAddress2,
        city: formData.shippingCity,
        county: formData.shippingCounty,
        postcode: formData.shippingPostcode,
        country: formData.shippingCountry,
      },
      billingAddress: billing,
    };
  };

  const finalizeOrder = async (payment: {
    provider: PaymentTab;
    paymentIntentId?: string;
    paypalOrderId?: string;
  }) => {
    const { shippingAddress, billingAddress } = buildAddresses();
    const res = await fetch("/api/checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        customer: {
          email: formData.email,
          firstName: formData.firstName,
          lastName: formData.lastName,
          phone: formData.phone,
        },
        shippingAddress,
        billingAddress,
        items: cartPayload,
        payment,
      }),
    });

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      const msg = data.message || "Checkout failed. Please try again.";
      setGlobalError(msg);
      setSubmitting(false);
      return;
    }

    const { orderId, orderNumber, emailPreviewUrl, emailSent } = await res.json();
    clearCart();
    setSubmitting(false);
    const params = new URLSearchParams({ orderId, orderNumber });
    if (emailPreviewUrl) params.set("emailPreview", emailPreviewUrl);
    if (emailSent === false) params.set("emailFailed", "1");
    router.push(`/checkout/success?${params.toString()}`);
  };

  if (items.length === 0) {
    return (
      <div className="container mx-auto px-4 py-16">
        <div className="max-w-2xl mx-auto text-center">
          <h1 className="text-3xl font-bold mb-4">Your cart is empty</h1>
          <p className="text-gray-900 mb-8">
            Please add items to your cart before checking out.
          </p>
          <Link
            href="/products"
            className="inline-block bg-primary-600 text-white px-8 py-3 rounded-lg font-semibold hover:bg-primary-700 transition"
          >
            Start Shopping
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen py-8">
      <div className="container mx-auto px-4">
        <div className="mb-6">
          <Link
            href="/cart"
            className="text-primary-600 hover:text-primary-700 flex items-center gap-1"
          >
            <ArrowLeft size={16} />
            Back to Cart
          </Link>
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2">
            <div className="bg-white border border-gray-200 rounded-lg shadow-sm p-6 mb-6">
              <div className="flex items-center gap-2 mb-6">
                <Lock size={20} className="text-green-600" />
                <h1 className="text-2xl font-bold text-gray-900">Secure Checkout</h1>
              </div>

              {/* Contact Information */}
              <div className="mb-8">
                <h2 className="text-xl font-semibold mb-4 text-gray-900">Contact Information</h2>
                <div className="grid md:grid-cols-2 gap-4">
                  <Field id="firstName" label="First Name *" value={formData.firstName} onChange={handleChange} required />
                  <Field id="lastName" label="Last Name *" value={formData.lastName} onChange={handleChange} required />
                  <Field id="email" label="Email Address *" type="email" value={formData.email} onChange={handleChange} required />
                  <Field id="phone" label="Phone Number" type="tel" value={formData.phone} onChange={handleChange} />
                </div>
              </div>

              {/* Shipping Address */}
              <div className="mb-8">
                <h2 className="text-xl font-semibold mb-4 text-gray-900">Shipping Address</h2>
                <div className="space-y-4">
                  <Field id="shippingAddress1" label="Address Line 1 *" value={formData.shippingAddress1} onChange={handleChange} required />
                  <Field id="shippingAddress2" label="Address Line 2" value={formData.shippingAddress2} onChange={handleChange} />
                  <div className="grid md:grid-cols-3 gap-4">
                    <Field id="shippingCity" label="Town / City *" value={formData.shippingCity} onChange={handleChange} required />
                    <Field id="shippingCounty" label="County" value={formData.shippingCounty} onChange={handleChange} />
                    <Field id="shippingPostcode" label="Postcode *" value={formData.shippingPostcode} onChange={handleChange} required />
                  </div>
                </div>
              </div>

              {/* Billing Address */}
              <div className="mb-8">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-semibold text-gray-900">Billing Address</h2>
                  <label className="flex items-center gap-2 text-sm text-gray-900">
                    <input
                      type="checkbox"
                      checked={sameAsShipping}
                      onChange={(e) => setSameAsShipping(e.target.checked)}
                    />
                    Same as shipping
                  </label>
                </div>
                {!sameAsShipping && (
                  <div className="space-y-4">
                    <Field id="billingAddress1" label="Address Line 1 *" value={formData.billingAddress1} onChange={handleChange} required />
                    <Field id="billingAddress2" label="Address Line 2" value={formData.billingAddress2} onChange={handleChange} />
                    <div className="grid md:grid-cols-3 gap-4">
                      <Field id="billingCity" label="Town / City *" value={formData.billingCity} onChange={handleChange} required />
                      <Field id="billingCounty" label="County" value={formData.billingCounty} onChange={handleChange} />
                      <Field id="billingPostcode" label="Postcode *" value={formData.billingPostcode} onChange={handleChange} required />
                    </div>
                  </div>
                )}
              </div>

              {/* Payment */}
              <div className="mb-8">
                <h2 className="text-xl font-semibold mb-4 text-gray-900">Payment</h2>
                <p className="text-sm text-gray-900 mb-4">
                  <Lock size={14} className="inline mr-1" />
                  Payments are processed securely. Card details never touch our servers.
                </p>

                {!requiredAddressFilled && (
                  <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded text-sm text-amber-800">
                    Please complete your contact and shipping details before paying.
                  </div>
                )}

                <div className="flex gap-2 mb-6 border-b border-gray-200">
                  <TabButton active={paymentTab === "stripe"} onClick={() => setPaymentTab("stripe")}>
                    Card
                  </TabButton>
                  <TabButton active={paymentTab === "paypal"} onClick={() => setPaymentTab("paypal")}>
                    PayPal
                  </TabButton>
                </div>

                {globalError && (
                  <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded text-sm text-red-700">
                    {globalError}
                  </div>
                )}

                {paymentTab === "stripe" && requiredAddressFilled && (
                  <>
                    {user && (
                      <label className="flex items-center gap-2 text-sm text-gray-900 mb-4">
                        <input
                          type="checkbox"
                          checked={savePaymentMethod}
                          onChange={(e) => setSavePaymentMethod(e.target.checked)}
                        />
                        Save this card for future purchases
                      </label>
                    )}
                    <StripePaymentForm
                      items={cartPayload}
                      savePaymentMethod={savePaymentMethod}
                      submitting={submitting}
                      setSubmitting={setSubmitting}
                      buttonLabel={`Pay £${grandTotal.toFixed(2)}`}
                      onSuccess={async (paymentIntentId) => {
                        setGlobalError(null);
                        await finalizeOrder({ provider: "stripe", paymentIntentId });
                      }}
                      onError={(msg) => setGlobalError(msg)}
                    />
                  </>
                )}

                {paymentTab === "paypal" && requiredAddressFilled && (
                  <PaypalCheckoutButton
                    items={cartPayload}
                    disabled={submitting}
                    onApproved={async (paypalOrderId) => {
                      setSubmitting(true);
                      setGlobalError(null);
                      await finalizeOrder({ provider: "paypal", paypalOrderId });
                    }}
                    onError={(msg) => setGlobalError(msg)}
                  />
                )}
              </div>
            </div>
          </div>

          {/* Order Summary */}
          <div className="lg:col-span-1">
            <div className="bg-white border border-gray-200 rounded-lg shadow-sm p-6 sticky top-24">
              <h2 className="text-xl font-bold mb-4 text-gray-900">Order Summary</h2>

              <div className="space-y-4 mb-4 border-b border-gray-200 pb-4">
                {items.map((item) => {
                  const product = item.product;
                  const displayPrice = product.salePrice || product.price;
                  return (
                    <div key={`${product.id}-${item.variantId || "default"}`} className="flex gap-3">
                      <div className="relative w-16 h-16 flex-shrink-0 bg-gray-100 rounded-lg overflow-hidden">
                        <Image
                          src={product.mainImage}
                          alt={product.name}
                          fill
                          className="object-cover"
                        />
                      </div>
                      <div className="flex-1">
                        <p className="font-semibold text-sm line-clamp-2 text-gray-900">{product.name}</p>
                        <p className="text-sm text-gray-900">Qty: {item.quantity}</p>
                        <p className="text-sm font-semibold text-gray-900">
                          £{(displayPrice * item.quantity).toFixed(2)}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="space-y-3 mb-4">
                <Row label="Subtotal" value={`£${totalPrice.toFixed(2)}`} />
                <Row
                  label="Shipping"
                  value={
                    shippingCost === 0 ? (
                      <span className="text-green-600">FREE</span>
                    ) : (
                      `£${shippingCost.toFixed(2)}`
                    )
                  }
                />
                <Row label="Tax (estimated)" value={`£${tax.toFixed(2)}`} />
              </div>

              <div className="border-t border-gray-200 pt-4">
                <div className="flex justify-between text-lg">
                  <span className="font-bold text-gray-900">Total</span>
                  <span className="font-bold text-2xl text-gray-900">£{grandTotal.toFixed(2)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function Field({
  id,
  label,
  type = "text",
  value,
  onChange,
  required,
}: {
  id: string;
  label: string;
  type?: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  required?: boolean;
}) {
  return (
    <div>
      <label htmlFor={id} className="block text-sm font-medium mb-1 text-gray-900">
        {label}
      </label>
      <input
        type={type}
        id={id}
        name={id}
        required={required}
        value={value}
        onChange={onChange}
        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 text-gray-900 bg-white placeholder:text-gray-400"
      />
    </div>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex justify-between">
      <span className="text-gray-900">{label}</span>
      <span className="font-semibold text-gray-900">{value}</span>
    </div>
  );
}

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`px-4 py-2 -mb-px border-b-2 font-medium transition ${
        active
          ? "border-primary-600 text-primary-700"
          : "border-transparent text-gray-600 hover:text-gray-900"
      }`}
    >
      {children}
    </button>
  );
}
