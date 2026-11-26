import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';

import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

import { environment } from '../../../../environments/environment';
import { PlanDetail, PlanDetailDTO } from '../../models/plan/plan-detail.model';
import { PlanDetailAdapter } from './plan-detail.adapter';

@Injectable({
  providedIn: 'root',
})
export class PlanDetailService {
  #http = inject(HttpClient);
  #planDetailAdapter = inject(PlanDetailAdapter);

  getPlanDetail(partnerId: number, planId: number): Observable<PlanDetail> {
    const path = this.#getDetailUrl(partnerId, planId);

    return this.#http.get<PlanDetailDTO>(path).pipe(map((data: PlanDetailDTO) => this.#planDetailAdapter.fromApi(data)));
  }

  getResellersPlanDetail(resellerId: number, planId: number, channelId: string): Observable<PlanDetail> {
    const path = this.#getResellersDetailUrl(resellerId, planId);
    let params = new HttpParams();
    params = params.set('channel_id', channelId);

    return this.#http.get<PlanDetailDTO>(path, { params }).pipe(map((data: PlanDetailDTO) => this.#planDetailAdapter.fromApi(data)));
  }

  #getDetailUrl(partnerId: number, planId: number): string {
    return `${environment.apiBaseUrl}/partners/${partnerId}/plans/${planId}/`;
  }

  #getResellersDetailUrl(resellerId: number, planId: number): string {
    return `${environment.apiGWBaseUrl}/1.0/resellers/${resellerId}/plans/${planId}/`;
  }
}
