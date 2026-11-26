import { CartSession } from '../../../models/cart/cart-session.model';
import { isTransactionFeeSessionType } from '../../../models/session-type/session-type.util';

export function getTransactionFeeAccessTicketIds(cartSessions: CartSession[]): Set<string> {
  return new Set(
    cartSessions.filter(session => isTransactionFeeSessionType(session.sessionType)).flatMap(session => session.accessTicketIds ?? []),
  );
}
