"use client";

import type { Product } from "@/lib/types";
import { getPublicSpecs } from "@/lib/public-specs";

interface ProductCompareProps {
  products: Product[];
  open: boolean;
  onOpen: () => void;
  onClose: () => void;
  onClear: () => void;
  onRemove: (product: Product) => void;
  onSelect: (product: Product) => void;
}

function productKey(product: Product) {
  return product.id || product.Name;
}

function displayPrice(product: Product) {
  const normalized = (product.Price || "").trim().toLowerCase();
  const hasRealPrice =
    normalized &&
    normalized !== "цена по договаряне" &&
    normalized !== "цена по заявка" &&
    normalized !== "по договаряне";

  return hasRealPrice ? product.Price : "Цена по заявка";
}

function collectSpecRows(products: Product[]) {
  const keys = new Set<string>();
  products.forEach((product) => {
    Object.keys(getPublicSpecs(product.Specs)).forEach((key) => keys.add(key));
  });
  return Array.from(keys);
}

export default function ProductCompare({
  products,
  open,
  onOpen,
  onClose,
  onClear,
  onRemove,
  onSelect,
}: ProductCompareProps) {
  const specRows = collectSpecRows(products);

  return (
    <>
      {products.length > 0 && (
        <div className="compare-tray" role="region" aria-label="Избрани продукти за сравнение">
          <div className="compare-tray__inner">
            <div>
              <div className="compare-tray__label">Сравнение</div>
              <div className="compare-tray__count">
                Избрани {products.length} от 3 продукта
              </div>
            </div>

            <div className="compare-tray__items">
              {products.map((product) => (
                <span key={productKey(product)} className="compare-chip">
                  {product.Name}
                  <button type="button" onClick={() => onRemove(product)} aria-label={`Премахни ${product.Name}`}>
                    ×
                  </button>
                </span>
              ))}
            </div>

            <div className="compare-tray__actions">
              <button type="button" className="compare-tray__secondary" onClick={onClear}>
                Изчисти
              </button>
              <button type="button" className="compare-tray__primary" onClick={onOpen}>
                Виж сравнение
              </button>
            </div>
          </div>
        </div>
      )}

      {open && (
        <>
          <div className="compare-modal-backdrop" onClick={onClose} />
          <div className="compare-modal" role="dialog" aria-modal="true" aria-label="Сравнение на продукти">
            <div className="compare-modal__header">
              <div>
                <div className="compare-modal__eyebrow">ASTRALIS | Сравнение</div>
                <h2>Сравнение на продукти</h2>
              </div>
              <button type="button" className="compare-modal__close" onClick={onClose} aria-label="Затвори">
                ×
              </button>
            </div>

            {products.length < 2 ? (
              <div className="compare-empty">
                Изберете поне два продукта, за да ги сравните удобно един до друг.
              </div>
            ) : (
              <div className="compare-table-wrap">
                <table className="compare-table">
                  <thead>
                    <tr>
                      <th>Параметър</th>
                      {products.map((product) => (
                        <th key={productKey(product)}>
                          <div className="compare-product-head">
                            <img src={product.Images?.[0] || "/images/hero-main.png"} alt={product.Name} />
                            <span>{product.Name}</span>
                            <small>{displayPrice(product)}</small>
                          </div>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {specRows.map((key) => (
                      <tr key={key}>
                        <td>{key}</td>
                        {products.map((product) => {
                          const specs = getPublicSpecs(product.Specs);
                          return <td key={`${productKey(product)}-${key}`}>{specs[key] || "—"}</td>;
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            <div className="compare-modal__footer">
              {products.map((product) => (
                <button
                  key={productKey(product)}
                  type="button"
                  className="compare-details-btn"
                  onClick={() => {
                    onClose();
                    onSelect(product);
                  }}
                >
                  Детайли: {product.Name}
                </button>
              ))}
            </div>
          </div>
        </>
      )}
    </>
  );
}
