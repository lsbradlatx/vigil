"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const links = [
  { href: "/", label: "Home" },
  { href: "/calendar", label: "Calendar" },
  { href: "/todos", label: "To-dos" },
  { href: "/stimulant", label: "Stimulant Optimizer" },
];

export function Nav() {
  const pathname = usePathname();

  return (
    <nav className="flex flex-wrap items-center gap-1">
      {links.map(({ href, label }) => {
        const isActive = pathname === href || (href !== "/" && pathname.startsWith(href));
        return (
          <Link
            key={href}
            href={href}
            className={`nav__link px-3 py-2 rounded-full ${
              isActive
                ? "!text-sage font-semibold bg-sage-light/40"
                : ""
            }`}
          >
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
