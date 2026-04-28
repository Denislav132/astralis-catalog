"use client";

import { useState, useMemo, useEffect } from "react";
import Hero from "@/components/Hero";
import CategoryFilters, { type CategoryKey } from "@/components/CategoryFilters";
import ProductCard from "@/components/ProductCard";
import ProductSlideOver from "@/components/ProductSlideOver";
import { supabase } from "@/lib/supabase";
import type { Product } from "@/lib/types";
import { getPublicSpecs } from "@/lib/public-specs";

type ProductCategory = Exclude<CategoryKey, "all">;

function classify(p: Product): ProductCategory {
  const text = (p.Name + " " + (p.Description || "")).toLowerCase();
  if (text.includes("модулн")) return "modular";
  if (text.includes("сглобяем")) return "prefab";
  return "container";
}

type ProductRow = {
  id: string;
  name: string;
  description: string | null;
  price: string | null;
  images: string[] | null;
  specs: Record<string, string> | null;
  category: ProductCategory | null;
  is_promo: boolean | null;
  status: string | null;
};

export default function HomePage() {
  const [products, setProducts] = useState<(Product & { id?: string })[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<CategoryKey>("container");
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<(Product & { _category?: string; _index?: number }) | null>(null);

  useEffect(() => {
    async function fetchProducts() {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from("products")
          .select("*")
          .or("status.eq.published,status.is.null")
          .order("created_at", { ascending: true });

        if (error) {
          console.error("Supabase Error:", error.message);
        } else if (data) {
          const mapped = (data as ProductRow[]).map((d) => ({
            id: d.id,
            Name: d.name,
            Description: d.description || "",
            Price: d.price || "Цена по заявка",
            Images: d.images || [],
            Specs: getPublicSpecs(d.specs),
            _category: d.category || undefined,
            is_promo: d.is_promo || false,
          }));
          setProducts(mapped);
        }
      } catch (err) {
        console.error("Fetch exception:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchProducts();
  }, []);

  const classified = useMemo(
    () =>
      products.map((p) => ({
        ...p,
        _category: p._category || classify(p),
      })),
    [products]
  );

  const counts = useMemo<Record<CategoryKey, number>>(() => {
    const c = { all: classified.length, container: 0, prefab: 0, modular: 0 };
    classified.forEach((p) => {
      const cat = (p._category as CategoryKey) || "container";
      if (c[cat] !== undefined) c[cat]++;
    });
    return c;
  }, [classified]);

  const filtered = useMemo(
    () => (filter === "all" ? classified : classified.filter((p) => p._category === filter)),
    [filter, classified]
  );

  const displayed = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return filtered;
    return filtered.filter(
      (p) =>
        p.Name.toLowerCase().includes(q) ||
        p.Description?.toLowerCase().includes(q) ||
        Object.values(p.Specs || {}).some((v) => v.toLowerCase().includes(q))
    );
  }, [search, filtered]);

  return (
    <div className="bg-[#F8F9FA]">
      <Hero />

      {/* ── CATALOG SECTION ── */}
      <section id="catalog" className="py-24 px-6 scroll-mt-20">
        <div className="max-w-7xl mx-auto">
          
          {/* Section Header */}
          <div className="text-center mb-16 space-y-4">
            <div className="w-12 h-1 bg-orange-600 mx-auto rounded-full" />
            <h2 className="text-5xl font-black text-gray-900 tracking-tight">Колекция Продукти</h2>
            <p className="text-gray-500 font-bold max-w-xl mx-auto text-lg">
              Изберете категория и разгледайте нашите модели. Съвременен дизайн за вашите нужди.
            </p>
          </div>

          {/* Filters & Search */}
          <div className="flex flex-col items-center gap-12 mb-20">
            <CategoryFilters active={filter} counts={counts} onChange={setFilter} />
            
            <div className="relative w-full max-w-2xl group">
               <input 
                 type="text" 
                 placeholder="Търси модел или име..." 
                 value={search}
                 onChange={(e) => setSearch(e.target.value)}
                 className="w-full p-6 pl-16 bg-white border-2 border-gray-100 rounded-[2rem] shadow-xl outline-none focus:border-orange-500 transition-all font-bold text-gray-800"
               />
               <svg className="absolute left-6 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-orange-600 transition-colors" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                  <circle cx="11" cy="11" r="8" />
                  <path d="m21 21-4.3-4.3" />
               </svg>
            </div>
          </div>

          {/* Products Grid */}
          {loading ? (
            <div className="py-32 text-center">
               <div className="w-16 h-16 border-4 border-orange-600 border-t-transparent rounded-full animate-spin mx-auto mb-6" />
               <span className="text-xs font-black text-gray-400 uppercase tracking-[0.3em]">Зареждане на каталога...</span>
            </div>
          ) : displayed.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10">
              {displayed.map((product, idx) => (
                <ProductCard 
                  key={product.id || idx} 
                  index={idx}
                  product={product} 
                  onSelect={(p) => setSelected({ ...p, _index: idx })} 
                />
              ))}
            </div>
          ) : (
            <div className="py-32 text-center bg-white rounded-[3rem] border-2 border-dashed border-gray-100">
               <div className="text-6xl mb-6">📦</div>
               <h3 className="text-2xl font-black text-gray-900 mb-2">Няма открити продукти</h3>
               <p className="text-gray-500 font-bold mb-8">Опитайте с друго търсене или категория.</p>
               <button onClick={() => {setFilter("container"); setSearch("");}} className="text-orange-600 font-black uppercase tracking-widest text-xs hover:underline">Покажи контейнерите</button>
            </div>
          )}

          {/* Shown counter */}
          <div className="mt-20 flex justify-between items-center text-[10px] font-black text-gray-400 uppercase tracking-widest border-t border-gray-100 pt-8">
             <span>Показани {displayed.length} от {filtered.length} в категорията</span>
             <span>Astralis Industrial Catalog</span>
          </div>
        </div>
      </section>

      <ProductSlideOver 
        key={selected?.id || selected?.Name || "empty"}
        product={selected} 
        onClose={() => setSelected(null)} 
      />
    </div>
  );
}
