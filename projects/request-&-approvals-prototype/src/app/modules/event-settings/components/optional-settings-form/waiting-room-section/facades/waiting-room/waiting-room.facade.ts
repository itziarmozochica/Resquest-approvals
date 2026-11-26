import { inject, Injectable } from '@angular/core';

import { DateUtil } from '@fz-original/app/shared/utils/date.util';
import { Observable, of } from 'rxjs';
import { map, switchMap, tap } from 'rxjs/operators';

import { WaitingRoomService } from '../../../../../services/waiting-room/waiting-room.service';
import type { WaitingRoomDetails } from '../../../../../services/waiting-room/waiting-room.service.types';
import { initialWaitingRoomValues } from '../../waiting-room-section.constants';
import type { WaitingRoomFormGroup } from '../../waiting-room-section.types';
import { WaitingRoomLoadInputs, WaitingRoomPlanInfo } from './waiting-room.facade.types';

@Injectable({ providedIn: 'root' })
export class WaitingRoomFacade {
  readonly #waitingRoomService = inject(WaitingRoomService);

  loadDetailsAndPatchForm$(inputs: WaitingRoomLoadInputs): Observable<WaitingRoomPlanInfo | null> {
    const { partnerId, planId, form, channelId } = inputs;
    const shouldSkipLoad = partnerId == null || planId == null || !channelId || !form;

    if (shouldSkipLoad) {
      return of(null);
    }

    return this.#waitingRoomService.getWaitingRoomId(partnerId, planId, channelId).pipe(
      switchMap(overview => {
        const { waitingRoomId } = overview ?? {};

        if (!waitingRoomId) {
          this.#patchForm(form, null, null, channelId);
          return of(null);
        }

        return this.#waitingRoomService.getWaitingRoomDetails(partnerId, waitingRoomId).pipe(
          tap(details => this.#patchForm(form, waitingRoomId, details, channelId)),
          map(details => {
            if (!details) {
              return null;
            }

            const { planType, planMaxOutflow } = details;
            const planInfo: WaitingRoomPlanInfo = { planType, planMaxOutflow };

            return planInfo;
          }),
        );
      }),
    );
  }

  #patchForm(
    form: WaitingRoomFormGroup,
    waitingRoomId: string | null,
    details: WaitingRoomDetails | null,
    selectedChannelId: string,
  ): void {
    if (!details) {
      form.patchValue(
        {
          ...initialWaitingRoomValues,
          channelId: selectedChannelId,
          waitingRoomId,
        },
        { emitEvent: true },
      );
      return;
    }

    const {
      channelId,
      launchingDatetime: launchingDatetimeRaw,
      language,
      maxOutflow,
      minutesInPreQueue,
      timezone,
      visibilityMode,
      waitingRoomName,
    } = details;

    const launchingDatetime = DateUtil.isoToDateTimeLocalString(launchingDatetimeRaw);
    const enabled = true;

    form.patchValue({
      channelId,
      enabled,
      language,
      launchingDatetime,
      maxOutflow,
      minutesInPreQueue,
      timezone,
      visibilityMode,
      waitingRoomId,
      waitingRoomName,
    });
  }
}
