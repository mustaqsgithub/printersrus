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

type StagedRow = {
  rowNumber: number;
  include: boolean;
  fields: {
    name: string;
    sku: string;
    slug: string;
    description: string;
    longDescription: string | null;
    price: number;
    salePrice: number | null;
    brand: string | null;
    stockQuantity: number;
    inStock: boolean;
    featured: boolean;
    onSale: boolean;
    isActive: boolean;
    images: string[];
  };
  category: {
    slug: string;
    name: string | null;
    description: string | null;
    image: string | null;
    willCreate: boolean;
  };
  mainImage: string | null;
  candidateImages: ImageCandidate[];
  errors: string[];
};

type BulkPhase = "upload" | "review" | "submitting";

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

const validateStagedRow = (row: StagedRow): string[] => {
  const errors: string[] = [];
  if (!row.fields.sku?.trim()) errors.push("Missing SKU");
  if (!row.fields.name?.trim()) errors.push("Missing Name");
  if (!row.fields.slug?.trim()) errors.push("Missing slug");
  if (!row.category.slug?.trim()) errors.push("Missing Category");
  if (row.category.willCreate && !row.category.name?.trim())
    errors.push("Missing Category name (required to create new category)");
  if (!row.mainImage?.trim()) errors.push("Missing main image");
  return errors;
};

