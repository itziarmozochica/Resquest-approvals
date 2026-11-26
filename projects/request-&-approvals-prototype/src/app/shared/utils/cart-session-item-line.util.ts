import {
  CartSessionItemLine,
  CartSessionItemLineEligibilityOptions,
  CartSessionItemLineRequestBody,
} from '../models/cart/cart-session-item-line.model';
import { CartSession } from '../models/cart/cart-session.model';

export function buildCartSessionItemLines(
  sessionItemsByDatetime: Map<string, CartSession[]>,
  storedLines: CartSessionItemLine[] = [],
): CartSessionItemLineRequestBody[] {
  return Array.from(sessionItemsByDatetime.values())
    .flat()
    .filter((session: CartSession) => session.units > 0)
    .flatMap((session: CartSession) => {
      const storedSessionLines = storedLines.filter((line: CartSessionItemLine) => line.sessionId === session.sessionId);
      const manualTicketPrice = getManualTicketPrice(session);

      return Array.from({ length: session.units }, (_, index: number) => {
        const storedLine = storedSessionLines[index];
        const mainPlanId = session.mainPlanId ?? storedLine?.mainPlanId;

        return {
          ...(storedLine?.id !== undefined && { id: storedLine.id }),
          ...(mainPlanId != null && { main_plan_id: mainPlanId }),
          ...(manualTicketPrice !== undefined && { manual_ticket_price: manualTicketPrice }),
          parent: storedLine?.parent ?? null,
          session_id: session.sessionId,
        };
      });
    });
}

export function canUseCartSessionItemLines(
  sessionItemsByDatetime: Map<string, CartSession[]>,
  { allowAddOns = false }: CartSessionItemLineEligibilityOptions = {},
): boolean {
  const sessions = Array.from(sessionItemsByDatetime.values())
    .flat()
    .filter((session: CartSession) => session.units > 0);

  return sessions.length > 0 && sessions.every((session: CartSession) => isEligibleSession(session, allowAddOns));
}

function isEligibleSession(session: CartSession, allowAddOns: boolean): boolean {
  const hasAssignedSeats = (session.seats?.length ?? 0) > 0;
  const isSeated = session.hasSeating === true || session.seatingProvider != null || hasAssignedSeats;

  return !isSeated && session.isPack !== true && (allowAddOns || session.sessionType?.isAddOn !== true);
}

/**
 * Every line of a ticket type carries the same manual price; a pending clear sends `null`, no state sends nothing. A price read back
 * without its entry sends nothing either: the backend refuses a priced line with no `manual_prices` entry, and silence keeps it.
 */
function getManualTicketPrice(session: CartSession): number | null | undefined {
  if (session.manualPrice != null) {
    return session.manualPrice.entry === null ? undefined : session.manualPrice.unitPrice.amount;
  }
  return session.isManualPriceClearPending === true ? null : undefined;
}
