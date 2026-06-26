"use client";

import { useState } from "react";
import Link from "next/link";
import { Mail } from "lucide-react";
import { useToast } from "@/components/ToastProvider";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "success" | "error">("idle");
  const [message, setMessage] = useState("");
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus("idle");
    setMessage("");

    try {
      const response = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim() }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data?.message || "Unable to request reset link.");
      }
      setStatus("success");
      setMessage("If that email exists, a reset link has been sent. Please check your inbox.");
      toast({
        title: "Reset link sent",
        message: "If the email exists, it will receive a reset link.",
        variant: "success",
      });
    } catch (err) {
      setStatus("error");
      setMessage(err instanceof Error ? err.message : "Unable to request reset link.");
      toast({
        title: "Reset failed",
        message: err instanceof Error ? err.message : "Unable to request reset link.",
        variant: "error",
      });
    }
  };

  return (
    <div className="flex justify-center px-4 py-6 sm:py-8">
      <div className="w-full max-w-md bg-white border border-gray-200 rounded-2xl shadow-sm p-8">
        <div className="text-center mb-8">
          <div className="w-14 h-14 bg-primary-600 rounded-full flex items-center justify-center mx-auto mb-4">
            <Mail size={24} className="text-white" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900">Forgot password</h1>
          <p className="text-gray-600 mt-2">We will email you a reset link</p>
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
            <label htmlFor="email" className="block text-sm font-medium text-gray-900 mb-1">
              Email address
            </label>
            <input
              id="email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 text-gray-900 bg-white placeholder:text-gray-400"
            />
          </div>
          <button
            type="submit"
            className="w-full bg-primary-600 text-white py-3 rounded-lg font-semibold hover:bg-primary-700 transition"
          >
            Send reset link
          </button>
        </form>

        <div className="mt-6 text-center text-sm text-gray-700">
          Remembered your password?{" "}
          <Link href="/login" className="text-primary-600 hover:text-primary-700 font-medium">
            Sign in
          </Link>
        </div>
      </div>
    </div>
  );
}
