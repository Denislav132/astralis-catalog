"use client";

import { useState } from "react";
import ProductCard from "@/components/ProductCard";
import ProductSlideOver from "@/components/ProductSlideOver";
import type { Product } from "@/lib/types";

export default function PromoClient({ initialProducts }: { initialProducts: Product[] }) {
  const [selected, setSelected] = useState<Product | null>(null);

  if (initialProducts.length === 0) {
    return (
      <div
        style={{
          border: "1px solid var(--border)",
          background: "var(--bg-card)",
          borderRadius: 8,
          padding: "48px 24px",
          textAlign: "center",
          color: "var(--carbon-70)",
          fontWeight: 500,
        }}
      >
        <div style={{ fontSize: "3rem", marginBottom: 16 }}>📦</div>
        В момента няма активни промоционални модели. Моля, проверете по-късно.
      </div>
    );
  }

  return (
    <>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
          gap: 32,
        }}
      >
        {initialProducts.map((product, i) => (
          <ProductCard
            key={`${product.id}-${i}`}
            product={product}
            index={i}
            onSelect={(p) => setSelected(p)}
          />
        ))}
      </div>

      <ProductSlideOver
        key={selected?.id || selected?.Name || "empty"}
        product={selected}
        onClose={() => setSelected(null)}
      />
    </>
  );
}
