"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { CheckCircle, XCircle } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { useAuthStore } from "@/lib/auth-store";
import { useToast } from "@/components/ToastProvider";

function VerifyContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  const { loadUser } = useAuthStore();
  const { toast } = useToast();
  const [status, setStatus] = useState<"idle" | "success" | "error">("idle");
  const [message, setMessage] = useState("");

  useEffect(() => {
    const verify = async () => {
      if (!token) {
        setStatus("error");
        setMessage("Verification token is missing.");
        toast({ title: "Missing token", message: "Verification token is missing.", variant: "error" });
        return;
      }
      try {
        const response = await fetch("/api/auth/verify", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token }),
        });
        const data = await response.json();
        if (!response.ok) {
          throw new Error(data?.message || "Verification failed.");
        }
        setStatus("success");
        setMessage("Your email is verified.");
        toast({ title: "Email verified", message: "You can sign in now.", variant: "success" });
        await loadUser();
      } catch (err) {
        setStatus("error");
        const msg = err instanceof Error ? err.message : "Verification failed.";
        setMessage(msg);
        toast({ title: "Verification failed", message: msg, variant: "error" });
      }
    };

    void verify();
  }, [token, loadUser]);

  return (
    <div className="flex items-center justify-center px-4 py-6 sm:py-8">
      <div className="w-full max-w-md bg-white border border-gray-200 rounded-2xl shadow-sm p-8 text-center">
        {status === "success" ? (
          <>
            <CheckCircle size={56} className="mx-auto text-green-600 mb-4" />
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Email verified</h1>
          </>
        ) : (
          <>
            <XCircle size={56} className="mx-auto text-red-600 mb-4" />
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Verification failed</h1>
          </>
        )}
        <p className="text-gray-700 mb-6">{message}</p>
        <Link
          href="/login"
          className="inline-block bg-primary-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-primary-700 transition"
        >
          Back to Sign In
        </Link>
      </div>
    </div>
  );
}

export default function VerifyPage() {
  return (
    <Suspense fallback={<div className="min-h-[40vh]" />}>
      <VerifyContent />
    </Suspense>
  );
}
