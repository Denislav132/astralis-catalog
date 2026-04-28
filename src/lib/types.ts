export interface Product {
  id?: string;
  Name: string;
  Price: string;
  Description: string;
  Specs: Record<string, string>;
  Images: string[];
  _category?: "container" | "prefab" | "modular";
  is_promo?: boolean;
}
