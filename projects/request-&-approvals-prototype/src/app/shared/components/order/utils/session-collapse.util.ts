import { CartSession } from '../../../models/cart/cart-session.model';
import { isTransactionFeeSessionType } from '../../../models/session-type/session-type.util';

/** A lone session with more codes than this starts collapsed, so a long code list does not push the order's actions off screen. */
export const SESSION_COLLAPSED_BY_DEFAULT_CODE_THRESHOLD = 5;

/**
 * Whether a session row of an order starts collapsed. A searched ticket (by id, or the owner of a scanned
 * code) is the only one open; without a search, an order with several sessions starts with all of them
 * collapsed, and a single session only when it holds many codes.
 */
export function isSessionCollapsedByDefault(
  session: CartSession,
  sessions: readonly CartSession[],
  searchedTicketId?: number | null,
): boolean {
  if (searchedTicketId) {
    return session.ticketId !== searchedTicketId;
  }

  const listableSessions = sessions.filter(candidate => !isTransactionFeeSessionType(candidate.sessionType));
  if (listableSessions.length > 1) {
    return true;
  }

  return (session.accessTicketIds?.length ?? 0) > SESSION_COLLAPSED_BY_DEFAULT_CODE_THRESHOLD;
}
