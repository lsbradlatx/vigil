"use client";

import { useSession, signOut } from "next-auth/react";
import { Nav } from "@/components/Nav";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useTheme, type ThemePreference } from "@/components/ThemeProvider";

export function AuthHeader() {
  const { data: session, status } = useSession();
  const { theme, resolvedTheme, setTheme } = useTheme();

  const [themeOpen, setThemeOpen] = useState(false);
  const themeRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!themeOpen) return;
    const onDown = (e: MouseEvent) => {
      if (themeRef.current && !themeRef.current.contains(e.target as Node)) setThemeOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [themeOpen]);

  const setAndClose = (t: ThemePreference) => {
    setTheme(t);
    setThemeOpen(false);
  };

  const themeIcon = resolvedTheme === "dark" ? "☾" : "☼";
  const themeLabel = theme === "system" ? "System" : theme === "dark" ? "Dark" : "Light";

  return (
    <header className="nav">
      <div className="container flex items-center justify-between gap-3 h-full min-h-[72px]">
        <a
          href="/"
          className="font-display text-2xl font-medium text-obsidian tracking-tight hover:text-sage transition-colors"
        >
          Vigil
        </a>

        {status === "authenticated" && session?.user ? (
          <div className="flex items-center gap-3 min-w-0 overflow-visible">
            <Nav />
            <div className="flex items-center gap-3 ml-2 pl-3 border-l border-[var(--color-border)] whitespace-nowrap">
              <div ref={themeRef} className="relative">
                <button
                  type="button"
                  onClick={() => setThemeOpen((v) => !v)}
                  className="text-sm text-charcoal/70 hover:text-sage transition-colors px-2 py-1 rounded-full border border-[var(--color-border)] bg-[var(--color-surface)]"
                  aria-haspopup="true"
                  aria-expanded={themeOpen}
                  title={`Theme: ${themeLabel}`}
                >
                  <span className="mr-1">{themeIcon}</span>
                  {themeLabel}
                </button>
                {themeOpen && (
                  <div className="absolute right-0 top-full mt-1 w-44 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] shadow-lg z-50 overflow-hidden">
                    <ThemeOption label="System" active={theme === "system"} onClick={() => setAndClose("system")} />
                    <ThemeOption label="Light" active={theme === "light"} onClick={() => setAndClose("light")} />
                    <ThemeOption label="Dark" active={theme === "dark"} onClick={() => setAndClose("dark")} />
                  </div>
                )}
              </div>
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
          <div className="flex items-center gap-3 whitespace-nowrap">
            <div ref={themeRef} className="relative">
              <button
                type="button"
                onClick={() => setThemeOpen((v) => !v)}
                className="nav__link px-3 py-2 rounded-full border border-[var(--color-border)] bg-[var(--color-surface)]"
                aria-haspopup="true"
                aria-expanded={themeOpen}
                title={`Theme: ${themeLabel}`}
              >
                <span className="mr-1">{themeIcon}</span>
                {themeLabel}
              </button>
              {themeOpen && (
                <div className="absolute right-0 top-full mt-1 w-44 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] shadow-lg z-50 overflow-hidden">
                  <ThemeOption label="System" active={theme === "system"} onClick={() => setAndClose("system")} />
                  <ThemeOption label="Light" active={theme === "light"} onClick={() => setAndClose("light")} />
                  <ThemeOption label="Dark" active={theme === "dark"} onClick={() => setAndClose("dark")} />
                </div>
              )}
            </div>
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

function ThemeOption({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full text-left px-3 py-2 text-sm transition-colors ${
        active ? "text-sage font-semibold bg-sage-light/20" : "text-charcoal hover:bg-[var(--color-bg-alt)] hover:text-sage"
      }`}
    >
      <span className="inline-block w-5">{active ? "✓" : ""}</span>
      {label}
    </button>
  );
}
