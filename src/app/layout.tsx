import type { Metadata } from "next";
import "./globals.css";
import AppFrame from "@/components/AppFrame";

export const metadata: Metadata = {
  title: "ASTRALIS - Контейнери",
  description:
    "Професионални строителни решения: префабрикувани контейнери, сглобяеми и модулни къщи. Качество, скорост и надеждност — доставяме до цяла България.",
  keywords: "контейнери, сглобяеми къщи, модулни къщи, prefab, container house, България",
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
