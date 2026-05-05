"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { Lock } from "lucide-react";
import { useSearchParams, useRouter } from "next/navigation";
import { useToast } from "@/components/ToastProvider";
import { PasswordInput } from "@/components/PasswordInput";

function ResetPasswordForm() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get("token");
  const { toast } = useToast();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [status, setStatus] = useState<"idle" | "success" | "error">("idle");
  const [message, setMessage] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus("idle");
    setMessage("");

    if (!token) {
      setStatus("error");
      setMessage("Reset token is missing.");
      toast({ title: "Missing token", message: "Reset token is missing.", variant: "error" });
      return;
    }

    if (password !== confirmPassword) {
      setStatus("error");
      setMessage("Passwords do not match.");
      toast({ title: "Password mismatch", message: "Please re-enter matching passwords.", variant: "error" });
      return;
    }

    try {
      const response = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data?.message || "Unable to reset password.");
      }
      setStatus("success");
      setMessage("Password updated successfully.");
      toast({ title: "Password updated", message: "You can now sign in.", variant: "success" });
      setTimeout(() => router.push("/login"), 1500);
    } catch (err) {
      setStatus("error");
      const msg = err instanceof Error ? err.message : "Unable to reset password.";
      setMessage(msg);
      toast({ title: "Reset failed", message: msg, variant: "error" });
    }
  };

  return (
    <div className="flex justify-center px-4 py-6 sm:py-8">
      <div className="w-full max-w-md bg-white border border-gray-200 rounded-2xl shadow-sm p-8">
        <div className="text-center mb-8">
          <div className="w-14 h-14 bg-primary-600 rounded-full flex items-center justify-center mx-auto mb-4">
            <Lock size={24} className="text-white" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900">Reset password</h1>
          <p className="text-gray-600 mt-2">Choose a new password</p>
        </div>

        {message && (
          <div
            className={`mb-4 rounded-lg border px-4 py-3 text-sm ${
              status === "error"
                ? "border-red-200 bg-red-50 text-red-700"
                : "border-green-200 bg-green-50 text-green-700"
            }`}
          >
            {message}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-900 mb-1">
              New password
            </label>
            <PasswordInput
              id="password"
              autoComplete="new-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          <div>
            <label
              htmlFor="confirmPassword"
              className="block text-sm font-medium text-gray-900 mb-1"
            >
              Confirm password
            </label>
            <PasswordInput
              id="confirmPassword"
              autoComplete="new-password"
              required
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
            />
          </div>
          <button
            type="submit"
            className="w-full bg-primary-600 text-white py-3 rounded-lg font-semibold hover:bg-primary-700 transition"
          >
            Update password
          </button>
        </form>

        <div className="mt-6 text-center text-sm text-gray-700">
          <Link href="/login" className="text-primary-600 hover:text-primary-700 font-medium">
            Back to sign in
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<div className="min-h-[40vh]" />}>
      <ResetPasswordForm />
    </Suspense>
  );
}
