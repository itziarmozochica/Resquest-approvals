import { inject, Injectable } from '@angular/core';

import { PlanType } from '@fz-original/app/modules/event-settings/models/general-section.enum';
import { MainPlanSettings } from '@fz-original/app/modules/event-settings/models/main-plan-settings.model';
import { MainPlanSettingsService } from '@fz-original/app/modules/event-settings/services/main-plan-settings.service';
import { PlanSettingsFetcher } from '@fz-original/app/modules/plan/plan-creation/components/plan-setup/services/plan-settings-fetcher';
import { BaseErrorResponse } from '@fz-original/app/shared/models/base-response';
import { Observable, of, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';

@Injectable({ providedIn: 'root' })
export class StandardSettingsService implements PlanSettingsFetcher<Partial<MainPlanSettings> | null> {
  #mainPlanSettingsService = inject(MainPlanSettingsService);

  readonly planType = PlanType.standard;

  fetchSettings(partnerId: number, planId: number): Observable<Partial<MainPlanSettings> | null> {
    return this.#mainPlanSettingsService.getMainPlanGeneralSettings(partnerId, planId).pipe(
      catchError((error: BaseErrorResponse) => {
        if (error?.error?.status === 404) {
          return of(null);
        }
        return throwError(() => error);
      }),
    );
  }
}
