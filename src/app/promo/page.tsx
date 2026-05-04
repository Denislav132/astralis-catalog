import type { Metadata } from "next";
import PromoClient from "./PromoClient";
import { supabaseAdmin } from "@/lib/supabase-admin";
import type { Product } from "@/lib/types";
import { getPublicSpecs } from "@/lib/public-specs";

export const metadata: Metadata = {
  title: "Промоции — ASTRALIS",
  description: "Разгледайте нашите актуални промоции на контейнери и сглобяеми къщи.",
  alternates: {
    canonical: "/promo",
  },
  openGraph: {
    title: "Промоции — ASTRALIS",
    description: "Разгледайте нашите актуални промоции на контейнери и сглобяеми къщи.",
    url: "/promo",
  },
};

export default async function PromoPage() {
  const { data: products } = await supabaseAdmin
    .from("products")
    .select("*")
    .eq("is_promo", true)
    .or("status.eq.published,status.is.null")
    .order("created_at", { ascending: false });

  const mapped: Product[] = (products || []).map((d) => ({
    id: d.id,
    Name: d.name,
    Description: d.description || "",
    Price: d.price || "Цена по заявка",
    Images: d.images || [],
    Specs: getPublicSpecs(d.specs),
    _category: d.category || "container",
    is_promo: d.is_promo || false,
  }));

  return (
    <div style={{ padding: "120px 24px", minHeight: "80vh" }}>
      <div className="max-w-7xl mx-auto">
        <div
          style={{
            width: 48,
            height: 4,
            background: "var(--accent)",
            borderRadius: 2,
            margin: "0 auto 24px",
          }}
        />
        <h1
          style={{
            fontFamily: "'Montserrat', sans-serif",
            fontWeight: 900,
            fontSize: "clamp(2.5rem, 5vw, 4rem)",
            color: "var(--carbon)",
            letterSpacing: "-0.02em",
            marginBottom: 16,
            lineHeight: 1.1,
            textAlign: "center",
          }}
        >
          Промоции
        </h1>
        <p style={{ color: "var(--carbon-70)", fontSize: "1.2rem", margin: "0 auto 48px", maxWidth: 600, textAlign: "center" }}>
          Актуални модели от промо серията. Изберете продукт и изпратете запитване за персонална оферта.
        </p>

        <PromoClient initialProducts={mapped} />
      </div>
    </div>
  );
}
