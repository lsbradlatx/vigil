"use client";

import { signIn } from "next-auth/react";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import { useState, Suspense } from "react";
import { ScrollReveal } from "@/components/ScrollReveal";

function LoginForm() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const verified = searchParams.get("verified") === "true";
  const errorParam = searchParams.get("error");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const tokenErrors: Record<string, string> = {
    missing_token: "Verification link is invalid.",
    invalid_token: "Verification link is invalid or has already been used.",
    expired_token: "Verification link has expired. Please request a new one.",
    verification_failed: "Verification failed. Please try again.",
    session_expired: "Your session expired after an account reset. Please sign in again.",
  };

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const normalizedEmail = email.trim().toLowerCase();
    const precheck = await fetch("/api/auth/login-check", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: normalizedEmail, password }),
    });
    const precheckBody = await precheck.json().catch(() => ({})) as {
      code?: string;
      message?: string;
    };
    if (!precheck.ok) {
      if (precheckBody.code === "EMAIL_NOT_VERIFIED") {
        setError("Your account exists, but your email is not verified yet. Go to verify-email and resend the verification link.");
      } else {
        setError(precheckBody.message ?? "Could not sign in. Check your details and try again.");
      }
      setLoading(false);
      return;
    }

    const result = await signIn("credentials", {
      email: normalizedEmail,
      password,
      redirect: false,
    });

    setLoading(false);

    if (result?.error) {
      if (result.error.includes("EMAIL_NOT_VERIFIED")) {
        setError("Please verify your email before signing in. Check your inbox for a verification link.");
      } else if (result.error.includes("CredentialsSignin")) {
        setError("Sign-in failed. If this persists, your account may not exist in the current database.");
      } else {
        setError("Invalid email or password.");
      }
      return;
    }

    router.push("/dashboard");
    router.refresh();
  }

  return (
    <div className="container py-[clamp(2rem,4vw,3rem)] min-h-[60vh] flex items-center justify-center">
      <ScrollReveal animation="scale-in">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="font-display text-[clamp(2rem,4.4vw,2.7rem)] font-light text-obsidian mb-2">
            Welcome back
          </h1>
          <p className="text-charcoal/70">Sign in to your Vigil account</p>
        </div>

        {verified && (
          <div className="mb-6 p-4 rounded-lg bg-sage/10 border border-sage/20 text-sage text-sm text-center">
            Email verified successfully. You can now sign in.
          </div>
        )}

        {errorParam && tokenErrors[errorParam] && (
          <div className="mb-6 p-4 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm text-center">
            {tokenErrors[errorParam]}
          </div>
        )}

        {error && (
          <div className="mb-6 p-4 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm text-center">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="card-deco card-no-lift p-8 space-y-5">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-charcoal mb-1.5">
              Email
            </label>
            <input
              id="email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="input-deco"
              placeholder="you@example.com"
              autoComplete="email"
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-charcoal mb-1.5">
              Password
            </label>
            <input
              id="password"
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="input-deco"
              placeholder="••••••••"
              autoComplete="current-password"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="btn-deco-primary w-full disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? "Signing in…" : "Sign In"}
          </button>
        </form>

        <p className="text-center mt-6 text-sm text-charcoal/70">
          Don&apos;t have an account?{" "}
          <Link href="/auth/signup" className="text-sage font-medium hover:underline">
            Create one
          </Link>
        </p>
      </div>
      </ScrollReveal>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
