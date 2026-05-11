"use client";

import { usePathname } from "next/navigation";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import type { SiteSettings } from "@/lib/site-settings";

export default function AppFrame({
  children,
  settings,
}: Readonly<{ children: React.ReactNode; settings: SiteSettings }>) {
  const pathname = usePathname();
  const isAdminRoute = pathname === "/admin" || pathname.startsWith("/admin/");

  if (isAdminRoute) {
    return <main style={{ flex: 1 }}>{children}</main>;
  }

  return (
    <>
      <Navbar />
      <main style={{ flex: 1 }}>{children}</main>
      <Footer settings={settings} />
    </>
  );
}
