import { inject, Injectable } from '@angular/core';

import { ActiveShift } from '@fz-original/app/modules/box-office/ticketing/components/start-end-shift/start-end-shift.component';
import { UserShiftStorageService } from '@fz-original/app/modules/box-office/ticketing/services/user-shift/user-shift-storage.service';
import { UserService } from '@fz-original/app/shared/services/user/user.service';
import { FzTrackingService } from '@fz/fz-tracking/src/public-api';
import { Observable, of } from 'rxjs';
import { catchError, map, switchMap, tap } from 'rxjs/operators';

import { ShiftAbstractFactoryService } from '../../../shift/services/shift-abstract-factory/shift-abstract-factory.service';
import { posShiftEnded } from '../events/pos-shift-ended.event';
import { posShiftStarted } from '../events/pos-shift-started.event';
import { getShiftDurationMinutes, getShiftTransactionCount, resolveCashierId } from '../utils/pos-shift.util';

@Injectable()
export class TrackPosShiftService {
  readonly #fzTracking = inject(FzTrackingService);
  readonly #shiftAbstractFactory = inject(ShiftAbstractFactoryService);
  readonly #userService = inject(UserService);
  readonly #userShiftStorageService = inject(UserShiftStorageService);

  /**
   * @param cashCounted whether a person answered the end-shift modal's amount field. `false` when
   * the cashless flow closed the shift at 0 without asking.
   */
  endShiftAndTrackEnded<T>(shift: ActiveShift, endShift$: Observable<T>, cashCounted: boolean): Observable<T> {
    return this.#shiftAbstractFactory
      .getShiftSummaryProvider()
      .getShift(shift.oboVenueId, shift.id)
      .pipe(
        map(freshShift => getShiftTransactionCount(freshShift.paymentMethodSummaries)),
        catchError(() => of(0)),
        switchMap(transactionCount =>
          endShift$.pipe(
            tap(() => {
              this.#fzTracking.track(
                posShiftEnded({
                  cashCounted,
                  durationMinutes: getShiftDurationMinutes(shift.startTime),
                  transactionCount,
                }),
              );
            }),
          ),
        ),
      );
  }

  trackStarted(shift: ActiveShift): void {
    const cashierId = resolveCashierId(this.#userService.getUserId(), this.#userShiftStorageService.getOpenedShift(), shift.id);

    if (cashierId === undefined) {
      return;
    }

    this.#fzTracking.track(
      posShiftStarted({
        cashierId,
        setupId: shift.onsiteSetupId,
        venueId: shift.oboVenueId,
      }),
    );
  }
}
