import { inject, Injectable } from '@angular/core';

import { resolveEventTimezone } from '@fz-original/app/modules/plan/plan-creation/components/plan-settings-edit/shared/resolve-event-timezone.util';
import { PlanService } from '@fz-original/app/shared/services/plan/plan.service';
import { catchError, defaultIfEmpty, map, Observable, of } from 'rxjs';

import { DynamicFieldType } from '../enums/dynamic-field-type.enum';
import { DynamicField } from '../models/dynamic-fields.model';

@Injectable({ providedIn: 'root' })
export class DynamicFieldsEventTimezoneService {
  static readonly DEFAULT_TIMEZONE = 'UTC';

  readonly #planService = inject(PlanService);

  resolve(partnerId: number, planId: number, fields: DynamicField[]): Observable<string | null> {
    if (!fields.some(field => field.fieldType === DynamicFieldType.Datetime)) {
      return of(DynamicFieldsEventTimezoneService.DEFAULT_TIMEZONE);
    }

    return this.#planService.getPlan(partnerId, planId).pipe(
      map(plan => (plan.data === null ? null : resolveEventTimezone(plan.data))),
      defaultIfEmpty(null),
      catchError(() => of(null)),
    );
  }
}
