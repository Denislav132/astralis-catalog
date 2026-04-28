"use client";

import { useState } from "react";
import type { Product } from "@/lib/types";
import { getPublicSpecs } from "@/lib/public-specs";

interface ProductCardProps {
  product: Product;
  index: number;
  onSelect: (p: Product) => void;
}

function extractSqm(name: string): string | null {
  const m2 = name.match(/(\d+[\s]?[Mm]²)/);
  if (m2) return m2[1];
  const dim = name.match(/(\d+x\d+)\s*м/i);
  if (dim) return dim[1] + " м";
  return null;
}

export default function ProductCard({ product, index, onSelect }: ProductCardProps) {
  const [imgError, setImgError] = useState(false);
  const publicSpecs = getPublicSpecs(product.Specs);
  const hasPrice =
    product.Price !== "Цена по договаряне" &&
    product.Price !== "Цена по заявка" &&
    product.Price !== "По договаряне";
  const sqm = extractSqm(product.Name);
  
  const imgSrc = (product.Images && product.Images.length > 0 && product.Images[0] !== "") ? product.Images[0] : null;
  const fallback = "/images/hero-main.png";

  return (
    <article
      id={`product-card-${index}`}
      className="product-card fade-up"
      style={{ animationDelay: `${Math.min(index * 40, 400)}ms` }}
    >
      {/* Image */}
      <div className="card-img-wrap">
        <img
          src={imgError || !imgSrc ? fallback : imgSrc}
          alt={product.Name}
          className="card-img"
          loading="lazy"
          referrerPolicy="no-referrer"
          onError={() => setImgError(true)}
        />

        {sqm && (
          <div style={{ position: "absolute", top: 12, left: 12 }}>
            <span className="sqm-badge">{sqm}</span>
          </div>
        )}

      </div>

      {/* Body */}
      <div style={{ padding: "24px", flex: 1, display: "flex", flexDirection: "column", gap: 12 }}>
        <h3
          style={{
            fontFamily: "'Montserrat', sans-serif",
            fontWeight: 800,
            fontSize: "1.05rem",
            lineHeight: 1.4,
            color: "var(--carbon)",
            display: "-webkit-box",
            WebkitLineClamp: 2,
            WebkitBoxOrient: "vertical",
            overflow: "hidden",
          }}
        >
          {product.Name}
        </h3>

        <div>
          {hasPrice ? (
            <div className="price-tag">{product.Price}</div>
          ) : (
            <div className="price-tag on-request">Цена по заявка</div>
          )}
        </div>

        {Object.keys(publicSpecs).length > 0 && (
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 4 }}>
            {Object.entries(publicSpecs)
              .slice(0, 3)
              .map(([k, v]) => (
                <span
                  key={k}
                  style={{
                    fontSize: "0.7rem",
                    color: "var(--carbon-70)",
                    background: "var(--bg-section)",
                    border: "1px solid var(--border)",
                    borderRadius: "99px",
                    padding: "4px 12px",
                    fontWeight: 500,
                  }}
                >
                  {k}: <strong style={{ fontWeight: 700, color: "var(--carbon)" }}>{v}</strong>
                </span>
              ))}
          </div>
        )}
      </div>

      {/* CTA */}
      <div style={{ marginTop: "auto" }}>
        <button
          id={`product-details-btn-${index}`}
          className="details-btn"
          onClick={() => onSelect(product)}
        >
          Детайли
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M5 12h14M12 5l7 7-7 7" />
          </svg>
        </button>
      </div>
    </article>
  );
}
