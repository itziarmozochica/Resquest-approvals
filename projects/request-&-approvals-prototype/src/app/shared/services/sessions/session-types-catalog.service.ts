import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';

import { environment } from '@fz-original/environments/environment';
import { Observable, throwError } from 'rxjs';
import { catchError, map } from 'rxjs/operators';

import { ErrorResponseUtils } from '../../utils/error-response.utils';
import { GetSessionTypesCatalogResponseDto, SessionTypeCatalogItem, SessionTypeCatalogItemDto } from './session-type-catalog.model';

@Injectable({
  providedIn: 'root',
})
export class SessionTypesCatalogService {
  readonly #httpClient = inject(HttpClient);

  getSessionTypesCatalog(
    partnerId: number,
    planId: number,
    options?: {
      channelIds?: readonly string[];
      onlyWithActiveSessions?: boolean;
      placeId?: number;
    },
  ): Observable<SessionTypeCatalogItem[]> {
    const url = `${environment.apiBaseUrl}/3.0/partners/${partnerId}/plans/${planId}/session-types/catalog/`;
    let params = new HttpParams();

    for (const channelId of options?.channelIds ?? []) {
      params = params.append('channel_ids', channelId);
    }

    if (options?.onlyWithActiveSessions === true) {
      params = params.set('only_with_active_sessions', 'true');
    }

    if (options?.placeId != null) {
      params = params.set('place_id', options.placeId);
    }

    return this.#httpClient.get<GetSessionTypesCatalogResponseDto>(url, { params }).pipe(
      map(response => (response.data?.session_types ?? []).map(item => this.#toCatalogItem(item))),
      catchError(error => throwError(() => ErrorResponseUtils.getErrorResponseError(error))),
    );
  }

  #toCatalogItem(dto: SessionTypeCatalogItemDto): SessionTypeCatalogItem {
    const basePrice = dto.base_price != null && dto.base_price !== '' ? Number(dto.base_price) : null;

    return {
      id: dto.id,
      label: dto.label,
      basePrice: basePrice != null && !Number.isNaN(basePrice) ? basePrice : null,
      isAddOn: dto.is_add_on,
      isShopProduct: dto.is_shop_product,
    };
  }
}
