import type { Metadata } from "next";
import { Cormorant_Garamond, DM_Sans } from "next/font/google";
import "./globals.css";
import { AuthHeader } from "@/components/AuthHeader";
import { StorageMigration } from "@/components/StorageMigration";
import { SessionProvider } from "next-auth/react";
import { ThemeProvider } from "@/components/ThemeProvider";
import { ThemeScript } from "@/components/ThemeScript";

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
  title: "Vigil",
  description: "Vigil — scheduling, productivity, and focus. Optimize your stimulant timing.",
  manifest: "/site.webmanifest",
  icons: {
    icon: [
      { url: "/logo-icon.svg", type: "image/svg+xml" },
      { url: "/favicon.ico", sizes: "any" },
      { url: "/icon-192.png", type: "image/png", sizes: "192x192" },
      { url: "/icon-512.png", type: "image/png", sizes: "512x512" },
    ],
    shortcut: [{ url: "/favicon.ico", sizes: "any" }],
    apple: [{ url: "/apple-touch-icon.png", type: "image/png", sizes: "180x180" }],
  },
  openGraph: {
    title: "Vigil",
    description: "Vigil — scheduling, productivity, and focus. Optimize your stimulant timing.",
    images: [{ url: "/logo-wordmark-light.svg", width: 640, height: 180, alt: "Vigil" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Vigil",
    description: "Vigil — scheduling, productivity, and focus. Optimize your stimulant timing.",
    images: ["/logo-wordmark-light.svg"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" data-theme="light" className={`${cormorant.variable} ${dmSans.variable}`}>
      <body className="min-h-screen">
        <ThemeScript />
        <ThemeProvider>
          <SessionProvider>
            <StorageMigration />
            <AuthHeader />
            <main>{children}</main>
          </SessionProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
