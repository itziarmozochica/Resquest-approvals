import { InjectionToken } from '@angular/core';

import { type TicketingStrategy } from '../models/ticketing-strategy.model';

/**
 * The single ticketing swap point, and the **only** injection path to the business layer:
 * `PointOfSaleComponent` injects this token, never a concrete class. `providePointOfSale()` binds it
 * with `useClass: PointOfSaleTicketing`.
 *
 * A future flow (invitation, reschedule, kiosk, reservation) swaps the `useClass` in its own provider
 * factory; nothing in the component or the template changes, because everything they consume is
 * declared on {@link TicketingStrategy}.
 */
export const TICKETING_STRATEGY = new InjectionToken<TicketingStrategy>('TICKETING_STRATEGY');