export function AdminProducts() {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [form, setForm] = useState<Product>(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingStagedIndex, setEditingStagedIndex] = useState<number | null>(null);
  const [stagedCategoryEdit, setStagedCategoryEdit] = useState<{
    name: string;
    slug: string;
    willCreate: boolean;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [bulkFile, setBulkFile] = useState<File | null>(null);
  const [bulkPhase, setBulkPhase] = useState<BulkPhase>("upload");
  const [stagedRows, setStagedRows] = useState<StagedRow[]>([]);
  const [bulkResult, setBulkResult] = useState<string | null>(null);
  const [bulkErrors, setBulkErrors] = useState<Array<{ row: number; message: string }>>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isBulkOpen, setIsBulkOpen] = useState(false);
  const [imageSearchOpen, setImageSearchOpen] = useState(false);
  const [imageSearchQuery, setImageSearchQuery] = useState("");
  const [imageSearchResults, setImageSearchResults] = useState<ImageCandidate[]>([]);
  const [imageSearchLoading, setImageSearchLoading] = useState(false);
  // "form" = picker is targeting the create/edit form; number = staged row at that index
  const [imagePickerTarget, setImagePickerTarget] = useState<"form" | number>("form");
  const { toast } = useToast();
  const formRef = useRef<HTMLDivElement | null>(null);

  const isEditing = useMemo(() => Boolean(editingId), [editingId]);
  const isStagedEdit = useMemo(() => editingStagedIndex !== null, [editingStagedIndex]);

  const handleImageSearch = async (query?: string) => {
    const q = query || imageSearchQuery || form.name;
    if (!q.trim()) {
      toast({ title: "Enter a product name first", variant: "error" });
      return;
    }
    setImageSearchQuery(q);
    setImagePickerTarget("form");
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

  const openStagedImagePicker = (index: number) => {
    const row = stagedRows[index];
    if (!row) return;
    setImagePickerTarget(index);
    setImageSearchQuery(row.fields.name);
    setImageSearchResults(row.candidateImages || []);
    setImageSearchLoading(false);
    setImageSearchOpen(true);
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
    if (imagePickerTarget === "form") {
      handleChange("mainImage", url);
    } else {
      const idx = imagePickerTarget;
      setStagedRows((prev) =>
        prev.map((row, i) => {
          if (i !== idx) return row;
          const next = { ...row, mainImage: url };
          return { ...next, errors: validateStagedRow(next) };
        })
      );
    }
    setImageSearchOpen(false);
    setImagePickerTarget("form");
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
    setEditingStagedIndex(null);
    setStagedCategoryEdit(null);
    setError(null);
    setIsFormOpen(false);
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);

    if (isStagedEdit && editingStagedIndex !== null) {
      const idx = editingStagedIndex;
      setStagedRows((prev) =>
        prev.map((row, i) => {
          if (i !== idx) return row;
          const updatedFields = {
            ...row.fields,
            name: form.name,
            sku: form.sku,
            slug: form.slug,
            description: form.description,
            price: Number(form.price) || 0,
            salePrice: form.onSale && form.salePrice ? Number(form.salePrice) : null,
            stockQuantity: Number(form.stockQuantity) || 0,
            inStock: (Number(form.stockQuantity) || 0) > 0,
            featured: form.featured,
            onSale: form.onSale,
            isActive: form.isActive,
          };
          let updatedCategory = row.category;
          if (stagedCategoryEdit) {
            updatedCategory = {
              ...row.category,
              name: stagedCategoryEdit.name || row.category.name,
              slug: stagedCategoryEdit.slug || row.category.slug,
              willCreate: stagedCategoryEdit.willCreate,
            };
          } else if (form.categoryId) {
            const picked = categories.find((c) => c.id === form.categoryId);
            if (picked) {
              updatedCategory = {
                ...row.category,
                slug: picked.slug,
                name: picked.name,
                willCreate: false,
              };
            }
          }
          const next: StagedRow = {
            ...row,
            fields: updatedFields,
            category: updatedCategory,
            mainImage: form.mainImage || row.mainImage,
          };
          return { ...next, errors: validateStagedRow(next) };
        })
      );
      toast({ title: "Row updated", variant: "success" });
      resetForm();
      return;
    }

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
    setEditingStagedIndex(null);
    setStagedCategoryEdit(null);
    setIsFormOpen(true);
    requestAnimationFrame(() => {
      formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  };

  const handleEditStaged = (index: number) => {
    const row = stagedRows[index];
    if (!row) return;
    const existingCat = categories.find((c) => c.slug === row.category.slug);
    setForm({
      id: "",
      name: row.fields.name,
      slug: row.fields.slug,
      sku: row.fields.sku,
      description: row.fields.description,
      price: row.fields.price,
      salePrice: row.fields.salePrice ?? null,
      mainImage: row.mainImage || "",
      categoryId: existingCat?.id || "",
      stockQuantity: row.fields.stockQuantity,
      featured: row.fields.featured,
      onSale: row.fields.onSale,
      isActive: row.fields.isActive,
    });
    setEditingId(null);
    setEditingStagedIndex(index);
    setStagedCategoryEdit({
      name: row.category.name || "",
      slug: row.category.slug,
      willCreate: row.category.willCreate || !existingCat,
    });
    setIsFormOpen(true);
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
      "MainImage",
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

  const handleBulkPreview = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setBulkResult(null);
    setBulkErrors([]);

    if (!bulkFile) {
      toast({ title: "Upload failed", message: "Please select a CSV file.", variant: "error" });
      return;
    }

    setIsUploading(true);
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
          title: "Preview failed",
          message: data?.message || "Failed to preview CSV.",
          variant: "error",
        });
        return;
      }
      const rows: StagedRow[] = (data.rows || []).map((row: StagedRow) => ({
        ...row,
        errors: validateStagedRow(row),
      }));
      setStagedRows(rows);
      setBulkPhase("review");
      toast({
        title: `Previewed ${rows.length} rows`,
        message: "Review and confirm to import.",
        variant: "success",
      });
    } catch {
      toast({ title: "Preview failed", message: "Network error.", variant: "error" });
    } finally {
      setIsUploading(false);
    }
  };

  const handleBulkConfirm = async () => {
    const includedRows = stagedRows.filter((r) => r.include);
    const rowsWithErrors = includedRows.filter((r) => r.errors.length > 0);
    if (includedRows.length === 0) {
      toast({ title: "Select at least one row to import", variant: "error" });
      return;
    }
    if (rowsWithErrors.length > 0) {
      toast({
        title: "Cannot import",
        message: `${rowsWithErrors.length} included row(s) still have errors. Edit or deselect them first.`,
        variant: "error",
      });
      return;
    }

    setBulkPhase("submitting");
    try {
      const response = await fetch("/api/admin/products/bulk/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rows: includedRows }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        toast({
          title: "Import failed",
          message: data?.message || "Failed to import.",
          variant: "error",
        });
        setBulkPhase("review");
        return;
      }
      setBulkResult(
        `Imported ${data.createdProducts || 0} products, created ${data.createdCategories || 0} categories.`
      );
      setBulkErrors(data.errors || []);
      toast({
        title: "Import completed",
        message: `Imported ${data.createdProducts || 0} products.`,
        variant: "success",
      });
      setStagedRows([]);
      setBulkFile(null);
      setBulkPhase("upload");
      await loadProducts();
      await loadCategories();
    } catch {
      toast({ title: "Import failed", message: "Network error.", variant: "error" });
      setBulkPhase("review");
    }
  };

  const toggleRowInclude = (index: number) =>
    setStagedRows((prev) =>
      prev.map((r, i) => (i === index ? { ...r, include: !r.include } : r))
    );

  const setAllInclude = (value: boolean) =>
    setStagedRows((prev) =>
      prev.map((r) => ({ ...r, include: value && r.errors.length === 0 ? true : value ? r.include : false }))
    );

  const includedCount = stagedRows.filter((r) => r.include).length;
  const erroredIncludedCount = stagedRows.filter((r) => r.include && r.errors.length > 0).length;

  const resetBulk = () => {
    setStagedRows([]);
    setBulkFile(null);
    setBulkPhase("upload");
    setBulkResult(null);
    setBulkErrors([]);
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
              setEditingStagedIndex(null);
              setStagedCategoryEdit(null);
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
                {isStagedEdit
                  ? `Edit Row ${stagedRows[editingStagedIndex!]?.rowNumber}`
                  : isEditing
                    ? "Edit Product"
                    : "Add Product"}
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
                {isStagedEdit && stagedCategoryEdit?.willCreate ? (
                  <div className="space-y-2">
                    <input
                      value={stagedCategoryEdit.name}
                      onChange={(e) =>
                        setStagedCategoryEdit((prev) =>
                          prev ? { ...prev, name: e.target.value } : prev
                        )
                      }
                      placeholder="New category name"
                      className="w-full rounded-md border border-gray-300 px-3 py-2 text-gray-900"
                    />
                    <input
                      value={stagedCategoryEdit.slug}
                      onChange={(e) =>
                        setStagedCategoryEdit((prev) =>
                          prev ? { ...prev, slug: e.target.value } : prev
                        )
                      }
                      placeholder="New category slug"
                      className="w-full rounded-md border border-gray-300 px-3 py-2 text-gray-900"
                    />
                    <p className="text-xs text-amber-700">
                      This category will be created on confirm.
                    </p>
                  </div>
                ) : (
                  <select
                    value={form.categoryId}
                    onChange={(event) => {
                      handleChange("categoryId", event.target.value);
                      if (isStagedEdit) {
                        const picked = categories.find((c) => c.id === event.target.value);
                        if (picked) {
                          setStagedCategoryEdit({
                            name: picked.name,
                            slug: picked.slug,
                            willCreate: false,
                          });
                        }
                      }
                    }}
                    required={!isStagedEdit}
                    className="w-full rounded-md border border-gray-300 px-3 py-2 text-gray-900"
                  >
                    <option value="">Select a category</option>
                    {categories.map((category) => (
                      <option key={category.id} value={category.id}>
                        {category.name}
                      </option>
                    ))}
                  </select>
                )}
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
                  {isStagedEdit ? "Save row" : isEditing ? "Save changes" : "Add product"}
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
              <h3 className="text-lg font-semibold text-gray-900">
                {imagePickerTarget === "form"
                  ? "Search Product Image"
                  : `Pick image for row ${stagedRows[imagePickerTarget as number]?.rowNumber ?? ""}`}
              </h3>
              <button
                type="button"
                onClick={() => {
                  setImageSearchOpen(false);
                  setImagePickerTarget("form");
                }}
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

      {isBulkOpen && bulkPhase === "upload" && (
        <div className="border border-gray-200 rounded-xl p-6 bg-gray-50">
          <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="text-xl font-semibold text-gray-900">Bulk Import (CSV)</h2>
              <p className="text-sm text-gray-600">
                Upload a CSV. We&apos;ll auto-fetch a product image per row from DuckDuckGo, then
                let you review every item before importing.
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
              Required columns:{" "}
              <span className="font-semibold text-gray-900">SKU, Name, Price, Category</span>
            </p>
            <p>
              Optional: Stock, Brand, Description, MainImage, Slug, SalePrice, InStock, Featured,
              OnSale, IsActive, LongDescription, Images, CategoryDescription, CategoryImage.
              Column names are case-insensitive (e.g. <code>SKU</code>, <code>sku</code>, and{" "}
              <code>Sku</code> all work). <code>Product_ID</code> is accepted and ignored.
            </p>
            <p>
              <span className="font-semibold text-gray-900">Category</span> can be a display name
              (e.g. <em>&quot;Sticky Notes&quot;</em>) or a slug. We slugify it automatically. New
              categories are created on confirm.
            </p>
            <p>
              <span className="font-semibold text-gray-900">MainImage</span> is optional. If
              omitted, an image is auto-picked from a DuckDuckGo search using the row&apos;s{" "}
              <span className="font-semibold text-gray-900">Description</span> if present,
              otherwise the <span className="font-semibold text-gray-900">Name</span>. You can
              swap it in the review step.
            </p>
            <p>Max 100 rows per upload.</p>
          </div>

          <form onSubmit={handleBulkPreview} className="mt-5 flex flex-col gap-4">
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
              {isUploading ? "Fetching images... this may take a minute" : "Preview & fetch images"}
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

      {isBulkOpen && (bulkPhase === "review" || bulkPhase === "submitting") && (
        <div className="border border-gray-200 rounded-xl p-6 bg-gray-50">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between mb-4">
            <div>
              <h2 className="text-xl font-semibold text-gray-900">Review staged products</h2>
              <p className="text-sm text-gray-600">
                {stagedRows.length} row(s) staged. {includedCount} selected for import.
                {erroredIncludedCount > 0 && (
                  <span className="text-red-600 font-semibold">
                    {" "}
                    {erroredIncludedCount} selected row(s) have errors and must be fixed.
                  </span>
                )}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setAllInclude(true)}
                className="px-3 py-1.5 text-xs font-semibold border border-gray-300 rounded-md bg-white hover:bg-gray-100"
              >
                Select all
              </button>
              <button
                type="button"
                onClick={() => setAllInclude(false)}
                className="px-3 py-1.5 text-xs font-semibold border border-gray-300 rounded-md bg-white hover:bg-gray-100"
              >
                Deselect all
              </button>
              <button
                type="button"
                onClick={resetBulk}
                disabled={bulkPhase === "submitting"}
                className="px-3 py-1.5 text-xs font-semibold border border-gray-300 rounded-md bg-white hover:bg-gray-100 disabled:opacity-50"
              >
                Discard & re-upload
              </button>
              <button
                type="button"
                onClick={handleBulkConfirm}
                disabled={
                  bulkPhase === "submitting" ||
                  includedCount === 0 ||
                  erroredIncludedCount > 0
                }
                className="px-4 py-1.5 text-sm font-semibold bg-primary-600 text-white rounded-md hover:bg-primary-700 disabled:opacity-60"
              >
                {bulkPhase === "submitting"
                  ? "Importing..."
                  : `Confirm import (${includedCount})`}
              </button>
            </div>
          </div>

          <div className="overflow-x-auto bg-white rounded-md border border-gray-200">
            <table className="min-w-full text-sm text-left">
              <thead className="bg-gray-50 text-gray-700">
                <tr>
                  <th className="px-3 py-2 border-b w-10"></th>
                  <th className="px-3 py-2 border-b w-20">Row</th>
                  <th className="px-3 py-2 border-b">Image</th>
                  <th className="px-3 py-2 border-b">Name / SKU</th>
                  <th className="px-3 py-2 border-b">Price / Stock</th>
                  <th className="px-3 py-2 border-b">Category</th>
                  <th className="px-3 py-2 border-b">Issues</th>
                  <th className="px-3 py-2 border-b">Actions</th>
                </tr>
              </thead>
              <tbody>
                {stagedRows.map((row, index) => {
                  const hasErrors = row.errors.length > 0;
                  return (
                    <tr
                      key={`${row.rowNumber}-${index}`}
                      className={`border-b ${row.include ? "" : "opacity-50"} ${
                        hasErrors && row.include ? "bg-red-50" : ""
                      }`}
                    >
                      <td className="px-3 py-2 align-top">
                        <input
                          type="checkbox"
                          checked={row.include}
                          onChange={() => toggleRowInclude(index)}
                        />
                      </td>
                      <td className="px-3 py-2 align-top text-gray-600">{row.rowNumber}</td>
                      <td className="px-3 py-2 align-top">
                        <button
                          type="button"
                          onClick={() => openStagedImagePicker(index)}
                          className="block group relative h-16 w-16 rounded border border-gray-200 bg-gray-50 overflow-hidden hover:border-primary-500"
                          title="Click to change image"
                        >
                          {row.mainImage ? (
                            <img
                              src={row.mainImage}
                              alt={row.fields.name}
                              className="h-full w-full object-contain"
                              onError={(e) => {
                                (e.target as HTMLImageElement).style.visibility = "hidden";
                              }}
                            />
                          ) : (
                            <span className="absolute inset-0 flex items-center justify-center text-[10px] text-gray-500 text-center px-1">
                              No image
                            </span>
                          )}
                          <span className="absolute inset-0 flex items-center justify-center bg-black/50 text-white text-[10px] font-semibold opacity-0 group-hover:opacity-100 transition-opacity">
                            Change
                          </span>
                        </button>
                        <p className="text-[10px] text-gray-400 mt-0.5">
                          {row.candidateImages.length} options
                        </p>
                      </td>
                      <td className="px-3 py-2 align-top">
                        <p className="font-medium text-gray-900">
                          {row.fields.name || <span className="text-red-600">(missing)</span>}
                        </p>
                        <p className="text-xs text-gray-500">
                          {row.fields.sku || <span className="text-red-600">(no SKU)</span>}
                        </p>
                      </td>
                      <td className="px-3 py-2 align-top text-gray-700">
                        <p>£{row.fields.price?.toFixed(2) ?? "0.00"}</p>
                        <p className="text-xs text-gray-500">Stock: {row.fields.stockQuantity}</p>
                      </td>
                      <td className="px-3 py-2 align-top text-gray-700">
                        <p>{row.category.slug || <span className="text-red-600">(missing)</span>}</p>
                        {row.category.willCreate && (
                          <span className="inline-block mt-1 text-[10px] font-semibold uppercase tracking-wide text-amber-700 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded">
                            New: {row.category.name || "—"}
                          </span>
                        )}
                      </td>
                      <td className="px-3 py-2 align-top">
                        {hasErrors ? (
                          <ul className="text-xs text-red-700 space-y-0.5 list-disc pl-4">
                            {row.errors.map((err, i) => (
                              <li key={i}>{err}</li>
                            ))}
                          </ul>
                        ) : (
                          <span className="text-xs text-green-700 font-semibold">OK</span>
                        )}
                      </td>
                      <td className="px-3 py-2 align-top">
                        <button
                          type="button"
                          onClick={() => handleEditStaged(index)}
                          disabled={bulkPhase === "submitting"}
                          className="text-primary-600 hover:text-primary-700 font-semibold disabled:opacity-60"
                        >
                          Edit
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
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
