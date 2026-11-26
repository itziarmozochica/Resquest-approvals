import { inject, Injectable } from '@angular/core';

import { initialWaitingRoomValues } from '@fz-original/app/modules/event-settings/components/optional-settings-form/waiting-room-section/waiting-room-section.constants';
import type {
  WaitingRoomFormGroup,
  WaitingRoomFormValue,
} from '@fz-original/app/modules/event-settings/components/optional-settings-form/waiting-room-section/waiting-room-section.types';
import {
  hasWaitingRoomId,
  syncWaitingRoomValidatorsForEnabledState,
} from '@fz-original/app/modules/event-settings/components/optional-settings-form/waiting-room-section/waiting-room-section.utils';
import { WaitingRoomService } from '@fz-original/app/modules/event-settings/services/waiting-room/waiting-room.service';
import type {
  CreateWaitingRoomInput,
  WaitingRoomDetails,
} from '@fz-original/app/modules/event-settings/services/waiting-room/waiting-room.service.types';
import { DateUtil } from '@fz-original/app/shared/utils/date.util';
import { map, Observable, of, switchMap, tap } from 'rxjs';

export type WaitingRoomFormValueForCreate = Omit<WaitingRoomFormValue, 'waitingRoomId' | 'enabled' | 'launchingDatetime'> & {
  launchingDatetime: string;
};

@Injectable({ providedIn: 'root' })
export class WaitingRoomSettingsFacade {
  readonly #waitingRoomService = inject(WaitingRoomService);

  #buildCreateWaitingRoomInput(formValue: WaitingRoomFormValueForCreate, mainPlanId: number): CreateWaitingRoomInput {
    const { channelId, launchingDatetime, language, minutesInPreQueue, timezone, visibilityMode, waitingRoomName } = formValue;

    return {
      channelId,
      launchingDatetime: DateUtil.dateTimeLocalToUtcIso(launchingDatetime),
      language,
      mainPlanId,
      minutesInPreQueue: Number(minutesInPreQueue),
      timezone,
      visibilityMode,
      waitingRoomName,
    };
  }

  #createWaitingRoom(
    partnerId: number,
    planId: number,
    waitingRoom: WaitingRoomFormValueForCreate,
    patchWaitingRoomId: (waitingRoomId: string) => void,
    patchDetails: (details: Pick<WaitingRoomDetails, 'maxOutflow'>) => void,
  ): Observable<void> {
    const body = this.#buildCreateWaitingRoomInput(waitingRoom, planId);

    const { channelId } = body;

    return this.#waitingRoomService.createWaitingRoom(partnerId, body).pipe(
      switchMap(() => this.#waitingRoomService.getWaitingRoomId(partnerId, planId, channelId)),
      switchMap(result => {
        const { waitingRoomId } = result ?? {};
        if (!waitingRoomId) return of(void 0);

        patchWaitingRoomId(waitingRoomId);
        return this.#waitingRoomService.getWaitingRoomDetails(partnerId, waitingRoomId).pipe(
          tap(details => {
            if (details) {
              patchDetails({ maxOutflow: details.maxOutflow });
            }
          }),
          map((): undefined => void 0),
        );
      }),
    );
  }

  #deleteWaitingRoom(partnerId: number, waitingRoomId: string, clearWaitingRoomId: () => void): Observable<void> {
    return this.#waitingRoomService.deleteWaitingRoom(partnerId, waitingRoomId).pipe(
      tap(() => clearWaitingRoomId()),
      map((): undefined => void 0),
    );
  }

  syncWaitingRoomIfDirty(partnerId: number, planId: number, waitingRoomControl: WaitingRoomFormGroup | null): Observable<void> {
    if (!waitingRoomControl) {
      return of(void 0);
    }

    if (!waitingRoomControl.dirty) {
      return of(void 0);
    }

    const waitingRoom = waitingRoomControl.value;

    if (waitingRoom == null) {
      return of(void 0);
    }

    const { waitingRoomId, enabled } = waitingRoom;
    const hasId = hasWaitingRoomId(waitingRoomId);
    const isDisabled = enabled === false;

    if (!isDisabled && !hasId) {
      if (!waitingRoomControl.valid) {
        return of(void 0);
      }

      const patchWaitingRoomId = (waitingRoomId: string): void => waitingRoomControl.patchValue({ waitingRoomId });
      const patchDetails = (details: Pick<WaitingRoomDetails, 'maxOutflow'>): void =>
        waitingRoomControl.patchValue({ maxOutflow: details.maxOutflow });

      return this.#createWaitingRoom(partnerId, planId, waitingRoom as WaitingRoomFormValueForCreate, patchWaitingRoomId, patchDetails);
    }

    if (hasId) {
      if (isDisabled) {
        const clearWaitingRoomId = (): void => {
          const { channelId } = waitingRoomControl.value;
          waitingRoomControl.patchValue({
            ...initialWaitingRoomValues,
            channelId,
          });
          syncWaitingRoomValidatorsForEnabledState(waitingRoomControl);
        };

        return this.#deleteWaitingRoom(partnerId, waitingRoomId, clearWaitingRoomId);
      }

      const maxOutflowControl = waitingRoomControl.get('maxOutflow');
      const maxOutflow = Number(waitingRoom.maxOutflow);
      if (waitingRoom.maxOutflow == null || !Number.isFinite(maxOutflow) || maxOutflowControl?.invalid) return of(void 0);
      return this.#updateOutflowIfNeeded(partnerId, maxOutflow, waitingRoomId, maxOutflowControl);
    }

    return of(void 0);
  }

  #updateOutflowIfNeeded(
    partnerId: number,
    maxOutflow: number,
    waitingRoomId: string,
    maxOutflowControl: ReturnType<WaitingRoomFormGroup['get']>,
  ): Observable<void> {
    if (!maxOutflowControl?.dirty) return of(void 0);

    return this.#waitingRoomService.updateOutflow(partnerId, waitingRoomId, maxOutflow).pipe(
      tap(() => maxOutflowControl?.markAsPristine()),
      map((): undefined => void 0),
    );
  }
}
