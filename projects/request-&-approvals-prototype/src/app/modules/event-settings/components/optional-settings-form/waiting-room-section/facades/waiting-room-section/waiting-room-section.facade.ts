import { DestroyRef, inject, Injectable } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { SelectOption } from '@fz-original/app/shared/layout/filters/select/select.interface';
import { ChannelsService } from '@fz-original/app/shared/services/channel/channels.service';
import { PartnerService } from '@fz-original/app/shared/services/partner/partner.service';
import { SelectedPlanContextService } from '@fz-original/app/shared/services/selected-plan-context/selected-plan-context.service';
import { ToastService } from '@fz-original/app/shared/services/toast/toast.service';
import { AlertSentiment } from '@ignite/legacy/components/ignt-alert/ignt-alert.component';
import { TranslateService } from '@ngx-translate/core';
import { combineLatest, Observable, of } from 'rxjs';
import { catchError, distinctUntilChanged, filter, map, pairwise, switchMap, tap } from 'rxjs/operators';

import { WaitingRoomValidationDisplayService } from '../../services/waiting-room-validation-display/waiting-room-validation-display.service';
import { feverMarketplaceOption, waitingRoomI18n } from '../../waiting-room-section.constants';
import { WaitingRoomFormGroup } from '../../waiting-room-section.types';
import {
  resetWaitingRoomFormFieldsForChannelChange,
  syncWaitingRoomValidatorsForEnabledState,
  watchControlValue$,
} from '../../waiting-room-section.utils';
import { WaitingRoomFacade } from '../waiting-room/waiting-room.facade';
import type { WaitingRoomLoadInputs } from '../waiting-room/waiting-room.facade.types';
import { mapChannelsToOptions } from './map-channels-to-options';
import { canStartWaitingRoomLoad, isAwaitingPartnerOrPlanContext, isSameWaitingRoomLoadKey } from './waiting-room-section.facade.utils';

interface WaitingRoomLoadPipelineUi {
  setPlanInfo: (planType: string | null, planMaxOutflow: number | null) => void;
  setShowLoader: (show: boolean) => void;
  setToggleDisabled: (disabled: boolean) => void;
}

@Injectable()
export class WaitingRoomSectionFacade {
  readonly #channelsService = inject(ChannelsService);
  readonly #partnerService = inject(PartnerService);
  readonly #selectedPlanContextService = inject(SelectedPlanContextService);
  readonly #toastService = inject(ToastService);
  readonly #translateService = inject(TranslateService);
  readonly #waitingRoomValidationDisplayService = inject(WaitingRoomValidationDisplayService);
  readonly #waitingRoomFacade = inject(WaitingRoomFacade);

  #createInputs$(form$: Observable<WaitingRoomFormGroup>): Observable<WaitingRoomLoadInputs> {
    return form$.pipe(
      switchMap(form => {
        const { channelId: channelIdControl } = form.controls;

        return combineLatest([
          of(form),
          this.#partnerService.partner$(),
          this.#selectedPlanContextService.observeContextChanges(),
          watchControlValue$(channelIdControl),
        ]).pipe(
          map(([formGroup, partner, context, channelId]) => ({
            channelId: channelId ?? '',
            partnerId: partner?.id ?? null,
            planId: context.planId ?? null,
            form: formGroup,
          })),
          distinctUntilChanged((prev, curr) => isSameWaitingRoomLoadKey(prev, curr)),
        );
      }),
    );
  }

  getChannelOptions$(): Observable<SelectOption[]> {
    return this.#partnerService.partner$().pipe(
      map(partner => {
        if (!partner) return null;
        const { id } = partner;
        return id ?? null;
      }),
      switchMap(partnerId => {
        if (partnerId !== null) {
          return this.#channelsService.getChannels(partnerId).pipe(
            map(({ data }) => mapChannelsToOptions(data)),
            catchError(() => of([feverMarketplaceOption])),
          );
        }
        return of([feverMarketplaceOption]);
      }),
    );
  }

  runLoadPipeline(form$: Observable<WaitingRoomFormGroup>, destroyRef: DestroyRef, ui: WaitingRoomLoadPipelineUi): void {
    const { setPlanInfo, setShowLoader, setToggleDisabled } = ui;

    this.#createInputs$(form$)
      .pipe(
        switchMap(inputs => {
          if (isAwaitingPartnerOrPlanContext(inputs)) {
            setToggleDisabled(true);
            setShowLoader(true);
            setPlanInfo(null, null);

            return of(void 0);
          }

          if (!canStartWaitingRoomLoad(inputs)) {
            setToggleDisabled(false);
            setShowLoader(false);
            setPlanInfo(null, null);

            return of(void 0);
          }

          setToggleDisabled(true);
          setShowLoader(true);

          return this.#waitingRoomFacade.loadDetailsAndPatchForm$(inputs).pipe(
            tap(planInfo => {
              const { planType = null, planMaxOutflow = null } = planInfo ?? {};
              setToggleDisabled(false);
              setShowLoader(false);
              setPlanInfo(planType, planMaxOutflow);
            }),
            catchError(() => {
              setShowLoader(false);
              setPlanInfo(null, null);
              this.#toastService.add({
                autoHide: true,
                message: this.#translateService.instant(`${waitingRoomI18n}.loadError`),
                sentiment: AlertSentiment.danger,
              });

              return of(void 0);
            }),
          );
        }),
        takeUntilDestroyed(destroyRef),
      )
      .subscribe();
  }

  syncWaitingRoomValidators(form$: Observable<WaitingRoomFormGroup>, destroyRef: DestroyRef): void {
    this.#waitingRoomValidationDisplayService.disableValidationErrors();

    // Sync validators when the enabled toggle changes.
    form$
      .pipe(
        switchMap(form =>
          watchControlValue$(form.controls.enabled).pipe(
            tap(() => {
              this.#waitingRoomValidationDisplayService.disableValidationErrors();
              syncWaitingRoomValidatorsForEnabledState(form);
            }),
          ),
        ),
        takeUntilDestroyed(destroyRef),
      )
      .subscribe();

    // On channel change: clear validation UI and reset detail fields.
    form$
      .pipe(
        switchMap(form =>
          watchControlValue$(form.controls.channelId).pipe(
            pairwise(),
            filter(([previous, current]) => previous !== current),
            tap(() => {
              this.#waitingRoomValidationDisplayService.disableValidationErrors();
              resetWaitingRoomFormFieldsForChannelChange(form);
            }),
          ),
        ),
        takeUntilDestroyed(destroyRef),
      )
      .subscribe();
  }
}
