import { ActivatedRouteSnapshot, CanDeactivateFn, RouterStateSnapshot } from '@angular/router';

import { Observable } from 'rxjs';

import { KioskRealTimeLeaveHandler } from '../../models/kiosk-real-time-seating.model';

/** Keeps the ticketing route, and so the seat map iframe, until a live real-time basket has been released. */
export const kioskTicketingLeaveGuard: CanDeactivateFn<KioskRealTimeLeaveHandler> = (
  component: KioskRealTimeLeaveHandler,
  currentRoute: ActivatedRouteSnapshot,
  currentState: RouterStateSnapshot,
  nextState: RouterStateSnapshot,
): Observable<boolean> => component.releaseBeforeLeave(nextState.url);
