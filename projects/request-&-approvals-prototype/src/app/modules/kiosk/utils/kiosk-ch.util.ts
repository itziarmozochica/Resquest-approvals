/**
 * Kiosk channel helpers.
 *
 * - `getKioskChannelId`: pure normalizer. Returns the trimmed channel id, or
 *   `undefined` when missing/blank. Use it when the caller must branch on the
 *   presence of a subchannel (e.g. picking between `channel_id=<id>` and
 *   `plan_ids=<csv>` shapes).
 */
export function getKioskChannelId(channelId: string | null | undefined): string | undefined {
  return channelId?.trim() || undefined;
}
