/**
 * Groups items into ordered units by their `order` value. Items sharing the same
 * `order` land in the same unit (kept in their incoming order); units are sorted by
 * `order` ascending, and items with a `null` order are collected into a single unit
 * placed last.
 */
export function groupByOrder<T>(items: T[], getOrder: (item: T) => number | null): T[][] {
  const buckets = new Map<number | null, T[]>();

  for (const item of items) {
    const order = getOrder(item);
    const bucket = buckets.get(order) ?? [];
    bucket.push(item);
    buckets.set(order, bucket);
  }

  const orderedKeys = [...buckets.keys()].sort((a, b) => {
    if (a === null) return 1;
    if (b === null) return -1;
    return a - b;
  });

  return orderedKeys.map(order => buckets.get(order) ?? []);
}
