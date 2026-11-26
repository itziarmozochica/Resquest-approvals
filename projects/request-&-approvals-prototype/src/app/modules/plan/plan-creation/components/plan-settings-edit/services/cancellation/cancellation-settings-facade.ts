import { computed, inject, Injectable, Signal, signal } from '@angular/core';

import type {
  CancellationSettingsFormGroup,
  CancellationSettingsFormValue,
} from '@fz-original/app/modules/event-settings/components/cancellation-settings-section/cancellation-settings-section.types';
import { createCancellationSettingsFormGroup } from '@fz-original/app/modules/event-settings/components/cancellation-settings-section/cancellation-settings-section.utils';
import { MainPlanSettings } from '@fz-original/app/modules/event-settings/models/main-plan-settings.model';
import {
  CancellationSettingsSectionConfig,
  OtherSettingsState,
} from '@fz-original/app/modules/event-settings/models/settings-configs.model';
import { CancellationSettingsVisibilityService } from '@fz-original/app/modules/event-settings/services/cancellation-settings-visibility.service';
import { MainPlanSettingsService } from '@fz-original/app/modules/event-settings/services/main-plan-settings.service';
import {
  buildCancellationSettingsSectionConfig,
  buildOtherSettingsStateFromSettings,
} from '@fz-original/app/modules/event-settings/utils/settings-configs.builder';
import {
  applyCancellationSettingsPayload,
  buildCancellationSettingsPayload,
  CancellationSettingsPayload,
  hasCancellationSettingsChanges,
  isFormValidIgnoringUneditableCancellationControls,
} from '@fz-original/app/modules/plan/plan-creation/components/plan-settings-edit/shared/cancellation-settings-payload.util';
import { resolvePlanSaveContext } from '@fz-original/app/modules/plan/plan-creation/components/plan-settings-edit/shared/resolve-plan-save-context.util';
import { saveMainPlanSettings } from '@fz-original/app/modules/plan/tracking/events/save-main-plan-settings.event';
import { FzTrackingService } from '@fz/fz-tracking/src/public-api';
import { IgntToastService } from '@ignite/common';
import { TranslateService } from '@ngx-translate/core';
import { catchError, map, Observable, of, switchMap, tap } from 'rxjs';

import { CancellationSettingsSaveOutcome, CancellationSettingsTrackingData } from './cancellation-settings-facade.types';

@Injectable()
export class CancellationSettingsFacade {
  static readonly defaultValue: CancellationSettingsFormValue = {
    allowTicketCancellations: false,
    hoursBeforeSessionCancellationNotAllowed: null,
  };

  readonly #fzTracking = inject(FzTrackingService);
  readonly #mainPlanSettingsService = inject(MainPlanSettingsService);
  readonly #toastService = inject(IgntToastService);
  readonly #translateService = inject(TranslateService);
  readonly #visibilityService = inject(CancellationSettingsVisibilityService);

  #savedValue: CancellationSettingsFormValue = CancellationSettingsFacade.defaultValue;
  readonly #state = signal<OtherSettingsState | null>(null);

  readonly config: Signal<CancellationSettingsSectionConfig | null> = computed(() => {
    const state = this.#state();
    return state === null ? null : buildCancellationSettingsSectionConfig(state);
  });
  readonly form: CancellationSettingsFormGroup = createCancellationSettingsFormGroup(CancellationSettingsFacade.defaultValue);
  readonly isVisible: Signal<boolean> = computed(() => {
    const state = this.#state();
    return state !== null && this.#visibilityService.canView(state);
  });

  get isDirty(): boolean {
    return this.isVisible() && this.form.dirty;
  }

  get isInvalid(): boolean {
    return this.isVisible() && !isFormValidIgnoringUneditableCancellationControls(this.form, this.config());
  }

  initialize(settings: Partial<MainPlanSettings> | null): void {
    if (settings === null) {
      this.#state.set(null);
      return;
    }
    const value: CancellationSettingsFormValue = {
      allowTicketCancellations: settings.allowTicketCancellations ?? CancellationSettingsFacade.defaultValue.allowTicketCancellations,
      hoursBeforeSessionCancellationNotAllowed:
        settings.hoursBeforeSessionCancellationNotAllowed ??
        CancellationSettingsFacade.defaultValue.hoursBeforeSessionCancellationNotAllowed,
    };
    this.#savedValue = value;
    this.form.reset(value);
    this.#state.set(buildOtherSettingsStateFromSettings(settings));
  }

  persist(
    partnerId: number,
    planId: number,
    dedicatedSave$: Observable<unknown> | null,
    trackingData: CancellationSettingsTrackingData,
  ): Observable<CancellationSettingsSaveOutcome> {
    const dedicatedSaved$: Observable<boolean> = (dedicatedSave$ ?? of(null)).pipe(
      map((): boolean => true),
      catchError(() => of(false)),
    );

    return dedicatedSaved$.pipe(
      switchMap((isDedicatedSaved: boolean) =>
        isDedicatedSaved ? this.#saveIfDirty(partnerId, planId, trackingData) : of<CancellationSettingsSaveOutcome>('dedicatedFailed'),
      ),
    );
  }

  #saveIfDirty(
    partnerId: number,
    planId: number,
    trackingData: CancellationSettingsTrackingData,
  ): Observable<CancellationSettingsSaveOutcome> {
    if (!this.isDirty) {
      return of('saved');
    }

    const payload: CancellationSettingsPayload = buildCancellationSettingsPayload(this.#savedValue, this.form.getRawValue());
    if (!hasCancellationSettingsChanges(payload)) {
      this.form.markAsPristine();
      return of('saved');
    }

    return this.#mainPlanSettingsService.updateMainPlanGeneralSettings(partnerId, planId, payload).pipe(
      tap(() => {
        this.#savedValue = applyCancellationSettingsPayload(this.#savedValue, payload);
        this.form.markAsPristine();
        this.#trackSavedInEditMode(planId, trackingData, payload);
      }),
      map((): CancellationSettingsSaveOutcome => 'saved'),
      catchError(() => {
        this.#showSaveErrorToast();
        return of<CancellationSettingsSaveOutcome>('cancellationFailed');
      }),
    );
  }

  #trackSavedInEditMode(planId: number, trackingData: CancellationSettingsTrackingData, payload: CancellationSettingsPayload): void {
    if (trackingData.mode !== 'edit') {
      return;
    }
    this.#fzTracking.track(
      saveMainPlanSettings({ context: resolvePlanSaveContext(trackingData.mode), planId, planName: trackingData.planName, ...payload }),
    );
  }

  #showSaveErrorToast(): void {
    this.#toastService.danger(this.#translateService.instant('eventSettings.cancellations.saveError'));
  }
}
