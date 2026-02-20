"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useState, Suspense } from "react";

function VerifyEmailContent() {
  const searchParams = useSearchParams();
  const email = searchParams.get("email") ?? "";
  const showEmailHint = searchParams.get("hint") === "1";
  const [resending, setResending] = useState(false);
  const [resent, setResent] = useState(false);
  const [error, setError] = useState("");

  async function handleResend() {
    if (!email) return;
    setResending(true);
    setError("");
    setResent(false);

    try {
      const res = await fetch("/api/auth/resend-verification", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error ?? data.detail ?? "Failed to resend.");
      } else {
        setResent(true);
      }
    } catch {
      setError("Something went wrong.");
    } finally {
      setResending(false);
    }
  }

  return (
    <div className="min-h-[60vh] flex items-center justify-center">
      <div className="w-full max-w-md text-center">
        <div className="card-deco p-10">
          <div className="mb-6">
            <svg
              className="mx-auto w-16 h-16 text-sage"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={1.2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75"
              />
            </svg>
          </div>

          <h1 className="font-display text-3xl font-light text-obsidian mb-3">
            Check your email
          </h1>

          <p className="text-charcoal/70 mb-2">
            We sent a verification link to
          </p>
          {email && (
            <p className="text-sage font-medium mb-6">{email}</p>
          )}
          <p className="text-charcoal/60 text-sm mb-8">
            Click the link in the email to activate your account. The link expires in 24 hours.
          </p>

          {showEmailHint && (
            <div className="mb-4 p-3 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 text-sm text-left">
              The verification email could not be sent (e.g. RESEND_API_KEY not set or domain not verified in Resend). Check your spam folder, or try the resend button below after fixing email configuration.
            </div>
          )}

          {resent && (
            <div className="mb-4 p-3 rounded-lg bg-sage/10 border border-sage/20 text-sage text-sm">
              Verification email resent.
            </div>
          )}

          {error && (
            <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">
              {error}
            </div>
          )}

          {email && (
            <button
              onClick={handleResend}
              disabled={resending || resent}
              className="btn-deco text-sm disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {resending ? "Sending…" : resent ? "Sent" : "Resend verification email"}
            </button>
          )}
        </div>

        <p className="mt-6 text-sm text-charcoal/70">
          <Link href="/auth/login" className="text-sage font-medium hover:underline">
            Back to sign in
          </Link>
        </p>
      </div>
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense>
      <VerifyEmailContent />
    </Suspense>
  );
}
