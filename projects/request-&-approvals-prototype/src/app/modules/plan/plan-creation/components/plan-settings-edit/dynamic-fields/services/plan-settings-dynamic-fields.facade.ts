import { computed, inject, Injectable, signal } from '@angular/core';

import { DynamicFieldEntity } from '@fz-original/app/shared/dynamic-fields/enums/dynamic-field-entity.enum';
import { DynamicFields, DynamicFieldValueWrite } from '@fz-original/app/shared/dynamic-fields/models/dynamic-fields.model';
import { DynamicFieldsEventTimezoneService } from '@fz-original/app/shared/dynamic-fields/services/dynamic-fields-event-timezone.service';
import { DynamicFieldsService } from '@fz-original/app/shared/dynamic-fields/services/dynamic-fields.service';
import { saveDynamicFieldsRefused } from '@fz-original/app/shared/dynamic-fields/tracking/events/save-dynamic-fields-refused.event';
import { saveDynamicFields } from '@fz-original/app/shared/dynamic-fields/tracking/events/save-dynamic-fields.event';
import { resolveRefusalStatus } from '@fz-original/app/shared/dynamic-fields/tracking/utils/resolve-refusal-status.util';
import { FeatureFlags } from '@fz-original/app/shared/optimizely/feature-flags';
import { OptimizelyService } from '@fz-original/app/shared/optimizely/optimizely.service';
import { PartnerService } from '@fz-original/app/shared/services/partner/partner.service';
import { FzTrackingService } from '@fz/fz-tracking/src/public-api';
import { catchError, EMPTY, map, Observable, of, switchMap, tap, throwError } from 'rxjs';

@Injectable()
export class PlanSettingsDynamicFieldsFacade {
  readonly #dynamicFieldsEventTimezoneService = inject(DynamicFieldsEventTimezoneService);
  readonly #dynamicFieldsService = inject(DynamicFieldsService);
  readonly #fzTracking = inject(FzTrackingService);
  readonly #optimizelyService = inject(OptimizelyService);
  readonly #partnerService = inject(PartnerService);

  readonly #dynamicFields = signal<DynamicFields | null>(null);
  readonly #eventTimezone = signal<string | null>(DynamicFieldsEventTimezoneService.DEFAULT_TIMEZONE);
  readonly #planId = signal<number | null>(null);

  readonly canWrite = computed(() => this.#dynamicFields()?.canWrite ?? false);
  readonly eventTimezone = this.#eventTimezone.asReadonly();
  readonly fields = computed(() => this.#dynamicFields()?.fields ?? []);
  readonly hasFields = computed(() => this.fields().length > 0);
  readonly planId = this.#planId.asReadonly();
  readonly planValues = computed(() => {
    const planId = this.#planId();
    return planId === null ? {} : (this.#dynamicFields()?.values[planId] ?? {});
  });

  load(planId: number): Observable<DynamicFields | null> {
    this.#planId.set(planId);
    this.#dynamicFields.set(null);

    const partnerId = this.#partnerService.getPartner()?.id ?? null;
    if (partnerId === null || !(this.#optimizelyService.isFeatureEnabled(FeatureFlags.DYNAMIC_FIELDS) ?? false)) {
      return of(null);
    }

    return this.#dynamicFieldsService.getPlanEntityDynamicFields(partnerId, planId, DynamicFieldEntity.MainPlan).pipe(
      catchError(() => of(null)),
      switchMap(dynamicFields =>
        this.#dynamicFieldsEventTimezoneService
          .resolve(partnerId, planId, dynamicFields?.fields ?? [])
          .pipe(map(timezone => ({ dynamicFields, timezone }))),
      ),
      tap(({ dynamicFields, timezone }) => {
        if (this.#planId() === planId) {
          this.#eventTimezone.set(timezone);
          this.#dynamicFields.set(dynamicFields);
        }
      }),
      map(({ dynamicFields }) => dynamicFields),
    );
  }

  save(writes: DynamicFieldValueWrite[]): Observable<void> {
    const partnerId = this.#partnerService.getPartner()?.id ?? null;
    const planId = this.#planId();
    if (partnerId === null || planId === null) {
      return EMPTY;
    }

    return this.#dynamicFieldsService.updatePlanEntityDynamicFields(partnerId, planId, DynamicFieldEntity.MainPlan, writes).pipe(
      tap(() => {
        this.#applySavedValues(planId, writes);
        this.#trackSave(planId, writes);
      }),
      catchError((error: unknown) => {
        this.#trackRefusal(planId, error);
        return throwError(() => error);
      }),
    );
  }

  #applySavedValues(planId: number, writes: DynamicFieldValueWrite[]): void {
    this.#dynamicFields.update(dynamicFields => {
      if (dynamicFields === null) {
        return null;
      }
      const savedValues = Object.fromEntries(writes.map(write => [write.id, write.value]));
      return { ...dynamicFields, values: { ...dynamicFields.values, [planId]: { ...dynamicFields.values[planId], ...savedValues } } };
    });
  }

  #trackSave(planId: number, writes: DynamicFieldValueWrite[]): void {
    const fieldsById = new Map(this.fields().map(field => [field.id, field.fieldName]));
    this.#fzTracking.track(
      saveDynamicFields({
        entity: DynamicFieldEntity.MainPlan,
        fieldNames: writes.map(write => fieldsById.get(write.id)).filter((name): name is string => name !== undefined),
        planId,
      }),
    );
  }

  #trackRefusal(planId: number, error: unknown): void {
    const status = resolveRefusalStatus(error);
    if (status === null) {
      return;
    }
    this.#fzTracking.track(
      saveDynamicFieldsRefused({
        entity: DynamicFieldEntity.MainPlan,
        planId,
        status,
      }),
    );
  }
}
