import type { Metadata } from "next";
import { Analytics } from "@vercel/analytics/next";
import "./globals.css";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://neurosignal.app";

export const metadata: Metadata = {
  title: {
    default: "NeuroSignal — Daily AI News & Developments",
    template: "%s | NeuroSignal",
  },
  description:
    "Curated AI news dashboard tracking model releases, tools, open source projects, and industry developments. Stay ahead of the curve.",
  metadataBase: new URL(siteUrl),
  openGraph: {
    title: "NeuroSignal — Daily AI News & Developments",
    description:
      "Curated AI news dashboard tracking model releases, tools, open source projects, and industry developments.",
    url: siteUrl,
    siteName: "NeuroSignal",
    type: "website",
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
    title: "NeuroSignal",
    description:
      "Curated AI news dashboard tracking model releases, tools, open source, and industry developments.",
  },
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className="min-h-screen bg-background text-foreground antialiased">
        {children}
        <Analytics />
      </body>
    </html>
  );
}
