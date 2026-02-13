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
        cream: "#f5f5dc",
        charcoal: "#2c2c2c",
        gold: "#c9a227",
        "gold-dark": "#a67c00",
        forest: "#1b4332",
        "forest-light": "#2d6a4f",
      },
      fontFamily: {
        serif: ["var(--font-cormorant)", "Georgia", "serif"],
        sans: ["var(--font-dm-sans)", "system-ui", "sans-serif"],
      },
      borderRadius: {
        deco: "6px",
      },
      boxShadow: {
        gold: "0 0 15px rgba(201, 162, 39, 0.2)",
        "gold-sm": "0 0 8px rgba(201, 162, 39, 0.15)",
      },
    },
  },
  plugins: [],
};

export default config;
