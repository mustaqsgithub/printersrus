"use client";

import { useEffect, useMemo, useState } from "react";
import { useToast } from "@/components/ToastProvider";

type User = {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone?: string | null;
  role: string;
  created_at: string;
};

const emptyForm = {
  firstName: "",
  lastName: "",
  email: "",
  phone: "",
  password: "",
  role: "admin",
};

export function AdminUsers() {
  const [users, setUsers] = useState<User[]>([]);
  const [form, setForm] = useState({ ...emptyForm });
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [resetPassword, setResetPassword] = useState<Record<string, string>>({});
  const { toast } = useToast();

  const sortedUsers = useMemo(
    () => [...users].sort((a, b) => a.email.localeCompare(b.email)),
    [users]
  );

  const loadUsers = async () => {
    setIsLoading(true);
    const response = await fetch("/api/admin/users");
    const data = await response.json();
    setUsers(data.users || []);
    setIsLoading(false);
  };

  useEffect(() => {
    loadUsers();
  }, []);

  const handleCreate = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);

    const response = await fetch("/api/admin/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });

    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      setError(data?.message || "Failed to create user.");
      toast({ title: "Create failed", message: data?.message || "Failed to create user.", variant: "error" });
      return;
    }

    toast({ title: "User created", variant: "success" });
    setForm({ ...emptyForm });
    await loadUsers();
  };

  const updateUser = async (id: string, updates: { role?: string; password?: string }) => {
    setSavingId(id);
    setError(null);

    const response = await fetch("/api/admin/users", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, ...updates }),
    });

    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      setError(data?.message || "Failed to update user.");
      toast({ title: "Update failed", message: data?.message || "Failed to update user.", variant: "error" });
      setSavingId(null);
      return;
    }

    toast({ title: "User updated", variant: "success" });
    setResetPassword((prev) => ({ ...prev, [id]: "" }));
    await loadUsers();
    setSavingId(null);
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-gray-900 mb-2">Add Admin/User</h2>
        <form onSubmit={handleCreate} className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-900 mb-1">First name</label>
            <input
              value={form.firstName}
              onChange={(event) => setForm((prev) => ({ ...prev, firstName: event.target.value }))}
              required
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-gray-900"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-900 mb-1">Last name</label>
            <input
              value={form.lastName}
              onChange={(event) => setForm((prev) => ({ ...prev, lastName: event.target.value }))}
              required
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-gray-900"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-900 mb-1">Email</label>
            <input
              type="email"
              value={form.email}
              onChange={(event) => setForm((prev) => ({ ...prev, email: event.target.value }))}
              required
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-gray-900"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-900 mb-1">Phone</label>
            <input
              value={form.phone}
              onChange={(event) => setForm((prev) => ({ ...prev, phone: event.target.value }))}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-gray-900"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-900 mb-1">Password</label>
            <input
              type="password"
              value={form.password}
              onChange={(event) => setForm((prev) => ({ ...prev, password: event.target.value }))}
              required
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-gray-900"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-900 mb-1">Role</label>
            <select
              value={form.role}
              onChange={(event) => setForm((prev) => ({ ...prev, role: event.target.value }))}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-gray-900"
            >
              <option value="admin">Admin</option>
              <option value="customer">Customer</option>
            </select>
          </div>

          {error && <p className="text-sm text-red-600 md:col-span-2">{error}</p>}

          <div className="md:col-span-2">
            <button
              type="submit"
              className="px-4 py-2 bg-primary-600 text-white rounded-md font-semibold hover:bg-primary-700"
            >
              Create user
            </button>
          </div>
        </form>
      </div>

      <div>
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Users</h2>
        {isLoading ? (
          <p className="text-gray-600">Loading users...</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm text-left border border-gray-200">
              <thead className="bg-gray-50 text-gray-700">
                <tr>
                  <th className="px-3 py-2 border-b">Name</th>
                  <th className="px-3 py-2 border-b">Email</th>
                  <th className="px-3 py-2 border-b">Role</th>
                  <th className="px-3 py-2 border-b">Reset Password</th>
                  <th className="px-3 py-2 border-b">Action</th>
                </tr>
              </thead>
              <tbody>
                {sortedUsers.map((user) => (
                  <tr key={user.id} className="border-b">
                    <td className="px-3 py-2">
                      {user.first_name} {user.last_name}
                    </td>
                    <td className="px-3 py-2">{user.email}</td>
                    <td className="px-3 py-2">
                      <select
                        value={user.role}
                        onChange={(event) =>
                          setUsers((prev) =>
                            prev.map((item) =>
                              item.id === user.id ? { ...item, role: event.target.value } : item
                            )
                          )
                        }
                        className="rounded-md border border-gray-300 px-2 py-1 text-gray-900"
                      >
                        <option value="admin">Admin</option>
                        <option value="customer">Customer</option>
                      </select>
                    </td>
                    <td className="px-3 py-2">
                      <input
                        type="password"
                        placeholder="New password"
                        value={resetPassword[user.id] || ""}
                        onChange={(event) =>
                          setResetPassword((prev) => ({
                            ...prev,
                            [user.id]: event.target.value,
                          }))
                        }
                        className="rounded-md border border-gray-300 px-2 py-1 text-gray-900"
                      />
                    </td>
                    <td className="px-3 py-2">
                      <button
                        onClick={() =>
                          updateUser(user.id, {
                            role: user.role,
                            password: resetPassword[user.id] || undefined,
                          })
                        }
                        disabled={savingId === user.id}
                        className="text-primary-600 hover:text-primary-700 font-semibold disabled:opacity-60"
                      >
                        {savingId === user.id ? "Saving..." : "Save"}
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
