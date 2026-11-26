import { inject, Injectable } from '@angular/core';

import { EMPTY, Observable, of, timer } from 'rxjs';
import { catchError, concatMap, first, take, tap } from 'rxjs/operators';

import { SessionTypeInventory } from '../../../shared/services/sessions/session-type.model';
import { SessionTypeService } from '../../../shared/services/sessions/session-type.service';

export const POLL_INTERVAL_MS = 5000;
export const MAX_POLL_ATTEMPTS = 12;

export function hasProvisionedInventory(inventory: SessionTypeInventory | null): boolean {
  return inventory?.sessionTypes.some(sessionType => sessionType.hasSessions === true) ?? false;
}

@Injectable({
  providedIn: 'root',
})
export class InventoryProvisioningService {
  readonly #sessionTypeService = inject(SessionTypeService);

  readonly #pendingPlanIds = new Set<number>();

  clearProvisioning(planId: number): void {
    this.#pendingPlanIds.delete(planId);
  }

  isProvisioning(planId: number): boolean {
    return this.#pendingPlanIds.has(planId);
  }

  markProvisioning(planId: number): void {
    this.#pendingPlanIds.add(planId);
  }

  pollInventoryUntilReady$(planId: number): Observable<SessionTypeInventory> {
    return timer(POLL_INTERVAL_MS, POLL_INTERVAL_MS).pipe(
      take(MAX_POLL_ATTEMPTS),
      concatMap(() => this.#sessionTypeService.getSessionTypesInventoryByPlanId(planId).pipe(catchError(() => of(null)))),
      first((inventory): inventory is SessionTypeInventory => hasProvisionedInventory(inventory)),
      tap(() => this.#pendingPlanIds.delete(planId)),
      catchError(() => {
        this.#pendingPlanIds.delete(planId);
        return EMPTY;
      }),
    );
  }
}
