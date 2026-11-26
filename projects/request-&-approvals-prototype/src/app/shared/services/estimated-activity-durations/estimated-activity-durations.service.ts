import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';

import { environment } from '@fz-original/environments/environment';
import { Observable, of } from 'rxjs';
import { catchError, map, shareReplay } from 'rxjs/operators';

import { PlanActivityDurations } from '../../models/estimated-activity-durations/plan-activity-durations.model';
import { EstimatedActivityDurationsAdapter, EstimatedActivityDurationsResponse } from './estimated-activity-durations.adapter';

@Injectable({
  providedIn: 'root',
})
export class EstimatedActivityDurationsService {
  readonly #adapter = inject(EstimatedActivityDurationsAdapter);
  readonly #durationsByPlan = new Map<string, Observable<PlanActivityDurations | null>>();
  readonly #http = inject(HttpClient);

  getForPlan(partnerId: number, mainPlanId: number): Observable<PlanActivityDurations | null> {
    const cacheKey = `${partnerId}:${mainPlanId}`;
    const cached = this.#durationsByPlan.get(cacheKey);
    if (cached !== undefined) {
      return cached;
    }

    const durations = this.#http.get<EstimatedActivityDurationsResponse>(this.#url(partnerId, mainPlanId)).pipe(
      map((response: EstimatedActivityDurationsResponse) => this.#adapter.fromApi(response)),
      catchError(() => {
        this.#durationsByPlan.delete(cacheKey);
        return of(null);
      }),
      shareReplay({ bufferSize: 1, refCount: false }),
    );

    this.#durationsByPlan.set(cacheKey, durations);
    return durations;
  }

  refreshForPlan(partnerId: number, mainPlanId: number): Observable<PlanActivityDurations | null> {
    this.#durationsByPlan.delete(`${partnerId}:${mainPlanId}`);
    return this.getForPlan(partnerId, mainPlanId);
  }

  #url(partnerId: number, mainPlanId: number): string {
    return `${environment.apiBaseUrl}/3.0/partners/${partnerId}/plans/${mainPlanId}/estimated_activity_durations/`;
  }
}
