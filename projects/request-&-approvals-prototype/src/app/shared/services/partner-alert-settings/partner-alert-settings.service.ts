import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';

import { Observable } from 'rxjs';
import { catchError, map } from 'rxjs/operators';

import { environment } from '../../../../environments/environment';
import { BaseResponse } from '../../models/base-response';
import { ErrorResponseUtils } from '../../utils/error-response.utils';
import { PartnerAlertSettingsAdapter } from './partner-alert-settings.adapter';
import { PartnerAlertSettings, PartnerAlertSettingsApiDto } from './partner-alert-settings.model';

@Injectable({ providedIn: 'root' })
export class PartnerAlertSettingsService {
  readonly #http = inject(HttpClient);
  readonly #adapter = inject(PartnerAlertSettingsAdapter);

  get(partnerId: number): Observable<BaseResponse<PartnerAlertSettings | null>> {
    return this.#http.get<BaseResponse<PartnerAlertSettingsApiDto | null>>(this.#url(partnerId)).pipe(
      map(response => this.#adapter.fromApi(response)),
      catchError(error => ErrorResponseUtils.getErrorResponse<PartnerAlertSettings | null>(error)),
    );
  }

  #url(partnerId: number): string {
    return `${environment.apiBaseUrl}/3.0/partners/${partnerId}/alert-settings/`;
  }
}
