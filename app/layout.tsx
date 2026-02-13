import type { Metadata } from "next";
import { Cormorant_Garamond, DM_Sans } from "next/font/google";
import "./globals.css";
import { Nav } from "@/components/Nav";

const cormorant = Cormorant_Garamond({
  weight: ["400", "600", "700"],
  subsets: ["latin"],
  variable: "--font-cormorant",
  display: "swap",
});

const dmSans = DM_Sans({
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
      <body className="min-h-screen bg-cream bg-pattern-deco">
        <header className="border-b border-gold/50 bg-cream/95 backdrop-blur-sm sticky top-0 z-10">
          <div className="max-w-6xl mx-auto px-4 py-3 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            <a href="/" className="font-serif text-2xl font-semibold text-charcoal hover:text-gold transition-colors">
              StoicSips
            </a>
            <Nav />
          </div>
        </header>
        <main className="max-w-6xl mx-auto px-4 py-6">{children}</main>
      </body>
    </html>
  );
}
