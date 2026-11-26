import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';

import { BaseResponse } from '@fz-original/app/shared/models/base-response';
import { environment } from '@fz-original/environments/environment';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

import { AvailableTags, AvailableTagsData, PlanTags, PlanTagsData, UpdatePlanTags } from '../../models/tags.model';
import { AvailableTagsAdapter } from '../available-tags/available-tags.adapter';
import { PlanTagsAdapter } from '../plan-tags/plan-tags.adapter';

@Injectable({ providedIn: 'root' })
export class TagsService {
  readonly #http = inject(HttpClient);
  readonly #planTagsAdapter = inject(PlanTagsAdapter);
  readonly #availableTagsAdapter = inject(AvailableTagsAdapter);

  getAvailableTags(partnerId: number): Observable<AvailableTags> {
    return this.#http
      .get<BaseResponse<AvailableTagsData>>(`${environment.apiBaseUrl}/3.0/partners/${partnerId}/tags/`)
      .pipe(map(response => this.#availableTagsAdapter.fromApi(this.#unwrap(response))));
  }

  getPlanTags(partnerId: number, planId: number): Observable<PlanTags> {
    return this.#http
      .get<BaseResponse<PlanTagsData>>(`${environment.apiBaseUrl}/3.0/partners/${partnerId}/plans/${planId}/tags/`)
      .pipe(map(response => this.#planTagsAdapter.fromApi(this.#unwrap(response))));
  }

  updatePlanTags(partnerId: number, planId: number, data: UpdatePlanTags): Observable<void> {
    return this.#http.patch<void>(
      `${environment.apiGWBaseUrl}/1.0/partners/${partnerId}/plans/${planId}/tags`,
      this.#planTagsAdapter.toApi(data),
    );
  }

  #unwrap<T>(response: BaseResponse<T>): T {
    if (!response.data) throw new Error(response.error?.message ?? 'Empty response');
    return response.data;
  }
}
