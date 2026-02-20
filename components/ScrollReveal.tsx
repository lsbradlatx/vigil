"use client";

import { useRef, useEffect, type ReactNode } from "react";

type Animation = "slide-left" | "slide-right" | "fade-up" | "fade-in" | "scale-in";

interface ScrollRevealProps {
  children: ReactNode;
  animation?: Animation;
  delay?: number;
  once?: boolean;
  className?: string;
}

const delayClass: Record<number, string> = {
  100: "anim-delay-100",
  200: "anim-delay-200",
  300: "anim-delay-300",
  400: "anim-delay-400",
  500: "anim-delay-500",
  600: "anim-delay-600",
};

export function ScrollReveal({
  children,
  animation = "fade-up",
  delay = 0,
  once = true,
  className = "",
}: ScrollRevealProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          el.classList.add("is-visible");
          if (once) observer.unobserve(el);
        } else if (!once) {
          el.classList.remove("is-visible");
        }
      },
      { threshold: 0.15 },
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [once]);

  const animClass = `anim-${animation}`;
  const dClass = delayClass[delay] ?? "";

  return (
    <div
      ref={ref}
      className={`scroll-reveal ${animClass} ${dClass} ${className}`.trim()}
    >
      {children}
    </div>
  );
}
