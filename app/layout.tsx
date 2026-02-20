import type { Metadata } from "next";
import { Cormorant_Garamond, DM_Sans } from "next/font/google";
import "./globals.css";
import { AuthHeader } from "@/components/AuthHeader";
import { StorageMigration } from "@/components/StorageMigration";
import { SessionProvider } from "next-auth/react";

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
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${cormorant.variable} ${dmSans.variable}`}>
      <body className="min-h-screen bg-cream">
        <SessionProvider>
          <StorageMigration />
          <AuthHeader />
          <main>{children}</main>
        </SessionProvider>
      </body>
    </html>
  );
}
