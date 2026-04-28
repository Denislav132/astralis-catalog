export function isInternalCatalogSpecKey(key: string): boolean {
  const normalized = key
    .toLowerCase()
    .replace(/[\s.:_-]+/g, "");

  return (
    normalized.includes("кат") &&
    (normalized.includes("№") || normalized.includes("номер") || normalized.includes("no"))
  );
}

function normalizePublicSpecEntry([key, value]: [string, string]): [string, string] {
  const normalizedKey = key
    .toLowerCase()
    .replace(/[\s.:_-]+/g, "");
  const normalizedValue = String(value).trim().toLowerCase();

  if (normalizedKey === "година") {
    return ["Състояние", normalizedValue === "нов" ? "Нов" : value];
  }

  return [key, value];
}

export function getPublicSpecs(specs?: Record<string, string> | null): Record<string, string> {
  if (!specs) return {};

  return Object.fromEntries(
    Object.entries(specs)
      .filter(([key]) => !isInternalCatalogSpecKey(key))
      .map(normalizePublicSpecEntry)
  );
}
