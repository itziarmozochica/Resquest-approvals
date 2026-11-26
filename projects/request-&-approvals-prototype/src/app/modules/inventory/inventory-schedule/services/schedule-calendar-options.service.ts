import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';

import { Observable, throwError } from 'rxjs';
import { catchError, map } from 'rxjs/operators';

import { environment } from '../../../../../environments/environment';
import { PartnerService } from '../../../../shared/services/partner/partner.service';
import { ErrorResponseUtils } from '../../../../shared/utils/error-response.utils';
import { ScheduleCalendarOptions, ScheduleCalendarOptionsApiGetResponse } from '../models/schedule-calendar-options.models';
import { ScheduleCalendarOptionsGetAdapter } from './schedule-calendar-options-get.adapter';

@Injectable({ providedIn: 'root' })
export class ScheduleCalendarOptionsService {
  readonly #httpClient = inject(HttpClient);
  readonly #partnerService = inject(PartnerService);
  readonly #scheduleCalendarOptionsGetAdapter = inject(ScheduleCalendarOptionsGetAdapter);

  get(planId: number): Observable<ScheduleCalendarOptions> {
    const url = this.#getOptionsUrl(planId);

    return this.#httpClient.get<ScheduleCalendarOptionsApiGetResponse>(url).pipe(
      map(response => {
        return this.#scheduleCalendarOptionsGetAdapter.fromApi(response);
      }),
      catchError(error => throwError(() => ErrorResponseUtils.getErrorResponseError(error))),
    );
  }

  #getOptionsUrl(planId: number): string {
    const baseUrl = environment.apiBaseUrl;
    const partner = this.#partnerService.getPartner();
    if (!partner?.id) {
      throw new Error('No partner available');
    }
    return `${baseUrl}/3.0/partners/${partner.id}/plans/${planId}/calendars/dropdown-items/`;
  }
}
