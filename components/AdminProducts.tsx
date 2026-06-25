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

type ImageCandidate = {
  url: string;
  thumbnail: string;
  title: string;
  width?: number;
  height?: number;
};

type BulkPhase = "upload" | "importing";

type EnrichCounts = {
  pending: number;
  processing: number;
  done: number;
  failed: number;
  total: number;
};

type ImportSummary = {
  created: number;
  updated: number;
  createdCategories: number;
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
  const [bulkPhase, setBulkPhase] = useState<BulkPhase>("upload");
  const [bulkResult, setBulkResult] = useState<string | null>(null);
  const [bulkErrors, setBulkErrors] = useState<Array<{ row: number; message: string }>>([]);
  const [importSummary, setImportSummary] = useState<ImportSummary | null>(null);
  const [enrichCounts, setEnrichCounts] = useState<EnrichCounts | null>(null);
  const [enrichRunning, setEnrichRunning] = useState(false);
  const [isResuming, setIsResuming] = useState(false);
  // Highest "remaining to enrich" count seen since work started, so the progress
  // bar tracks the current batch (0→100%) instead of done/all-products.
  const enrichBaselineRef = useRef(0);
  const [isUploading, setIsUploading] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isBulkOpen, setIsBulkOpen] = useState(false);
  const [imageSearchOpen, setImageSearchOpen] = useState(false);
  const [imageSearchQuery, setImageSearchQuery] = useState("");
  const [imageSearchResults, setImageSearchResults] = useState<ImageCandidate[]>([]);
  const [imageSearchLoading, setImageSearchLoading] = useState(false);
  const { toast } = useToast();
  const formRef = useRef<HTMLDivElement | null>(null);

  const isEditing = useMemo(() => Boolean(editingId), [editingId]);

  const handleImageSearch = async (query?: string) => {
    const q = query || imageSearchQuery || form.name;
    if (!q.trim()) {
      toast({ title: "Enter a product name first", variant: "error" });
      return;
    }
    setImageSearchQuery(q);
    setImageSearchOpen(true);
    setImageSearchLoading(true);
    setImageSearchResults([]);
    try {
      const res = await fetch(`/api/admin/image-search?q=${encodeURIComponent(q)}`);
      const data = await res.json();
      setImageSearchResults(data.images || []);
    } catch {
      toast({ title: "Image search failed", variant: "error" });
    } finally {
      setImageSearchLoading(false);
    }
  };

  const handlePickerSearch = async (query: string) => {
    if (!query.trim()) {
      toast({ title: "Enter a search term", variant: "error" });
      return;
    }
    setImageSearchLoading(true);
    setImageSearchResults([]);
    try {
      const res = await fetch(`/api/admin/image-search?q=${encodeURIComponent(query)}`);
      const data = await res.json();
      setImageSearchResults(data.images || []);
    } catch {
      toast({ title: "Image search failed", variant: "error" });
    } finally {
      setImageSearchLoading(false);
    }
  };

  const selectImage = (url: string) => {
    handleChange("mainImage", url);
    setImageSearchOpen(false);
  };

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
      "Product_ID",
      "SKU",
      "Name",
      "Stock",
      "Price",
      "Brand",
      "Category",
      "Description",
      "SalePrice",
      "OnSale",
      "Featured",
      "IsActive",
      "Images",
    ];
    const sampleRows: string[][] = [
      [
        "7100290179",
        "10100MM",
        "Post-it Notes 38x51mm 100 Sheets Energetic Colours (Pack 12) 653-TFEN - 7100290179",
        "0",
        "8.29",
        "POST",
        "Sticky Notes",
        "",
        "",
        "false",
        "false",
        "true",
        "",
      ],
      [
        "189/46",
        "10101ST",
        "STABILO SENSOR Fine Liner Pen 0.3mm Line Black (Pack 10) - 189/46",
        "14",
        "10.68",
        "STAB",
        "Pens",
        "",
        "",
        "false",
        "false",
        "true",
        "",
      ],
    ];
    const quote = (value: string) => `"${value.replace(/"/g, '""')}"`;
    const csv = `${headers.join(",")}\n${sampleRows
      .map((row) => row.map(quote).join(","))
      .join("\n")}\n`;
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "products-template.csv";
    link.click();
    URL.revokeObjectURL(url);
  };

  const refreshEnrichStatus = async () => {
    try {
      const res = await fetch("/api/admin/products/enrich/status");
      if (!res.ok) return;
      const data = await res.json();
      if (data?.counts) {
        setEnrichCounts(data.counts);
        const remaining = (data.counts.pending || 0) + (data.counts.processing || 0);
        if (remaining > enrichBaselineRef.current) enrichBaselineRef.current = remaining;
        else if (remaining === 0) enrichBaselineRef.current = 0;
      }
      setEnrichRunning(Boolean(data?.running));
    } catch {
      // Non-fatal; the next poll will retry.
    }
  };

  // Poll enrichment progress while the bulk panel is open and work remains.
  useEffect(() => {
    if (!isBulkOpen) return;
    refreshEnrichStatus();
    const interval = setInterval(() => {
      refreshEnrichStatus();
    }, 3000);
    return () => clearInterval(interval);
  }, [isBulkOpen]);

  const handleBulkImport = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setBulkResult(null);
    setBulkErrors([]);
    setImportSummary(null);

    if (!bulkFile) {
      toast({ title: "Upload failed", message: "Please select a CSV file.", variant: "error" });
      return;
    }

    setIsUploading(true);
    setBulkPhase("importing");
    const formData = new FormData();
    formData.append("file", bulkFile);

    try {
      const response = await fetch("/api/admin/products/bulk", {
        method: "POST",
        body: formData,
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        toast({
          title: "Import failed",
          message: data?.message || "Failed to import CSV.",
          variant: "error",
        });
        setBulkPhase("upload");
        return;
      }

      setImportSummary({
        created: data.created || 0,
        updated: data.updated || 0,
        createdCategories: data.createdCategories || 0,
      });
      setBulkResult(
        `Imported ${data.created || 0} new product(s), updated ${data.updated || 0}, created ${
          data.createdCategories || 0
        } category(ies).`
      );
      setBulkErrors(data.errors || []);
      toast({
        title: "Import complete",
        message:
          (data.pendingEnrichment || 0) > 0
            ? `Fetching images & details for ${data.pendingEnrichment} new item(s) in the background.`
            : "No new items needed enrichment.",
        variant: "success",
      });
      setBulkFile(null);
      setBulkPhase("upload");
      await loadProducts();
      await loadCategories();
      await refreshEnrichStatus();
    } catch {
      toast({ title: "Import failed", message: "Network error.", variant: "error" });
      setBulkPhase("upload");
    } finally {
      setIsUploading(false);
    }
  };

  const handleResumeEnrichment = async () => {
    setIsResuming(true);
    try {
      const res = await fetch("/api/admin/products/enrich/resume", { method: "POST" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast({ title: "Could not resume", message: data?.message || "Failed.", variant: "error" });
        return;
      }
      if (data?.counts) setEnrichCounts(data.counts);
      toast({
        title: "Enrichment resumed",
        message: `Re-queued ${data.requeued || 0} item(s).`,
        variant: "success",
      });
      await refreshEnrichStatus();
    } catch {
      toast({ title: "Could not resume", message: "Network error.", variant: "error" });
    } finally {
      setIsResuming(false);
    }
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
          <div className="w-full max-w-3xl rounded-2xl bg-white p-6 shadow-xl max-h-[92vh] overflow-y-auto">
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
                <div className="flex gap-2">
                  <input
                    value={form.mainImage}
                    onChange={(event) => handleChange("mainImage", event.target.value)}
                    required
                    className="w-full rounded-md border border-gray-300 px-3 py-2 text-gray-900"
                    placeholder="Paste URL or search by product name"
                  />
                  <button
                    type="button"
                    onClick={() => handleImageSearch()}
                    className="shrink-0 px-3 py-2 text-sm font-semibold bg-gray-100 border border-gray-300 rounded-md hover:bg-gray-200 text-gray-700"
                    title="Search image by product name"
                  >
                    Search
                  </button>
                </div>
                {form.mainImage && (
                  <img
                    src={form.mainImage}
                    alt="Preview"
                    className="mt-2 h-20 w-20 rounded-md object-contain border border-gray-200 bg-white"
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = "none";
                    }}
                  />
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-900 mb-1">Stock Quantity</label>
                <input
                  type="number"
                  value={form.stockQuantity === 0 ? "" : form.stockQuantity}
                  onChange={(event) =>
                    handleChange(
                      "stockQuantity",
                      event.target.value === "" ? 0 : Number(event.target.value)
                    )
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

      {imageSearchOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 px-4">
          <div className="w-full max-w-4xl max-h-[85vh] rounded-2xl bg-white shadow-xl flex flex-col">
            <div className="flex items-center justify-between p-4 border-b">
              <h3 className="text-lg font-semibold text-gray-900">Search Product Image</h3>
              <button
                type="button"
                onClick={() => setImageSearchOpen(false)}
                className="text-sm text-gray-500 hover:text-gray-700"
              >
                Close
              </button>
            </div>
            <div className="flex gap-2 p-4 border-b">
              <input
                value={imageSearchQuery}
                onChange={(e) => setImageSearchQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handlePickerSearch(imageSearchQuery);
                  }
                }}
                placeholder="Search for product images..."
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-gray-900"
              />
              <button
                type="button"
                onClick={() => handlePickerSearch(imageSearchQuery)}
                disabled={imageSearchLoading}
                className="shrink-0 px-4 py-2 text-sm font-semibold bg-primary-600 text-white rounded-md hover:bg-primary-700 disabled:opacity-60"
              >
                {imageSearchLoading ? "Searching..." : "Search"}
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-4">
              {imageSearchLoading && (
                <p className="text-center text-gray-500 py-8">Searching for images...</p>
              )}
              {!imageSearchLoading && imageSearchResults.length === 0 && (
                <p className="text-center text-gray-500 py-8">
                  No images found. Try a different search term.
                </p>
              )}
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                {imageSearchResults.map((img, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => selectImage(img.url)}
                    className="group relative flex flex-col items-center rounded-lg border-2 border-transparent hover:border-primary-500 bg-gray-50 p-2 transition-colors"
                    title={img.title}
                  >
                    <img
                      src={img.thumbnail}
                      alt={img.title}
                      className="h-28 w-full rounded object-contain"
                      loading="lazy"
                    />
                    <span className="mt-1 text-xs text-gray-600 line-clamp-2 text-center">
                      {img.title}
                    </span>
                    {img.width && img.height && (
                      <span className="text-[10px] text-gray-400">
                        {img.width}x{img.height}
                      </span>
                    )}
                    <span className="absolute inset-0 flex items-center justify-center rounded-lg bg-primary-600/80 text-white text-sm font-semibold opacity-0 group-hover:opacity-100 transition-opacity">
                      Select
                    </span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {isBulkOpen && (
        <div className="border border-gray-200 rounded-xl p-6 bg-gray-50 space-y-6">
          <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="text-xl font-semibold text-gray-900">Bulk Import (CSV)</h2>
              <p className="text-sm text-gray-600">
                New items are imported instantly with a placeholder image, then images, features
                and specifications are fetched in the background. Re-uploading updates price, stock
                and details for existing SKUs &mdash; no re-fetching.
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

          <div className="grid gap-3 text-sm text-gray-600">
            <p>
              Required columns:{" "}
              <span className="font-semibold text-gray-900">SKU, Name, Price, Category</span>
            </p>
            <p>
              Optional: Stock, Brand, Description, Slug, SalePrice, InStock, Featured, OnSale,
              IsActive, LongDescription, Images, CategoryDescription, CategoryImage. Column names
              are case-insensitive. <code>Product_ID</code> is accepted and ignored.
            </p>
            <p>
              Items are matched by <span className="font-semibold text-gray-900">SKU</span>: an
              existing SKU is updated (price/stock/fields), a new SKU is imported and queued for
              image &amp; detail enrichment. Any number of rows is supported &mdash; items are
              written in batches and images/specifications are fetched in the background.
            </p>
          </div>

          <form onSubmit={handleBulkImport} className="flex flex-col gap-4">
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
              disabled={isUploading || bulkPhase === "importing"}
              className="w-fit px-5 py-2.5 bg-primary-600 text-white rounded-md font-semibold hover:bg-primary-700 disabled:opacity-60"
            >
              {bulkPhase === "importing" ? "Importing..." : "Import CSV"}
            </button>
          </form>

          {bulkResult && (
            <div className="rounded-md border border-green-200 bg-green-50 p-4 text-sm text-green-800">
              <p className="font-semibold">{bulkResult}</p>
              {importSummary && importSummary.created > 0 && (
                <p className="mt-1 text-green-700">
                  Image, features and specifications for the {importSummary.created} new item(s)
                  are being fetched in the background.
                </p>
              )}
            </div>
          )}

          {bulkErrors.length > 0 && (
            <div className="rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-700">
              <p className="font-semibold">{bulkErrors.length} row(s) skipped:</p>
              <ul className="list-disc pl-5 mt-1">
                {bulkErrors.slice(0, 8).map((err) => (
                  <li key={`${err.row}-${err.message}`}>
                    Row {err.row}: {err.message}
                  </li>
                ))}
              </ul>
              {bulkErrors.length > 8 && (
                <p className="mt-1 text-xs text-red-600">
                  {bulkErrors.length - 8} more error(s) not shown.
                </p>
              )}
            </div>
          )}

          {/* Background enrichment progress (tracks the current batch) */}
          {(() => {
            if (!enrichCounts) return null;
            const remaining = enrichCounts.pending + enrichCounts.processing;
            const baseline = Math.max(enrichBaselineRef.current, remaining);
            if (baseline === 0 && enrichCounts.failed === 0) return null;
            const enrichedThisBatch = Math.max(0, baseline - remaining);
            const pct = baseline > 0 ? Math.round((enrichedThisBatch / baseline) * 100) : 100;
            const canResume =
              enrichCounts.failed > 0 || (!enrichRunning && remaining > 0);
            return (
              <div className="rounded-md border border-gray-200 bg-white p-4">
                <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                  <div>
                    <h3 className="text-sm font-semibold text-gray-900">
                      Background enrichment
                      {enrichRunning && (
                        <span className="ml-2 text-xs font-normal text-primary-600">running…</span>
                      )}
                    </h3>
                    <p className="text-xs text-gray-600 mt-1">
                      {enrichedThisBatch} of {baseline} enriched · {remaining} remaining
                      {enrichCounts.failed > 0 && (
                        <span className="text-red-600"> · {enrichCounts.failed} failed</span>
                      )}
                    </p>
                  </div>
                  {canResume && (
                    <button
                      type="button"
                      onClick={handleResumeEnrichment}
                      disabled={isResuming}
                      className="px-3 py-1.5 text-xs font-semibold border border-gray-300 rounded-md bg-white hover:bg-gray-100 disabled:opacity-60"
                    >
                      {isResuming ? "Resuming…" : "Retry / resume"}
                    </button>
                  )}
                </div>
                <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-gray-200">
                  <div
                    className="h-full bg-primary-600 transition-all"
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </div>
            );
          })()}
        </div>
      )}

      {!isFormOpen && !isBulkOpen && (
        <div>
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
