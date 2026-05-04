import type { Metadata } from "next";
import "./globals.css";
import AppFrame from "@/components/AppFrame";
import { getSiteUrl } from "@/lib/site-url";

const siteUrl = getSiteUrl();
const siteTitle = "ASTRALIS Контейнери";
const siteDescription =
  "Контейнери, сглобяеми къщи и модулни конструкции за бизнес, строителство и дом. Каталог с модели, снимки и бързо запитване за оферта.";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: `${siteTitle} | Контейнери и модулни конструкции`,
    template: `%s | ${siteTitle}`,
  },
  description: siteDescription,
  keywords: [
    "контейнери",
    "контейнери България",
    "сглобяеми къщи",
    "модулни къщи",
    "модулни конструкции",
    "жилищни контейнери",
    "строителни контейнери",
  ],
  alternates: {
    canonical: "/",
  },
  openGraph: {
    title: `${siteTitle} | Контейнери и модулни конструкции`,
    description: siteDescription,
    url: siteUrl,
    siteName: siteTitle,
    locale: "bg_BG",
    type: "website",
    images: [
      {
        url: "/images/hero-container-construction.png",
        width: 1200,
        height: 630,
        alt: "ASTRALIS контейнери и модулни конструкции",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: `${siteTitle} | Контейнери и модулни конструкции`,
    description: siteDescription,
    images: ["/images/hero-container-construction.png"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="bg" className="h-full" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      </head>
      <body className="min-h-full flex flex-col">
        <AppFrame>{children}</AppFrame>
      </body>
    </html>
  );
}
