"use client";

import { useEffect, useState } from "react";
import { useToast } from "@/components/ToastProvider";
import { useAuthStore } from "@/lib/auth-store";
import { isSuperAdminRole } from "@/lib/roles";

type Staff = {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  role: string;
  created_at: string;
};

type Invitation = {
  id: string;
  email: string;
  role: string;
  expires_at: string;
  created_at: string;
};

export function AdminUsers() {
  const { user } = useAuthStore();
  const [staff, setStaff] = useState<Staff[]>([]);
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [inviteEmail, setInviteEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isInviting, setIsInviting] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const { toast } = useToast();

  const load = async () => {
    setIsLoading(true);
    const response = await fetch("/api/admin/users");
    const data = await response.json().catch(() => ({}));
    setStaff(data.staff || []);
    setInvitations(data.invitations || []);
    setIsLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const handleInvite = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsInviting(true);

    const response = await fetch("/api/admin/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: inviteEmail }),
    });
    const data = await response.json().catch(() => ({}));
    setIsInviting(false);

    if (!response.ok) {
      toast({ title: "Invite failed", message: data?.message || "Could not send invite.", variant: "error" });
      return;
    }

    toast({ title: "Invitation sent", message: `Invite emailed to ${inviteEmail}.`, variant: "success" });
    if (data.previewUrl) {
      // Dev (Ethereal) only: surface the preview link so the invite can be tested.
      console.log("[INVITE] Preview URL:", data.previewUrl);
    }
    setInviteEmail("");
    await load();
  };

  const demote = async (id: string) => {
    setBusyId(id);
    const response = await fetch("/api/admin/users", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, action: "demote" }),
    });
    const data = await response.json().catch(() => ({}));
    setBusyId(null);

    if (!response.ok) {
      toast({ title: "Update failed", message: data?.message || "Could not update.", variant: "error" });
      return;
    }
    toast({ title: "Admin access removed", variant: "success" });
    await load();
  };

  const revoke = async (id: string) => {
    setBusyId(id);
    const response = await fetch("/api/admin/users", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    const data = await response.json().catch(() => ({}));
    setBusyId(null);

    if (!response.ok) {
      toast({ title: "Revoke failed", message: data?.message || "Could not revoke.", variant: "error" });
      return;
    }
    toast({ title: "Invitation revoked", variant: "success" });
    await load();
  };

  return (
    <div className="space-y-8">
      {/* Invite */}
      <div>
        <h2 className="text-xl font-semibold text-gray-900 mb-1">Invite an admin</h2>
        <p className="text-sm text-gray-600 mb-3">
          Enter their email. They&rsquo;ll get a link to set up their own login and become an admin.
        </p>
        <form onSubmit={handleInvite} className="flex flex-col sm:flex-row gap-3 max-w-xl">
          <input
            type="email"
            required
            value={inviteEmail}
            onChange={(event) => setInviteEmail(event.target.value)}
            placeholder="name@example.com"
            className="flex-1 rounded-md border border-gray-300 px-3 py-2 text-gray-900"
          />
          <button
            type="submit"
            disabled={isInviting}
            className="px-4 py-2 bg-primary-600 text-white rounded-md font-semibold hover:bg-primary-700 disabled:opacity-60"
          >
            {isInviting ? "Sending..." : "Send invite"}
          </button>
        </form>
      </div>

      {/* Pending invitations */}
      {invitations.length > 0 && (
        <div>
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Pending invitations</h2>
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm text-left border border-gray-200">
              <thead className="bg-gray-50 text-gray-700">
                <tr>
                  <th className="px-3 py-2 border-b">Email</th>
                  <th className="px-3 py-2 border-b">Expires</th>
                  <th className="px-3 py-2 border-b">Action</th>
                </tr>
              </thead>
              <tbody>
                {invitations.map((inv) => (
                  <tr key={inv.id} className="border-b">
                    <td className="px-3 py-2">{inv.email}</td>
                    <td className="px-3 py-2">{new Date(inv.expires_at).toLocaleDateString()}</td>
                    <td className="px-3 py-2">
                      <button
                        onClick={() => revoke(inv.id)}
                        disabled={busyId === inv.id}
                        className="text-red-600 hover:text-red-700 font-semibold disabled:opacity-60"
                      >
                        {busyId === inv.id ? "..." : "Revoke"}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Current staff */}
      <div>
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Staff</h2>
        {isLoading ? (
          <p className="text-gray-600">Loading staff...</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm text-left border border-gray-200">
              <thead className="bg-gray-50 text-gray-700">
                <tr>
                  <th className="px-3 py-2 border-b">Name</th>
                  <th className="px-3 py-2 border-b">Email</th>
                  <th className="px-3 py-2 border-b">Role</th>
                  <th className="px-3 py-2 border-b">Action</th>
                </tr>
              </thead>
              <tbody>
                {staff.map((member) => {
                  const isOwner = isSuperAdminRole(member.role);
                  const isSelf = member.id === user?.id;
                  return (
                    <tr key={member.id} className="border-b">
                      <td className="px-3 py-2">
                        {member.first_name} {member.last_name}
                      </td>
                      <td className="px-3 py-2">{member.email}</td>
                      <td className="px-3 py-2">
                        <span
                          className={`inline-block rounded-full px-2 py-0.5 text-xs font-semibold ${
                            isOwner ? "bg-amber-100 text-amber-800" : "bg-blue-100 text-blue-800"
                          }`}
                        >
                          {isOwner ? "Super admin" : "Admin"}
                        </span>
                      </td>
                      <td className="px-3 py-2">
                        {isOwner || isSelf ? (
                          <span className="text-gray-400">&mdash;</span>
                        ) : (
                          <button
                            onClick={() => demote(member.id)}
                            disabled={busyId === member.id}
                            className="text-red-600 hover:text-red-700 font-semibold disabled:opacity-60"
                          >
                            {busyId === member.id ? "..." : "Remove access"}
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
