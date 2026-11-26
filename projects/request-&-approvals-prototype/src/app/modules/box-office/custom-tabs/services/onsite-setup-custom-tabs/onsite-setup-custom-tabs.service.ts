import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';

import { BaseResponse, IBaseResponse } from '@fz-original/app/shared/models/base-response';
import { environment } from '@fz-original/environments/environment';
import { Observable, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';

import { OnsiteSetupCustomTabsAdapter } from './onsite-setup-custom-tabs.adapter';
import { CustomTab, CustomTabsResponse, CustomTabsResponseDto } from './onsite-setup-custom-tabs.model';

export interface OnsiteSetupCustomTabsQuery {
  onsiteSetupId: string;
  partnerId: number;
}

export interface UpdateCustomTabsResult {
  error: HttpErrorResponse | null;
  success: boolean;
}

@Injectable({
  providedIn: 'root',
})
export class OnsiteSetupCustomTabsService {
  #adapter = inject(OnsiteSetupCustomTabsAdapter);
  #httpClient = inject(HttpClient);

  getCustomTabs(query: OnsiteSetupCustomTabsQuery): Observable<BaseResponse<CustomTabsResponse>> {
    const url = this.#buildUrl(query.partnerId, query.onsiteSetupId);

    return this.#httpClient.get<IBaseResponse<CustomTabsResponseDto>>(url).pipe(
      map(response => this.#adapter.fromApi(response)),
      catchError(() => of(this.#adapter.fromApi(null))),
    );
  }

  updateCustomTabs(query: OnsiteSetupCustomTabsQuery, customTabs: CustomTab[]): Observable<UpdateCustomTabsResult> {
    const url = this.#buildUrl(query.partnerId, query.onsiteSetupId);
    const body = this.#adapter.toApi(customTabs);

    return this.#httpClient.put<void>(url, body, { observe: 'response' }).pipe(
      map((): UpdateCustomTabsResult => ({ success: true, error: null })),
      catchError((error: HttpErrorResponse) => of({ success: false, error })),
    );
  }

  #buildUrl(partnerId: number, onsiteSetupId: string): string {
    return `${environment.apiGWBaseUrl}/1.0/partners/${partnerId}/onsite-setups/${onsiteSetupId}/custom-tabs`;
  }
}
