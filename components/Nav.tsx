"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useRef, useEffect } from "react";
import { prefetchRouteData } from "@/lib/route-prefetch";

const appLinks = [
  { href: "/stimulant", label: "Stimulants" },
  { href: "/calendar", label: "Calendar" },
  { href: "/todos", label: "To-dos" },
];

export function Nav() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const isAppActive = appLinks.some(
    (l) => pathname === l.href || pathname.startsWith(l.href)
  );

  const handleMouseEnter = () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    setOpen(true);
    appLinks.forEach((l) => prefetchRouteData(l.href));
  };

  const handleMouseLeave = () => {
    timeoutRef.current = setTimeout(() => setOpen(false), 150);
  };

  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  useEffect(() => {
    if (!open) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  return (
    <nav className="flex flex-wrap items-center gap-1">
      <Link
        href="/"
        className={`nav__link px-3 py-2 rounded-full ${
          pathname === "/" ? "!text-sage font-semibold bg-sage-light/40" : ""
        }`}
      >
        Home
      </Link>
      <Link
        href="/dashboard"
        className={`nav__link px-3 py-2 rounded-full ${
          pathname === "/dashboard" ? "!text-sage font-semibold bg-sage-light/40" : ""
        }`}
        onMouseEnter={() => prefetchRouteData("/dashboard")}
        onFocus={() => prefetchRouteData("/dashboard")}
        onTouchStart={() => prefetchRouteData("/dashboard")}
      >
        Dashboard
      </Link>

      <div
        ref={dropdownRef}
        className="relative"
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        <button
          type="button"
          className={`nav__link px-3 py-2 rounded-full flex items-center gap-1 ${
            isAppActive ? "!text-sage font-semibold bg-sage-light/40" : ""
          }`}
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          aria-haspopup="true"
        >
          Apps
          <svg
            width="12"
            height="12"
            viewBox="0 0 12 12"
            fill="none"
            className={`transition-transform duration-150 ${open ? "rotate-180" : ""}`}
          >
            <path d="M3 4.5L6 7.5L9 4.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>

        {open && (
          <div className="absolute top-full left-0 mt-1 min-w-[180px] bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg shadow-lg z-50 py-1">
            {appLinks.map(({ href, label }) => {
              const isActive = pathname === href || pathname.startsWith(href);
              return (
                <Link
                  key={href}
                  href={href}
                  className={`block px-4 py-2 text-sm transition-colors ${
                    isActive
                      ? "text-sage font-semibold bg-sage-light/30"
                      : "text-charcoal hover:bg-[var(--color-bg-alt)] hover:text-sage"
                  }`}
                  onClick={() => setOpen(false)}
                  onMouseEnter={() => prefetchRouteData(href)}
                >
                  {label}
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </nav>
  );
}
