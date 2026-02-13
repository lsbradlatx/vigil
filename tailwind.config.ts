import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        cream: "var(--color-cream)",
        linen: "var(--color-linen)",
        parchment: "var(--color-parchment)",
        stone: "var(--color-stone)",
        ash: "var(--color-ash)",
        graphite: "var(--color-graphite)",
        charcoal: "var(--color-charcoal)",
        obsidian: "var(--color-obsidian)",
        "sage-light": "var(--color-sage-light)",
        sage: "var(--color-sage)",
        "sage-muted": "var(--color-sage-muted)",
        "forest-green": "var(--color-forest-green)",
        "slate-blue": "var(--color-slate-blue)",
      },
      fontFamily: {
        display: ["var(--font-display)"],
        body: ["var(--font-body)"],
        serif: ["var(--font-display)"],
        sans: ["var(--font-body)"],
      },
      borderRadius: {
        sm: "var(--radius-sm)",
        md: "var(--radius-md)",
        lg: "var(--radius-lg)",
        xl: "var(--radius-xl)",
        full: "var(--radius-full)",
        deco: "var(--radius-md)",
      },
      boxShadow: {
        xs: "var(--shadow-xs)",
        sm: "var(--shadow-sm)",
        md: "var(--shadow-md)",
        lg: "var(--shadow-lg)",
        xl: "var(--shadow-xl)",
        accent: "var(--shadow-accent)",
      },
      spacing: {
        "18": "4.5rem",
        "88": "22rem",
      },
    },
  },
  plugins: [],
};

export default config;
