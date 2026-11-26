import { inject, Injectable } from '@angular/core';

import { UserAttributes } from '@optimizely/optimizely-sdk';

import { CartSession } from '../../models/cart/cart-session.model';
import { Cart } from '../../models/cart/cart.model';
import { RegularSessionAvailabilitySummaryByDate } from '../../models/session-availability/regular-session-availability-summary-by-date.model';
import { FeatureFlags } from '../../optimizely/feature-flags';
import { OptimizelyService } from '../../optimizely/optimizely.service';

@Injectable({ providedIn: 'root' })
export class TicketingContextService {
  readonly #optimizelyService = inject(OptimizelyService);

  /**
   * Returns cart sessions (tickets) belonging to the currently selected plan from both
   * confirmed and non-confirmed carts.
   */
  getTicketsForCurrentPlan(params: { currentPlanId: number; cart?: Cart | null; nonConfirmedCart?: Cart | null }): CartSession[] {
    const { cart, currentPlanId, nonConfirmedCart } = params;
    const fromConfirmed = this.#getSessionsForPlan(cart, currentPlanId);
    const fromNonConfirmed = this.#getSessionsForPlan(nonConfirmedCart, currentPlanId);
    return [...fromConfirmed, ...fromNonConfirmed];
  }

  hasMultiplanSeatingFlowContext(params: {
    sessionSummaries: RegularSessionAvailabilitySummaryByDate[];
    cart?: Cart | null;
    nonConfirmedCart?: Cart | null;
    userAttributes?: UserAttributes;
  }): boolean {
    const { cart, nonConfirmedCart, sessionSummaries, userAttributes } = params;
    const currentPlanHasSeatings = this.#planHasSeatings(sessionSummaries);
    const multiplanEnabled = this.#isMultiplanFeatureEnabled(userAttributes);

    if (currentPlanHasSeatings && multiplanEnabled) {
      return true;
    }

    if (currentPlanHasSeatings) {
      return false;
    }

    return this.#cartHasSeatingTickets(cart) || this.#cartHasSeatingTickets(nonConfirmedCart);
  }

  #cartHasSeatingTickets(cart: Cart | null | undefined): boolean {
    if (!cart?.sessionItemsByDatetime?.size) {
      return false;
    }
    for (const sessions of cart.sessionItemsByDatetime.values()) {
      if (sessions.some((s: CartSession) => this.#isSeatedSession(s))) {
        return true;
      }
    }
    return false;
  }

  #getSessionsForPlan(cart: Cart | null | undefined, currentPlanId: number): CartSession[] {
    if (!cart?.sessionItemsByDatetime?.size) {
      return [];
    }
    const sessions: CartSession[] = [];
    for (const cartSessions of cart.sessionItemsByDatetime.values()) {
      for (const session of cartSessions) {
        if (session.mainPlanId === currentPlanId) {
          sessions.push(session);
        }
      }
    }
    return sessions;
  }

  #isMultiplanFeatureEnabled(userAttributes?: UserAttributes): boolean {
    return this.#optimizelyService.isFeatureEnabled(FeatureFlags.BOX_OFFICE_MULTIPLAN_FLOW, userAttributes) ?? false;
  }

  #isSeatedSession(cartSession: CartSession): boolean {
    return cartSession.hasSeating === true || cartSession.seatingProvider != null || (cartSession.seats?.length ?? 0) > 0;
  }

  #planHasSeatings(sessionSummaries: RegularSessionAvailabilitySummaryByDate[]): boolean {
    return sessionSummaries.some(summaryByDate =>
      summaryByDate.sessionAvailabilityByDatetimeList.some(datetimeAvailability =>
        datetimeAvailability.sessionAvailabilityList.some(session => session.seating !== null),
      ),
    );
  }
}
