"use client";

export type CategoryKey = "all" | "container" | "prefab" | "modular";

interface CategoryFiltersProps {
  active: CategoryKey;
  counts: Record<CategoryKey, number>;
  onChange: (c: CategoryKey) => void;
}

const CATEGORIES: { key: CategoryKey; label: string }[] = [
  { key: "all",       label: "Всички" },
  { key: "container", label: "Контейнери" },
  { key: "prefab",    label: "Сглобяеми къщи" },
  { key: "modular",   label: "Модулни къщи" },
];

export default function CategoryFilters({ active, counts, onChange }: CategoryFiltersProps) {
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
      {CATEGORIES.map((cat) => (
        <button
          key={cat.key}
          id={`filter-${cat.key}`}
          onClick={() => onChange(cat.key)}
          className={`filter-btn${active === cat.key ? " active" : ""}`}
        >
          {cat.label}
          <span className="filter-count">{counts[cat.key]}</span>
        </button>
      ))}
    </div>
  );
}
