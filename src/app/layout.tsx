import type { Metadata, Viewport } from "next";
import { Fraunces, Outfit } from "next/font/google";
import { Pwa } from "@/components/Pwa";
import "./globals.css";

const outfit = Outfit({
  variable: "--font-outfit",
  subsets: ["latin"],
});

const fraunces = Fraunces({
  variable: "--font-fraunces",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Usman Shop — Spice House Kitchen",
  description: "Usman Shop POS. Bills, products and cash is phone pe save hote hain.",
  applicationName: "Usman Shop",
  appleWebApp: { capable: true, title: "Usman Shop", statusBarStyle: "black-translucent" },
  formatDetection: { telephone: false },
};

export const viewport: Viewport = {
  themeColor: "#120e0a",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${outfit.variable} ${fraunces.variable}`}>
      <body className="antialiased">
        <Pwa>{children}</Pwa>
      </body>
    </html>
  );
}
