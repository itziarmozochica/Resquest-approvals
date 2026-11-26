import { Cart } from '../models/cart/cart.model';
import {
  RegularSessionAvailabilitySummaryByDate,
  RegularSessionAvailabilitySummaryByDatePropsAsKeys,
} from '../models/session-availability/regular-session-availability-summary-by-date.model';
import { SessionAvailability } from '../models/session-availability/session-availability.model';

function hasMatchingSession(cart: Cart, datetimeKey: string, sessionAvailability: SessionAvailability): boolean {
  const cartSessions = cart.sessionItemsByDatetime.get(datetimeKey);
  return (
    !!cartSessions &&
    cartSessions.some(cartSession => sessionAvailability.sessionType?.isPass === true && sessionAvailability.id === cartSession.sessionId)
  );
}

export function passSessionInCart(regularSessionAvailabilitySummaryByDate: RegularSessionAvailabilitySummaryByDate[], cart: Cart): boolean {
  const periods: RegularSessionAvailabilitySummaryByDatePropsAsKeys[] = [
    'morningSessions',
    'afternoonSessions',
    'eveningSessions',
    'nightSessions',
  ];

  return regularSessionAvailabilitySummaryByDate.some((dateSummary: RegularSessionAvailabilitySummaryByDate) =>
    periods.some((period: RegularSessionAvailabilitySummaryByDatePropsAsKeys) =>
      dateSummary[period].some(sessions =>
        sessions.sessionAvailabilityList.some(sessionAvailability =>
          Array.from(cart.sessionItemsByDatetime.keys()).some(datetimeKey => hasMatchingSession(cart, datetimeKey, sessionAvailability)),
        ),
      ),
    ),
  );
}
