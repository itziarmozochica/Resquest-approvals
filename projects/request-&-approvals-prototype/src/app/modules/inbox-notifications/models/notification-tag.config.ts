import type { TagSentiment } from '@ignite/legacy/components/ignt-tag/ignt-tag.component';

import type { NotificationFamily } from './inbox-notification.model';

/** Visual chip (label + color). Exported so callers can type chip lists (`TAG_BY_FAMILY`, header summaries). */
export interface NotificationTag {
  readonly labelKey: string;
  readonly sentiment: TagSentiment;
}

/**
 * Chip for the `generic` family and for any unrecognized value: rows stored before the backend normalized
 * `type` (PRD-3912) can still carry arbitrary strings.
 */
const NOTIFICATION_TAG_FALLBACK: NotificationTag = {
  labelKey: 'notifications.types.generic',
  sentiment: 'info',
};

const PRICING_TAG: NotificationTag = {
  labelKey: 'notifications.types.pricing',
  sentiment: 'info',
};

const SALES_TAG: NotificationTag = {
  labelKey: 'notifications.types.sales',
  sentiment: 'accent',
};

/** Chip (label + color) per business family. Total `Record` → no non-null assertions. */
const TAG_BY_FAMILY: Record<NotificationFamily, NotificationTag> = {
  generic: NOTIFICATION_TAG_FALLBACK,
  pricing: PRICING_TAG,
  sales: SALES_TAG,
};

/**
 * Front-end paint order (D6). Deliberately overrides the backend's alphabetical `sorted(tags)` (part of
 * the `id` content hash): the FE wants pricing first and `generic` last, so it reorders and does not
 * depend on the wire order. `as const` preserves the literal members so the exhaustiveness guard below
 * can inspect them (it is compile-time only — the emitted array is unchanged).
 */
const FAMILY_ORDER = ['pricing', 'sales', 'generic'] as const satisfies readonly NotificationFamily[];

/**
 * Compile-time exhaustiveness guard — pure types, zero runtime output. Unlike `TAG_BY_FAMILY` (a total
 * `Record`), `FAMILY_ORDER` is an array, so a missing member would otherwise compile and silently drop
 * that family's chip. If a new `NotificationFamily` is added to the union but not to `FAMILY_ORDER`,
 * `FamiliesInPaintOrder` becomes a labeled tuple instead of `true`, which violates the `Expect<T extends
 * true>` constraint and fails the build, naming the omitted family. The `[T]` tuple wrappers stop the
 * union from distributing over the `extends` check.
 */
type Expect<T extends true> = T;
type FamiliesInPaintOrder = [NotificationFamily] extends [(typeof FAMILY_ORDER)[number]]
  ? true
  : ['FAMILY_ORDER is missing family →', Exclude<NotificationFamily, (typeof FAMILY_ORDER)[number]>];
export type FamilyOrderIsExhaustive = Expect<FamiliesInPaintOrder>;

/**
 * Effective families of ONE notification, shared by the UI (chips) and tracking. Drops `generic` when
 * real families are present; falls back to `['generic']` when `tags` is empty/only-generic (migrated rows
 * or a nullable backend — the adapter already normalizes `null`/`undefined` to `[]`). Stable order by
 * `FAMILY_ORDER`. Single source of truth for `resolveNotificationTags` (chips) and per-item tracking.
 */
export function resolveNotificationFamilies(families: readonly NotificationFamily[]): readonly NotificationFamily[] {
  const meaningful = families.filter(family => family !== 'generic');
  const effective: readonly NotificationFamily[] = meaningful.length > 0 ? meaningful : ['generic'];
  return FAMILY_ORDER.filter(family => effective.includes(family));
}

/**
 * Deduplicated union of the EFFECTIVE families of several notifications, in `FAMILY_ORDER`. `generic`
 * appears iff some notification of the set falls back to the generic family (fallback is per-notification,
 * not per-panel). Encapsulates `FAMILY_ORDER` so call-sites never learn the paint order.
 */
export function mergeNotificationFamilies(perItemTags: readonly (readonly NotificationFamily[])[]): readonly NotificationFamily[] {
  const effective = new Set(perItemTags.flatMap(tags => resolveNotificationFamilies(tags)));
  return FAMILY_ORDER.filter(family => effective.has(family));
}

/**
 * Chips to render from `tags`. `[]`/`null`/absent (migrated rows or a nullable backend) and `["generic"]`
 * → one "Notification" chip (defensive FE fallback); when real families are present, `generic` is dropped
 * so it never appears beside pricing/sales. The adapter already normalizes `null`/`undefined` to `[]`.
 */
export function resolveNotificationTags(families: readonly NotificationFamily[]): readonly NotificationTag[] {
  return resolveNotificationFamilies(families).map(family => TAG_BY_FAMILY[family]);
}
