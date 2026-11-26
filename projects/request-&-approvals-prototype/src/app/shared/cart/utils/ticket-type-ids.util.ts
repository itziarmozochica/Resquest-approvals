import { Cart } from '../../models/cart/cart.model';
import { isTransactionFeeSessionType } from '../../models/session-type/session-type.util';

export function ticketTypeIdsOf(cart: Cart | null | undefined): readonly number[] {
  const sessionsByDatetime = cart?.sessionItemsByDatetime;

  if (sessionsByDatetime === undefined) {
    return [];
  }

  const ids = [...sessionsByDatetime.values()]
    .flat()
    .filter(cartSession => !isTransactionFeeSessionType(cartSession.sessionType))
    .map(cartSession => cartSession.sessionType?.id)
    .filter((id): id is number => id !== undefined);

  return [...new Set(ids)];
}
