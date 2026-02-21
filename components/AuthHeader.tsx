"use client";

import { useSession, signOut } from "next-auth/react";
import { Nav } from "@/components/Nav";
import Link from "next/link";

export function AuthHeader() {
  const { data: session, status } = useSession();

  return (
    <header className="nav">
      <div className="container flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 h-full">
        <a
          href="/"
          className="font-display text-2xl font-medium text-obsidian tracking-tight hover:text-sage transition-colors"
        >
          Vigil
        </a>

        {status === "authenticated" && session?.user ? (
          <div className="flex items-center gap-4">
            <Nav />
            <div className="flex items-center gap-3 ml-2 pl-3 border-l border-[var(--color-border)]">
              <span className="text-sm text-charcoal/70">{session.user.name}</span>
              <button
                onClick={() => signOut({ callbackUrl: "/auth/login" })}
                className="text-sm text-charcoal/50 hover:text-sage transition-colors"
              >
                Sign out
              </button>
              <Link
                href="/account"
                className="text-sm text-charcoal/50 hover:text-sage transition-colors"
              >
                Manage account
              </Link>
            </div>
          </div>
        ) : status === "unauthenticated" ? (
          <div className="flex items-center gap-3">
            <Link
              href="/auth/login"
              className="nav__link px-3 py-2 rounded-full"
            >
              Sign in
            </Link>
            <Link
              href="/auth/signup"
              className="btn-deco-primary text-sm !py-1.5 !px-4"
            >
              Sign up
            </Link>
          </div>
        ) : null}
      </div>
    </header>
  );
}
