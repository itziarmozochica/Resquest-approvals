import { ProductRow } from './event-schedule-composer-v1.model';

interface ProductCatalogAnswer {
  products?: ProductRow[];
}

/**
 * Raw products from a product-catalog answer (`{ products, v:3 }` object or a JSON string of it). Keeps
 * in-progress (empty-name) rows so the editor stays editable — the editor coerces/normalizes itself.
 * Returns `[]` when the answer carries no products.
 */
export function parseProductCatalogProducts(value: string): ProductRow[] {
  let parsed: object;
  const raw = value.trim();
  if (!raw) return [];
  try {
    parsed = JSON.parse(raw);
  } catch {
    return [];
  }
  const products = parsed ? (parsed as ProductCatalogAnswer).products : null;
  return Array.isArray(products) ? products : [];
}

/** Serialize a product catalog to its stored answer string (`{ products, v:3 }`, or `''` when empty). */
export function serializeProductCatalogProducts(products: ProductRow[]): string {
  return products.length ? JSON.stringify({ products, v: 3 }) : '';
}
