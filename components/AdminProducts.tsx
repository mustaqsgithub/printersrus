"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useToast } from "@/components/ToastProvider";

type Category = {
  id: string;
  name: string;
  slug: string;
};

type Product = {
  id: string;
  name: string;
  slug: string;
  sku: string;
  description: string;
  price: number;
  salePrice?: number | null;
  mainImage: string;
  categoryId: string;
  stockQuantity: number;
  featured: boolean;
  onSale: boolean;
  isActive: boolean;
};

const emptyForm: Product = {
  id: "",
  name: "",
  slug: "",
  sku: "",
  description: "",
  price: 0,
  salePrice: null,
  mainImage: "",
  categoryId: "",
  stockQuantity: 0,
  featured: false,
  onSale: false,
  isActive: true,
};

export function AdminProducts() {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [form, setForm] = useState<Product>(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [bulkFile, setBulkFile] = useState<File | null>(null);
  const [bulkResult, setBulkResult] = useState<string | null>(null);
  const [bulkErrors, setBulkErrors] = useState<Array<{ row: number; message: string }>>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isBulkOpen, setIsBulkOpen] = useState(false);
  const { toast } = useToast();
  const formRef = useRef<HTMLDivElement | null>(null);

  const isEditing = useMemo(() => Boolean(editingId), [editingId]);

  const loadProducts = async () => {
    setIsLoading(true);
    const response = await fetch("/api/admin/products");
    const data = await response.json();
    setProducts(data.products || []);
    setIsLoading(false);
  };

  const loadCategories = async () => {
    const response = await fetch("/api/admin/categories");
    const data = await response.json();
    setCategories(data.categories || []);
  };

  useEffect(() => {
    loadProducts();
    loadCategories();
  }, []);

  const handleChange = (key: keyof Product, value: string | number | boolean | null) => {
    setForm((prev) => ({
      ...prev,
      [key]: value,
      ...(key === "onSale" && value === false ? { salePrice: null } : {}),
    }));
  };

  const resetForm = () => {
    setForm(emptyForm);
    setEditingId(null);
    setError(null);
    setIsFormOpen(false);
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);

    const payload = {
      ...form,
      price: Number(form.price),
      salePrice: form.onSale && form.salePrice ? Number(form.salePrice) : null,
      stockQuantity: Number(form.stockQuantity),
    };

    const response = await fetch("/api/admin/products", {
      method: isEditing ? "PUT" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(isEditing ? { id: editingId, updates: payload } : payload),
    });

    if (!response.ok) {
      const data = await response.json();
      setError(data?.message || "Failed to save product.");
      toast({ title: "Save failed", message: data?.message || "Failed to save product.", variant: "error" });
      return;
    }

    toast({ title: isEditing ? "Product updated" : "Product added", variant: "success" });
    await loadProducts();
    resetForm();
  };

  const handleEdit = (product: Product) => {
    setForm({
      ...product,
      salePrice: product.salePrice ?? null,
    });
    setEditingId(product.id);
    setIsFormOpen(true);
    requestAnimationFrame(() => {
      formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  };

  const handleDelete = async (id: string) => {
    const response = await fetch(`/api/admin/products?id=${id}`, {
      method: "DELETE",
    });

    if (!response.ok) {
      const data = await response.json();
      setError(data?.message || "Failed to delete product.");
      toast({ title: "Delete failed", message: data?.message || "Failed to delete product.", variant: "error" });
      return;
    }

    toast({ title: "Product deleted", variant: "success" });
    await loadProducts();
  };

  const downloadTemplate = () => {
    const headers = [
      "name",
      "sku",
      "description",
      "price",
      "mainImage",
      "categorySlug",
      "categoryName",
      "slug",
      "salePrice",
      "stockQuantity",
      "inStock",
      "featured",
      "onSale",
      "isActive",
      "brand",
      "longDescription",
      "images",
      "categoryDescription",
      "categoryImage",
    ];
    const sample = [
      "HP DeskJet 4155e",
      "HP-DJ-4155E",
      "Wireless all-in-one printer",
      "69.99",
      "https://example.com/image.jpg",
      "printers",
      "Printers",
      "",
      "59.99",
      "25",
      "true",
      "true",
      "true",
      "true",
      "HP",
      "Print, scan, copy with Wi-Fi.",
      "https://example.com/image2.jpg|https://example.com/image3.jpg",
      "Inkjet and all-in-one printers",
      "https://example.com/category.jpg",
    ];
    const quote = (value: string) => `"${value.replace(/"/g, '""')}"`;
    const csv = `${headers.join(",")}\n${sample.map(quote).join(",")}\n`;
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "products-template.csv";
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleBulkUpload = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setBulkResult(null);
    setBulkErrors([]);

    if (!bulkFile) {
      setError("Please select a CSV file.");
      toast({ title: "Upload failed", message: "Please select a CSV file.", variant: "error" });
      return;
    }

    setIsUploading(true);
    const formData = new FormData();
    formData.append("file", bulkFile);

    const response = await fetch("/api/admin/products/bulk", {
      method: "POST",
      body: formData,
    });

    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      setError(data?.message || "Failed to import CSV.");
      toast({ title: "Import failed", message: data?.message || "Failed to import CSV.", variant: "error" });
      setIsUploading(false);
      return;
    }

    setBulkResult(
      `Imported ${data.createdProducts || 0} products, created ${data.createdCategories || 0} categories.`
    );
    toast({
      title: "Import completed",
      message: `Imported ${data.createdProducts || 0} products.`,
      variant: "success",
    });
    setBulkErrors(data.errors || []);
    setBulkFile(null);
    await loadProducts();
    setIsUploading(false);
  };

  return (
    <div className="space-y-6">
      <div ref={formRef} className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Products</h2>
          <p className="text-sm text-gray-600">Manage your product catalog.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => {
              setIsBulkOpen(false);
              setIsFormOpen(false);
            }}
            className="px-4 py-2 text-sm font-semibold border border-gray-300 rounded-md bg-white hover:bg-gray-100"
          >
            Products list
          </button>
          <button
            type="button"
            onClick={() => {
              setForm(emptyForm);
              setEditingId(null);
              setIsFormOpen(true);
              setIsBulkOpen(false);
            }}
            className="px-4 py-2 text-sm font-semibold bg-primary-600 text-white rounded-md hover:bg-primary-700"
          >
            Add product
          </button>
          <button
            type="button"
            onClick={() => {
              setIsBulkOpen(true);
              setIsFormOpen(false);
            }}
            className="px-4 py-2 text-sm font-semibold border border-gray-300 rounded-md bg-white hover:bg-gray-100"
          >
            Bulk import
          </button>
        </div>
      </div>

      {isFormOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-3xl rounded-2xl bg-white p-6 shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">
                {isEditing ? "Edit Product" : "Add Product"}
              </h3>
              <button
                type="button"
                onClick={resetForm}
                className="text-sm text-gray-500 hover:text-gray-700"
              >
                Close
              </button>
            </div>
            <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-900 mb-1">Name</label>
            <input
              value={form.name}
              onChange={(event) => handleChange("name", event.target.value)}
              required
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-gray-900"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-900 mb-1">SKU</label>
            <input
              value={form.sku}
              onChange={(event) => handleChange("sku", event.target.value)}
              required
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-gray-900"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-900 mb-1">Slug</label>
            <input
              value={form.slug}
              onChange={(event) => handleChange("slug", event.target.value)}
              required
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-gray-900"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-900 mb-1">Category</label>
            <select
              value={form.categoryId}
              onChange={(event) => handleChange("categoryId", event.target.value)}
              required
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-gray-900"
            >
              <option value="">Select a category</option>
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
          </div>
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-900 mb-1">Description</label>
            <textarea
              value={form.description}
              onChange={(event) => handleChange("description", event.target.value)}
              required
              rows={3}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-gray-900"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-900 mb-1">Price</label>
            <input
              type="number"
              step="0.01"
              value={form.price === 0 ? "" : form.price}
              onChange={(event) =>
                handleChange("price", event.target.value === "" ? 0 : Number(event.target.value))
              }
              onWheel={(event) => (event.currentTarget as HTMLInputElement).blur()}
              required
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-gray-900"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-900 mb-1">Sale Price</label>
            <input
              type="number"
              step="0.01"
              value={form.salePrice ?? ""}
              onChange={(event) =>
                handleChange("salePrice", event.target.value ? Number(event.target.value) : null)
              }
              onWheel={(event) => (event.currentTarget as HTMLInputElement).blur()}
              disabled={!form.onSale}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-gray-900"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-900 mb-1">Main Image URL</label>
            <input
              value={form.mainImage}
              onChange={(event) => handleChange("mainImage", event.target.value)}
              required
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-gray-900"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-900 mb-1">Stock Quantity</label>
            <input
              type="number"
              value={form.stockQuantity === 0 ? "" : form.stockQuantity}
              onChange={(event) =>
                handleChange("stockQuantity", event.target.value === "" ? 0 : Number(event.target.value))
              }
              onWheel={(event) => (event.currentTarget as HTMLInputElement).blur()}
              required
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-gray-900"
            />
          </div>
          <div className="flex items-center gap-4">
            <label className="flex items-center gap-2 text-sm text-gray-900">
              <input
                type="checkbox"
                checked={form.featured}
                onChange={(event) => handleChange("featured", event.target.checked)}
              />
              Featured
            </label>
            <label className="flex items-center gap-2 text-sm text-gray-900">
              <input
                type="checkbox"
                checked={form.onSale}
                onChange={(event) => handleChange("onSale", event.target.checked)}
              />
              On Sale
            </label>
            <label className="flex items-center gap-2 text-sm text-gray-900">
              <input
                type="checkbox"
                checked={form.isActive}
                onChange={(event) => handleChange("isActive", event.target.checked)}
              />
              Active
            </label>
          </div>

          {error && <p className="text-sm text-red-600 md:col-span-2">{error}</p>}

          <div className="flex gap-2 md:col-span-2">
            <button
              type="submit"
              className="px-4 py-2 bg-primary-600 text-white rounded-md font-semibold hover:bg-primary-700"
            >
              {isEditing ? "Save changes" : "Add product"}
            </button>
            <button
              type="button"
              onClick={resetForm}
              className="px-4 py-2 bg-gray-100 text-gray-700 rounded-md font-semibold"
            >
              Cancel
            </button>
          </div>
        </form>
        </div>
      </div>
      )}

      {isBulkOpen && (
        <div className="border border-gray-200 rounded-xl p-6 bg-gray-50">
        <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">Bulk Import (CSV)</h2>
            <p className="text-sm text-gray-600">
              Upload a CSV to create products and categories in one step.
            </p>
          </div>
          <button
            type="button"
            onClick={downloadTemplate}
            className="px-4 py-2 text-sm font-semibold border border-gray-300 rounded-md bg-white hover:bg-gray-100"
          >
            Download template
          </button>
        </div>

        <div className="mt-4 grid gap-3 text-sm text-gray-600">
          <p>
            Required columns: <span className="font-semibold text-gray-900">name, sku, description, price, mainImage, categorySlug</span>
          </p>
          <p>
            Optional: slug, salePrice, stockQuantity, inStock, featured, onSale, isActive, brand, longDescription, images,
            categoryName, categoryDescription, categoryImage.
          </p>
          <p>
            For <span className="font-semibold text-gray-900">images</span>, use pipe-separated URLs (example:
            <span className="font-semibold text-gray-900"> url1|url2</span>) or a JSON array string.
          </p>
        </div>

        <form onSubmit={handleBulkUpload} className="mt-5 flex flex-col gap-4">
          <label className="flex flex-col items-center justify-center gap-2 border-2 border-dashed border-gray-300 rounded-lg p-6 text-sm text-gray-600 bg-white cursor-pointer hover:border-primary-500">
            <span className="font-semibold text-gray-900">
              {bulkFile ? bulkFile.name : "Click to choose a CSV file"}
            </span>
            <span>Only .csv files are supported</span>
            <input
              type="file"
              accept=".csv"
              onChange={(event) => setBulkFile(event.target.files?.[0] || null)}
              className="hidden"
            />
          </label>
          <button
            type="submit"
            disabled={isUploading}
            className="w-fit px-5 py-2.5 bg-primary-600 text-white rounded-md font-semibold hover:bg-primary-700 disabled:opacity-60"
          >
            {isUploading ? "Uploading..." : "Import CSV"}
          </button>
        </form>

        {bulkResult && <p className="text-sm text-green-700 mt-3">{bulkResult}</p>}
        {bulkErrors.length > 0 && (
          <div className="mt-3 text-sm text-red-700">
            <p className="font-semibold">Import errors:</p>
            <ul className="list-disc pl-5">
              {bulkErrors.slice(0, 5).map((err) => (
                <li key={`${err.row}-${err.message}`}>
                  Row {err.row}: {err.message}
                </li>
              ))}
            </ul>
            {bulkErrors.length > 5 && (
              <p className="mt-1 text-xs text-red-600">
                {bulkErrors.length - 5} more error(s) not shown.
              </p>
            )}
          </div>
        )}
      </div>
      )}

      {!isFormOpen && !isBulkOpen && (
        <div>
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Products</h2>
          {isLoading ? (
            <p className="text-gray-600">Loading products...</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm text-left border border-gray-200">
                <thead className="bg-gray-50 text-gray-700">
                  <tr>
                    <th className="px-3 py-2 border-b">Name</th>
                    <th className="px-3 py-2 border-b">Price</th>
                    <th className="px-3 py-2 border-b">Stock</th>
                    <th className="px-3 py-2 border-b">Status</th>
                    <th className="px-3 py-2 border-b">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {products.map((product) => (
                    <tr key={product.id} className="border-b">
                      <td className="px-3 py-2">{product.name}</td>
                      <td className="px-3 py-2">£{product.salePrice ?? product.price}</td>
                      <td className="px-3 py-2">{product.stockQuantity}</td>
                      <td className="px-3 py-2">{product.isActive ? "Active" : "Inactive"}</td>
                      <td className="px-3 py-2 space-x-2">
                        <button
                          onClick={() => handleEdit(product)}
                          className="text-primary-600 hover:text-primary-700 font-semibold"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDelete(product.id)}
                          className="text-red-600 hover:text-red-700 font-semibold"
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
