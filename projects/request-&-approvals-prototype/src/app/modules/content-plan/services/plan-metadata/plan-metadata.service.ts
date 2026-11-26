import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';

import { BaseResponse } from '@fz-original/app/shared/models/base-response';
import { environment } from '@fz-original/environments/environment';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

import { PlanMetadata, PlanMetadataData, UpdatedPlanMetadataData, UpdatePlanMetadata } from '../../models/plan-metadata.model';
import { PlanMetadataAdapter } from './plan-metadata.adapter';

@Injectable({ providedIn: 'root' })
export class PlanMetadataService {
  readonly #http = inject(HttpClient);
  readonly #planMetadataAdapter = inject(PlanMetadataAdapter);

  getPlanMetadata(partnerId: number, planId: number): Observable<PlanMetadata> {
    return this.#http
      .get<BaseResponse<PlanMetadataData>>(this.#buildUrl(partnerId, planId))
      .pipe(map(response => this.#planMetadataAdapter.fromApi(this.#unwrap(response))));
  }

  updatePlanMetadata(partnerId: number, planId: number, data: UpdatePlanMetadata): Observable<void> {
    return this.#http
      .patch<BaseResponse<UpdatedPlanMetadataData>>(this.#buildUrl(partnerId, planId), this.#planMetadataAdapter.toApi(data))
      .pipe(map((): void => undefined));
  }

  #buildUrl(partnerId: number, planId: number): string {
    return `${environment.apiBaseUrl}/3.0/partners/${partnerId}/plans/${planId}/metadata/`;
  }

  #unwrap<T>(response: BaseResponse<T>): T {
    if (response.data === null || response.data === undefined) {
      throw new Error(response.error?.message ?? 'Empty response');
    }
    return response.data;
  }
}
