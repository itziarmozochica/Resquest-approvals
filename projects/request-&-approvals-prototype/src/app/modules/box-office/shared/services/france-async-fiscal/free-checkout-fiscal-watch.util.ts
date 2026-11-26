export interface FreeCheckoutFiscalWatch {
  blockBooker?: boolean;
  blocksPurchaseOnFailure?: boolean;
  splitSessionId?: string;
}

/**
 * Reads the async fiscal watch handles out of a €0 (`free`) checkout response, which reaches the
 * box-office flows loosely typed: `PaymentCheckoutFreeService` wraps the raw backend body in a
 * `BaseResponse`, whose `data` carries the backend's snake_case keys, so both the wrapper and both
 * spellings are probed — the same shape the delegated checkout response is read with.
 *
 * A €0 cart only became watchable once fever2 started creating a real split session for it and
 * returning its id as `split_session_id`; while that id is absent every field comes back undefined
 * and the caller leaves the watch off.
 */
export function readFreeCheckoutFiscalWatch(response: unknown): FreeCheckoutFiscalWatch {
  const sources = readSources(response);
  const splitSessionId = readSplitSessionId(sources);
  return {
    ...(isTrueInAnySource(sources, 'blockBooker', 'block_booker') && { blockBooker: true }),
    ...(isTrueInAnySource(sources, 'blocksPurchaseOnFailure', 'blocks_purchase_on_failure') && { blocksPurchaseOnFailure: true }),
    ...(splitSessionId !== null && { splitSessionId }),
  };
}

function readSources(response: unknown): Record<string, unknown>[] {
  const direct = asRecord(response);
  if (direct === null) {
    return [];
  }
  const nested = asRecord(direct['data']);
  return nested === null ? [direct] : [direct, nested];
}

function readSplitSessionId(sources: Record<string, unknown>[]): string | null {
  for (const source of sources) {
    const candidate = source['splitSessionId'] ?? source['split_session_id'];
    if (typeof candidate === 'string' && candidate.length > 0) {
      return candidate;
    }
  }
  return null;
}

function isTrueInAnySource(sources: Record<string, unknown>[], camelKey: string, snakeKey: string): boolean {
  return sources.some(source => source[camelKey] === true || source[snakeKey] === true);
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === 'object' ? (value as Record<string, unknown>) : null;
}
