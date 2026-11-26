export const ORDERS_LIST_SORT_BY_KEYS = [
  'purchase_date',
  'order_id',
  'channel',
  'payment_method',
  'full_name',
  'tickets',
  'seats',
  'event_name',
  'event_date',
  'venue',
  'city',
  'payment',
] as const;

export type OrdersListSortBy = (typeof ORDERS_LIST_SORT_BY_KEYS)[number];

export type OrdersListSortDirection = 'asc' | 'desc';

export const ORDERS_LIST_FEATURE_FLAGGED_SORT_BY_KEYS = ['tickets', 'seats'] as const;

export type OrdersListFeatureFlaggedSortBy = (typeof ORDERS_LIST_FEATURE_FLAGGED_SORT_BY_KEYS)[number];

export function isOrdersListFeatureFlaggedSortBy(value: unknown): value is OrdersListFeatureFlaggedSortBy {
  return typeof value === 'string' && (ORDERS_LIST_FEATURE_FLAGGED_SORT_BY_KEYS as readonly string[]).includes(value);
}

export function isOrdersListSortBy(value: unknown): value is OrdersListSortBy {
  return typeof value === 'string' && (ORDERS_LIST_SORT_BY_KEYS as readonly string[]).includes(value);
}
