import type { IgntBreadcrumbItem } from '../models/ignt-breadcrumb-item.model';

export interface IgntBreadcrumbEllipsisSlot {
  kind: 'ellipsis';
}

export interface IgntBreadcrumbItemSlot {
  index: number;
  item: IgntBreadcrumbItem;
  kind: 'item';
}

export type IgntBreadcrumbSlot = IgntBreadcrumbEllipsisSlot | IgntBreadcrumbItemSlot;

const MIN_COLLAPSED_VISIBLE_ITEMS = 3;

export function buildBreadcrumbSlots(items: readonly IgntBreadcrumbItem[], maxVisibleItems?: number): IgntBreadcrumbSlot[] {
  if (items.length === 0) {
    return [];
  }

  if (maxVisibleItems === undefined || items.length <= maxVisibleItems) {
    return items.map((item, index) => ({ index, item, kind: 'item' }));
  }

  const max = Math.max(MIN_COLLAPSED_VISIBLE_ITEMS, Math.floor(maxVisibleItems));
  if (items.length <= max) {
    return items.map((item, index) => ({ index, item, kind: 'item' }));
  }

  const tailCount = max - 2;
  const tailStart = items.length - tailCount;
  const tailSlots: IgntBreadcrumbItemSlot[] = items.slice(tailStart).map((item, offset) => ({
    index: tailStart + offset,
    item,
    kind: 'item',
  }));

  return [{ index: 0, item: items[0], kind: 'item' }, { kind: 'ellipsis' }, ...tailSlots];
}

export function trackBreadcrumbSlot(slot: IgntBreadcrumbSlot): string {
  if (slot.kind === 'ellipsis') {
    return 'ellipsis';
  }

  return `item-${slot.index}`;
}
