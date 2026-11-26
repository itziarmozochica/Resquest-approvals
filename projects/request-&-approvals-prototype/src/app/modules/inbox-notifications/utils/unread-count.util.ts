const UNREAD_COUNT_DISPLAY_CAP = 9;

/**
 * Formats the unseen-notifications count for the badge: the raw number up to the
 * cap, then `"<cap>+"` once it is exceeded (e.g. `10` → `"9+"`). Single source of
 * truth shared by the store and its test mock so the threshold cannot drift.
 */
export function formatUnreadCount(count: number): string {
  return count > UNREAD_COUNT_DISPLAY_CAP ? `${UNREAD_COUNT_DISPLAY_CAP}+` : String(count);
}
