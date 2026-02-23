"use client";

import { useSession, signOut } from "next-auth/react";
import { Nav } from "@/components/Nav";
import Link from "next/link";
import Image from "next/image";
import { useTheme, type ThemePreference } from "@/components/ThemeProvider";

export function AuthHeader() {
  const { data: session, status } = useSession();
  const { theme, resolvedTheme, setTheme } = useTheme();

  const themeIcon = resolvedTheme === "dark" ? "☾" : "☼";
  const themeLabel = theme === "system" ? "System" : theme === "dark" ? "Dark" : "Light";
  const logoSrc = resolvedTheme === "dark" ? "/logo-wordmark-dark.svg" : "/logo-wordmark-light.svg";

  return (
    <header className="nav overflow-visible">
      <div className="container flex items-center justify-between gap-3 h-full min-h-[72px] overflow-visible">
        <Link
          href="/"
          className="inline-flex items-center h-11 w-[148px] shrink-0"
          aria-label="Vigil home"
        >
          <Image
            src={logoSrc}
            alt="Vigil"
            width={148}
            height={42}
            priority
            className="h-10 w-auto"
          />
        </Link>

        {status === "authenticated" && session?.user ? (
          <div className="flex items-center gap-3 min-w-0 overflow-visible">
            <Nav />
            <div className="flex items-center gap-3 ml-2 pl-3 border-l border-[var(--color-border)] whitespace-nowrap">
              <ThemeSelect
                theme={theme}
                themeIcon={themeIcon}
                themeLabel={themeLabel}
                onChange={setTheme}
              />
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
            <ThemeSelect
              theme={theme}
              themeIcon={themeIcon}
              themeLabel={themeLabel}
              onChange={setTheme}
            />
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

function ThemeSelect({
  theme,
  themeIcon,
  themeLabel,
  onChange,
}: {
  theme: ThemePreference;
  themeIcon: string;
  themeLabel: string;
  onChange: (t: ThemePreference) => void;
}) {
  return (
    <label
      className="inline-flex items-center gap-1.5 rounded-full border border-[var(--color-border)] bg-[var(--color-surface)] px-2 py-1 text-sm text-charcoal/70"
      title={`Theme: ${themeLabel}`}
    >
      <span>{themeIcon}</span>
      <select
        value={theme}
        onChange={(e) => onChange(e.target.value as ThemePreference)}
        className="bg-transparent text-sm text-charcoal focus:outline-none cursor-pointer"
        aria-label="Theme"
      >
        <option value="system">System</option>
        <option value="light">Light</option>
        <option value="dark">Dark</option>
      </select>
    </label>
  );
}
