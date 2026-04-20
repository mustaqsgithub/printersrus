"use client";

import { useEffect, useMemo, useState } from "react";
import { useToast } from "@/components/ToastProvider";

type Category = {
  id: string;
  name: string;
  slug: string;
  description?: string | null;
  image?: string | null;
};

const emptyForm: Category = {
  id: "",
  name: "",
  slug: "",
  description: "",
  image: "",
};

export function AdminCategories() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [form, setForm] = useState<Category>(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const isEditing = useMemo(() => Boolean(editingId), [editingId]);

  const loadCategories = async () => {
    setIsLoading(true);
    const response = await fetch("/api/admin/categories");
    const data = await response.json();
    setCategories(data.categories || []);
    setIsLoading(false);
  };

  useEffect(() => {
    loadCategories();
  }, []);

  const handleChange = (key: keyof Category, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const resetForm = () => {
    setForm(emptyForm);
    setEditingId(null);
    setError(null);
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);

    const response = await fetch("/api/admin/categories", {
      method: isEditing ? "PUT" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(isEditing ? { id: editingId, updates: form } : form),
    });

    if (!response.ok) {
      const data = await response.json();
      setError(data?.message || "Failed to save category.");
      toast({ title: "Save failed", message: data?.message || "Failed to save category.", variant: "error" });
      return;
    }

    toast({ title: isEditing ? "Category updated" : "Category added", variant: "success" });
    await loadCategories();
    resetForm();
  };

  const handleEdit = (category: Category) => {
    setForm(category);
    setEditingId(category.id);
  };

  const handleDelete = async (id: string) => {
    const response = await fetch(`/api/admin/categories?id=${id}`, {
      method: "DELETE",
    });

    if (!response.ok) {
      const data = await response.json();
      setError(data?.message || "Failed to delete category.");
      toast({ title: "Delete failed", message: data?.message || "Failed to delete category.", variant: "error" });
      return;
    }

    toast({ title: "Category deleted", variant: "success" });
    await loadCategories();
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-gray-900 mb-2">
          {isEditing ? "Edit Category" : "Add Category"}
        </h2>
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
            <label className="block text-sm font-medium text-gray-900 mb-1">Slug</label>
            <input
              value={form.slug}
              onChange={(event) => handleChange("slug", event.target.value)}
              required
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-gray-900"
            />
          </div>
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-900 mb-1">Description</label>
            <textarea
              value={form.description || ""}
              onChange={(event) => handleChange("description", event.target.value)}
              rows={3}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-gray-900"
            />
          </div>
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-900 mb-1">Image URL</label>
            <input
              value={form.image || ""}
              onChange={(event) => handleChange("image", event.target.value)}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-gray-900"
            />
          </div>

          {error && <p className="text-sm text-red-600 md:col-span-2">{error}</p>}

          <div className="flex gap-2 md:col-span-2">
            <button
              type="submit"
              className="px-4 py-2 bg-primary-600 text-white rounded-md font-semibold hover:bg-primary-700"
            >
              {isEditing ? "Save changes" : "Add category"}
            </button>
            {isEditing && (
              <button
                type="button"
                onClick={resetForm}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-md font-semibold"
              >
                Cancel
              </button>
            )}
          </div>
        </form>
      </div>

      <div>
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Categories</h2>
        {isLoading ? (
          <p className="text-gray-600">Loading categories...</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm text-left border border-gray-200">
              <thead className="bg-gray-50 text-gray-700">
                <tr>
                  <th className="px-3 py-2 border-b">Name</th>
                  <th className="px-3 py-2 border-b">Slug</th>
                  <th className="px-3 py-2 border-b">Actions</th>
                </tr>
              </thead>
              <tbody>
                {categories.map((category) => (
                  <tr key={category.id} className="border-b">
                    <td className="px-3 py-2">{category.name}</td>
                    <td className="px-3 py-2">{category.slug}</td>
                    <td className="px-3 py-2 space-x-2">
                      <button
                        onClick={() => handleEdit(category)}
                        className="text-primary-600 hover:text-primary-700 font-semibold"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDelete(category.id)}
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
    </div>
  );
}
