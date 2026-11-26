const SEVENTY_TWO_HOURS_MS = 72 * 60 * 60 * 1000;

/**
 * True when `createdAt` is within the last 72 hours relative to `referenceDate`
 * (product_creation_date age under 72 hours).
 */
export function isProductVariationNew(createdAt: string, referenceDate: Date = new Date()): boolean {
  const createdMs = Date.parse(createdAt);
  if (Number.isNaN(createdMs)) {
    return false;
  }
  return referenceDate.getTime() - createdMs < SEVENTY_TWO_HOURS_MS;
}
