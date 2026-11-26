import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';

import { BaseResponse, IBaseResponse } from '@fz-original/app/shared/models/base-response';
import { environment } from '@fz-original/environments/environment';
import { Observable, of } from 'rxjs';
import { catchError, map, shareReplay } from 'rxjs/operators';

import { RetailSetupHierarchiesAdapter } from './retail-setup-hierarchies.adapter';
import { HierarchiesResponse, HierarchiesResponseDto } from './retail-setup-hierarchies.model';

export interface RetailSetupHierarchiesQuery {
  partnerId: number;
  retailSetupId: string;
  warehouseId?: string;
}

@Injectable({
  providedIn: 'root',
})
export class RetailSetupHierarchiesService {
  #adapter = inject(RetailSetupHierarchiesAdapter);
  #cachedQuery: RetailSetupHierarchiesQuery | null = null;
  #cachedResponse$: Observable<BaseResponse<HierarchiesResponse>> | null = null;
  readonly #cacheExpiryMs = 10 * 60 * 1000; // 10 minutes, consistent with KioskCacheService default
  #cacheTimestamp: number | null = null;
  #http = inject(HttpClient);

  clearCache(): void {
    this.#cachedQuery = null;
    this.#cachedResponse$ = null;
    this.#cacheTimestamp = null;
  }

  getHierarchies(query: RetailSetupHierarchiesQuery): Observable<BaseResponse<HierarchiesResponse>> {
    if (this.#isCacheValid(query)) {
      return this.#cachedResponse$!;
    }

    this.#cachedQuery = query;
    this.#cacheTimestamp = Date.now();
    this.#cachedResponse$ = this.#fetchHierarchies(query).pipe(shareReplay(1));

    return this.#cachedResponse$;
  }

  #buildParams(query: RetailSetupHierarchiesQuery): HttpParams {
    let params = new HttpParams();

    if (query.warehouseId) {
      params = params.set('warehouse_id', query.warehouseId);
    }

    return params;
  }

  #buildUrl(partnerId: number, retailSetupId: string): string {
    return `${environment.apiGWBaseUrl}/1.0/partners/${partnerId}/retail-setups/${retailSetupId}/hierarchies`;
  }

  #fetchHierarchies(query: RetailSetupHierarchiesQuery): Observable<BaseResponse<HierarchiesResponse>> {
    const url = this.#buildUrl(query.partnerId, query.retailSetupId);
    const params = this.#buildParams(query);

    return this.#http.get<IBaseResponse<HierarchiesResponseDto>>(url, { params }).pipe(
      map(response => this.#adapter.fromApi(response)),
      catchError(() => of(this.#adapter.fromApi(null))),
    );
  }

  #isCacheValid(query: RetailSetupHierarchiesQuery): boolean {
    if (!this.#cachedResponse$ || !this.#cachedQuery || !this.#cacheTimestamp) {
      return false;
    }

    const isExpired = Date.now() - this.#cacheTimestamp > this.#cacheExpiryMs;
    if (isExpired) {
      return false;
    }

    return this.#isSameQuery(this.#cachedQuery, query);
  }

  #isSameQuery(cached: RetailSetupHierarchiesQuery, current: RetailSetupHierarchiesQuery): boolean {
    return (
      cached.partnerId === current.partnerId && cached.retailSetupId === current.retailSetupId && cached.warehouseId === current.warehouseId
    );
  }
}
