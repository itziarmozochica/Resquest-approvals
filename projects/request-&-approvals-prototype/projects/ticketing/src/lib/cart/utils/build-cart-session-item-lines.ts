import type { CartSessionItemLine } from '../models/cart-session-item-line.model';
import type { CartSession } from '../models/cart-session.model';

export interface CartSessionLinesEligibility {
  readonly sessionId: number;
  readonly units: number;
  readonly hasSeating?: boolean;
  readonly isAddOn?: boolean;
  readonly isPack?: boolean;
  readonly seatingHoldToken?: string;
  readonly seats?: readonly unknown[] | null;
}

export function buildCartSessionItemLines(
  sessions: readonly CartSession[],
  storedLines: readonly CartSessionItemLine[] = [],
): CartSessionItemLine[] {
  return sessions
    .filter((session: CartSession) => session.units > 0)
    .flatMap((session: CartSession) => {
      const storedSessionLines = storedLines.filter((line: CartSessionItemLine) => line.sessionId === session.sessionId);

      return Array.from({ length: session.units }, (unused: unknown, index: number) => {
        const storedLine = storedSessionLines.at(index);
        const mainPlanId = session.mainPlanId ?? storedLine?.mainPlanId ?? null;

        return {
          ...(storedLine?.id !== undefined && { id: storedLine.id }),
          mainPlanId,
          parent: storedLine?.parent ?? null,
          sessionId: session.sessionId,
        };
      });
    });
}

export function canUseCartSessionItemLines(sessions: readonly CartSessionLinesEligibility[]): boolean {
  const activeSessions = sessions.filter((session: CartSessionLinesEligibility) => session.units > 0);

  return activeSessions.length > 0 && activeSessions.every((session: CartSessionLinesEligibility) => isEligibleSession(session));
}

function isEligibleSession(session: CartSessionLinesEligibility): boolean {
  const hasAssignedSeats = (session.seats?.length ?? 0) > 0;
  const hasHoldToken = Boolean(session.seatingHoldToken);
  const isSeated = session.hasSeating === true || hasAssignedSeats || hasHoldToken;

  return !isSeated && session.isPack !== true && session.isAddOn !== true;
}
