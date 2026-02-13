import type { Metadata } from "next";
import { Cormorant_Garamond, DM_Sans } from "next/font/google";
import "./globals.css";
import { Nav } from "@/components/Nav";

const cormorant = Cormorant_Garamond({
  weight: ["300", "400", "600"],
  subsets: ["latin"],
  variable: "--font-cormorant",
  display: "swap",
});

const dmSans = DM_Sans({
  weight: ["300", "400", "500", "600"],
  subsets: ["latin"],
  variable: "--font-dm-sans",
  display: "swap",
});

export const metadata: Metadata = {
  title: "StoicSips",
  description: "Scheduling, productivity, and focus — optimize your stimulant timing.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${cormorant.variable} ${dmSans.variable}`}>
      <body className="min-h-screen bg-cream">
        <header className="nav">
          <div className="container flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 h-full">
            <a href="/" className="font-display text-2xl font-medium text-obsidian tracking-tight hover:text-sage transition-colors">
              StoicSips
            </a>
            <Nav />
          </div>
        </header>
        <main className="container py-8 sm:py-12">{children}</main>
      </body>
    </html>
  );
}
