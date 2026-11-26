import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';

import { BaseResponse } from '@fz-original/app/shared/models/base-response';
import { RescheduleSettingsDTO } from '@fz-original/app/shared/models/reschedule-settings/reschedule-settings.model';
import { PartnerService } from '@fz-original/app/shared/services/partner/partner.service';
import { ErrorResponseUtils } from '@fz-original/app/shared/utils/error-response.utils';
import { environment } from '@fz-original/environments/environment';
import { Observable, throwError } from 'rxjs';
import { catchError, map } from 'rxjs/operators';

@Injectable({
  providedIn: 'root',
})
export class RescheduleSettingsService {
  readonly #httpClient = inject(HttpClient);
  readonly #partnerService = inject(PartnerService);

  /**
   * `resourcePath` is the partner-scoped resource the settings belong to, e.g. `orders/1` or `main-plans/2`.
   */
  isPaidByPartnerAllowed(resourcePath: string): Observable<boolean> {
    const partner = this.#partnerService.getPartner();
    if (!partner) {
      return throwError(() => new Error('Unexpected error retrieving Partner data for reschedule settings'));
    }
    const url = `${environment.apiBaseUrl}/3.0/partners/${partner.id}/${resourcePath}/reschedule-settings/`;

    return this.#httpClient.get<BaseResponse<RescheduleSettingsDTO>>(url).pipe(
      map(response => response.data?.paid_by_partner_allowed ?? true),
      catchError(error => throwError(() => ErrorResponseUtils.getErrorResponseError(error))),
    );
  }
}
