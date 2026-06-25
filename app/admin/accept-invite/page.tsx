"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Shield } from "lucide-react";

function AcceptInviteInner() {
  const params = useSearchParams();
  const token = params.get("token") || "";

  const [status, setStatus] = useState<"loading" | "valid" | "invalid" | "done">("loading");
  const [email, setEmail] = useState("");
  const [existingAccount, setExistingAccount] = useState(false);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!token) {
      setStatus("invalid");
      return;
    }
    (async () => {
      const response = await fetch(`/api/admin/invite/accept?token=${encodeURIComponent(token)}`);
      const data = await response.json().catch(() => ({}));
      if (!response.ok || !data.valid) {
        setStatus("invalid");
        return;
      }
      setEmail(data.email);
      setExistingAccount(Boolean(data.existingAccount));
      setStatus("valid");
    })();
  }, [token]);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setSubmitting(true);

    const response = await fetch("/api/admin/invite/accept", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(
        existingAccount ? { token } : { token, firstName, lastName, password }
      ),
    });
    const data = await response.json().catch(() => ({}));
    setSubmitting(false);

    if (!response.ok) {
      setError(data?.message || "Could not accept the invitation.");
      return;
    }
    setStatus("done");
  };

  if (status === "loading") {
    return <p className="text-gray-700">Checking your invitation...</p>;
  }

  if (status === "invalid") {
    return (
      <div className="text-center">
        <h1 className="text-2xl font-bold text-gray-900 mb-3">Invitation not valid</h1>
        <p className="text-gray-700 mb-6">
          This invitation link is invalid or has expired. Please ask the store owner to send a new one.
        </p>
        <Link
          href="/"
          className="inline-block bg-gray-100 text-gray-900 px-6 py-3 rounded-lg font-semibold hover:bg-gray-200 transition"
        >
          Back to Home
        </Link>
      </div>
    );
  }

  if (status === "done") {
    return (
      <div className="text-center">
        <h1 className="text-2xl font-bold text-gray-900 mb-3">You&rsquo;re all set</h1>
        <p className="text-gray-700 mb-6">Your admin access is ready. Sign in to get started.</p>
        <Link
          href="/admin/login"
          className="inline-block bg-primary-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-primary-700 transition"
        >
          Admin sign in
        </Link>
      </div>
    );
  }

  // status === "valid"
  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-2">Accept admin invitation</h1>
      <p className="text-gray-700 mb-6">
        Invitation for <strong>{email}</strong>.
      </p>

      {existingAccount ? (
        <form onSubmit={handleSubmit} className="space-y-4">
          <p className="text-gray-700">
            You already have an account with this email. Click below to activate your admin access,
            then sign in with your existing password.
          </p>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <button
            type="submit"
            disabled={submitting}
            className="px-4 py-2 bg-primary-600 text-white rounded-md font-semibold hover:bg-primary-700 disabled:opacity-60"
          >
            {submitting ? "Activating..." : "Activate admin access"}
          </button>
        </form>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-900 mb-1">First name</label>
              <input
                value={firstName}
                onChange={(event) => setFirstName(event.target.value)}
                required
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-gray-900"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-900 mb-1">Last name</label>
              <input
                value={lastName}
                onChange={(event) => setLastName(event.target.value)}
                required
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-gray-900"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-900 mb-1">Password</label>
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
              minLength={8}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-gray-900"
            />
            <p className="text-xs text-gray-500 mt-1">At least 8 characters.</p>
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <button
            type="submit"
            disabled={submitting}
            className="px-4 py-2 bg-primary-600 text-white rounded-md font-semibold hover:bg-primary-700 disabled:opacity-60"
          >
            {submitting ? "Creating account..." : "Create my admin account"}
          </button>
        </form>
      )}
    </div>
  );
}

export default function AcceptInvitePage() {
  return (
    <div className="min-h-screen">
      <div className="container mx-auto px-4 py-16 max-w-2xl">
        <div className="flex items-center gap-3 mb-8">
          <Shield size={28} className="text-primary-600" />
          <span className="text-lg font-semibold text-gray-900">PrintersRUs Admin</span>
        </div>
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <Suspense fallback={<p className="text-gray-700">Loading...</p>}>
            <AcceptInviteInner />
          </Suspense>
        </div>
      </div>
    </div>
  );
}
