"use client";

import { useState } from "react";
import Link from "next/link";
import { signOut, useSession } from "next-auth/react";

export default function AccountPage() {
  const { data: session } = useSession();
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleDeleteAccount = async () => {
    if (deleting) return;
    setError(null);

    const confirmed = window.confirm(
      "Delete your account permanently? This removes your data and cannot be undone.",
    );
    if (!confirmed) return;

    const typed = window.prompt("Type DELETE to confirm account deletion.");
    if (typed !== "DELETE") return;

    setDeleting(true);
    try {
      const res = await fetch("/api/account/delete", { method: "POST" });
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(body.error ?? "Failed to delete account");
      }
      await signOut({ callbackUrl: "/auth/signup" });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to delete account");
      setDeleting(false);
    }
  };

  return (
    <div className="container py-[clamp(2rem,4vw,3rem)]">
      <div className="max-w-2xl mx-auto space-y-6">
        <section className="text-center py-4">
          <h1 className="font-display text-[clamp(2.1rem,4.8vw,3.2rem)] font-medium text-obsidian tracking-tight mb-2">
            Manage Account
          </h1>
          <p className="text-charcoal text-lg max-w-xl mx-auto">
            Update your account access and deletion settings.
          </p>
        </section>

        <section className="card-deco space-y-4">
          <h2 className="font-display text-2xl font-medium text-sage">Account Details</h2>
          <div className="space-y-1 text-sm text-charcoal">
            <p>
              <span className="font-medium">Username:</span>{" "}
              {session?.user?.name ?? "Unknown"}
            </p>
            <p>
              <span className="font-medium">Email:</span>{" "}
              {session?.user?.email ?? "Unknown"}
            </p>
          </div>
        </section>

        <section className="card-deco space-y-4 border-red-200">
          <h2 className="font-display text-2xl font-medium text-red-700">Danger Zone</h2>
          <p className="text-sm text-charcoal/80">
            Deleting your account permanently removes your data and cannot be undone.
          </p>
          {error && (
            <div className="rounded-md border border-red-200 bg-red-50 text-red-700 px-4 py-2 text-sm">
              {error}
            </div>
          )}
          <button
            type="button"
            onClick={handleDeleteAccount}
            disabled={deleting}
            className="btn-deco text-red-700 border-red-300 hover:!bg-red-700 hover:!text-white disabled:opacity-60"
          >
            {deleting ? "Deleting account..." : "Delete account"}
          </button>
        </section>

        <div className="flex justify-center">
          <Link href="/dashboard" className="btn-deco-primary">
            Back to Dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}
