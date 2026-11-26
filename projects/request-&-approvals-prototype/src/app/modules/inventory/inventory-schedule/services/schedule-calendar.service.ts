import { HttpClient, HttpContext, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';

import { ScheduleCalendarPatchAdapter } from '@fz-original/app/modules/inventory/inventory-schedule/services/schedule-calendar-patch.adapter';
import { Observable, throwError } from 'rxjs';
import { catchError, map } from 'rxjs/operators';

import { environment } from '../../../../../environments/environment';
import { SKIP_RETRY_INTERCEPTOR } from '../../../../shared/interceptors/skip-retry.token';
import { BaseResponse } from '../../../../shared/models/base-response';
import { PartnerService } from '../../../../shared/services/partner/partner.service';
import { ErrorResponseUtils } from '../../../../shared/utils/error-response.utils';
import {
  ScheduleCalendarDateRangeApi,
  ScheduleCalendarDeleteApiData,
  ScheduleCalendarExceptionApi,
  ScheduleCalendarListApiItem,
} from '../models/schedule-calendar-api.model';
import { ScheduleCalendarDeleteOptions } from '../models/schedule-calendar-delete-options.model';
import {
  ScheduleCalendar,
  ScheduleCalendarApiGetResponse,
  ScheduleCalendarBulkCreateDTO,
  ScheduleCalendarCreateRequestDTO,
  ScheduleCalendarDateRangeValue,
} from '../models/schedule-calendar-detail.model';
import { ScheduleCalendarException, ScheduleCalendarListItem } from '../models/schedule-calendar-list.model';
import { sortDateRanges } from '../utils/schedule-calendar-date-range.util';
import { ScheduleCalendarGetAdapter } from './schedule-calendar-get.adapter';
import { ScheduleCalendarPostAdapter } from './schedule-calendar-post.adapter';

@Injectable({
  providedIn: 'root',
})
export class ScheduleCalendarService {
  readonly #httpClient = inject(HttpClient);
  readonly #partnerService = inject(PartnerService);
  readonly #scheduleCalendarGetAdapter = inject(ScheduleCalendarGetAdapter);
  readonly #scheduleCalendarPatchAdapter = inject(ScheduleCalendarPatchAdapter);
  readonly #scheduleCalendarPostAdapter = inject(ScheduleCalendarPostAdapter);

  bulkCreate(planId: number, placeId: number, calendars: ScheduleCalendar[], context?: HttpContext): Observable<void> {
    const url = this.#bulkCreateUrl(planId, placeId);
    const body: ScheduleCalendarBulkCreateDTO = {
      calendars: calendars.map(calendar => this.#scheduleCalendarPostAdapter.toApi(calendar)),
    };

    return this.#httpClient.post<void>(url, body, { context: this.#withoutGenericRetry(context) }).pipe(
      map((): undefined => void 0),
      catchError(error => throwError(() => ErrorResponseUtils.getErrorResponseError(error))),
    );
  }

  create(planId: number, placeId: number, calendar: ScheduleCalendar, draft = false, context?: HttpContext): Observable<void> {
    const url = this.#postUrl(planId, placeId);
    const body: ScheduleCalendarCreateRequestDTO = { ...this.#scheduleCalendarPostAdapter.toApi(calendar), draft };

    return this.#httpClient.post<void>(url, body, { context: this.#withoutGenericRetry(context) }).pipe(
      map((): undefined => void 0),
      catchError(error => throwError(() => ErrorResponseUtils.getErrorResponseError(error))),
    );
  }

  delete(planId: number, calendarId: string, options: ScheduleCalendarDeleteOptions = { deleteSessions: true }): Observable<string | null> {
    const url = this.#getUrl(planId, calendarId);
    const params = options.deleteSessions ? new HttpParams() : new HttpParams().set('delete_sessions', 'false');

    return this.#httpClient
      .delete<BaseResponse<ScheduleCalendarDeleteApiData> | null>(url, { context: this.#withoutGenericRetry(), params })
      .pipe(
        map(response => response?.data?.job_request_id ?? null),
        catchError(error => throwError(() => ErrorResponseUtils.getErrorResponseError(error))),
      );
  }

  getByCalendarId(planId: number, calendarId: string): Observable<ScheduleCalendar> {
    const url = this.#getUrl(planId, calendarId);

    return this.#httpClient.get<ScheduleCalendarApiGetResponse>(url).pipe(
      map(response => {
        return this.#scheduleCalendarGetAdapter.fromApi(response);
      }),
      catchError(error => throwError(() => ErrorResponseUtils.getErrorResponseError(error))),
    );
  }

  getScheduleCalendars(planId: number, placeId: number): Observable<ScheduleCalendarListItem[]> {
    const url = this.#getScheduleCalendarsUrl(planId, placeId);

    return this.#httpClient.get<BaseResponse<ScheduleCalendarListApiItem[]>>(url).pipe(
      map((response: BaseResponse<ScheduleCalendarListApiItem[]>) => {
        return (response.data ?? []).map(item => this.#adaptItem(item));
      }),
      catchError(error => throwError(() => ErrorResponseUtils.getErrorResponseError(error))),
    );
  }

  overwriteDraft(planId: number, calendarId: string, calendar: ScheduleCalendar, draft: boolean): Observable<void> {
    const url = this.#getUrl(planId, calendarId);
    const body: ScheduleCalendarCreateRequestDTO = { ...this.#scheduleCalendarPostAdapter.toApi(calendar), draft };

    return this.#httpClient.put<void>(url, body, { context: this.#withoutGenericRetry() }).pipe(
      map((): undefined => void 0),
      catchError(error => throwError(() => ErrorResponseUtils.getErrorResponseError(error))),
    );
  }

  patch(planId: number, oldCalendar: ScheduleCalendar, newCalendar: ScheduleCalendar, sessionsHidden: boolean): Observable<void> {
    const url = this.#patchUrl(planId, oldCalendar.id!);

    return this.#httpClient.patch<void>(url, this.#scheduleCalendarPatchAdapter.toApi(oldCalendar, newCalendar, sessionsHidden)).pipe(
      map((): undefined => void 0),
      catchError(error => throwError(() => ErrorResponseUtils.getErrorResponseError(error))),
    );
  }

  #adaptDateRange(dateRange: ScheduleCalendarDateRangeApi): ScheduleCalendarDateRangeValue {
    return {
      endDate: dateRange.end_date,
      id: dateRange.id,
      startDate: dateRange.start_date,
    };
  }

  #adaptException(exception: ScheduleCalendarExceptionApi): ScheduleCalendarException {
    const [dateRange] = exception.date_ranges;
    return {
      endDate: dateRange?.end_date ?? null,
      specificDays: exception.specific_days,
      startDate: dateRange?.start_date ?? null,
    };
  }

  #adaptItem(item: ScheduleCalendarListApiItem): ScheduleCalendarListItem {
    return {
      dateRanges: sortDateRanges(item.date_ranges.map(dateRange => this.#adaptDateRange(dateRange))),
      defaultCapacityTemplateName: item.default_capacity_template_name,
      defaultIsVisible: item.default_is_visible,
      exceptionCalendars: item.exception_calendars.map(exception => this.#adaptException(exception)),
      friday: item.friday,
      id: item.id,
      monday: item.monday,
      name: item.name,
      saturday: item.saturday,
      sessionTypes: item.session_types,
      specificDays: item.specific_days,
      status: item.status,
      sunday: item.sunday,
      thursday: item.thursday,
      tiers: item.tiers.map(tier => ({
        color: tier.color,
        name: tier.name,
      })),
      timeSlots: item.time_slots,
      tuesday: item.tuesday,
      wednesday: item.wednesday,
    };
  }

  #bulkCreateUrl(planId: number, placeId: number): string {
    const baseUrl = environment.apiBaseUrl;
    const partner = this.#partnerService.getPartner();
    if (!partner?.id) {
      throw new Error('No partner available');
    }
    return `${baseUrl}/3.0/partners/${partner.id}/plans/${planId}/places/${placeId}/calendars/bulk-create/`;
  }

  #getScheduleCalendarsUrl(planId: number, placeId: number): string {
    const baseUrl = environment.apiBaseUrl;
    const partner = this.#partnerService.getPartner();
    if (!partner?.id) {
      throw new Error('No partner available');
    }
    return `${baseUrl}/3.0/partners/${partner.id}/plans/${planId}/places/${placeId}/calendars/`;
  }

  #getUrl(planId: number, calendarId: string): string {
    const baseUrl = environment.apiBaseUrl;
    const partner = this.#partnerService.getPartner();
    if (!partner?.id) {
      throw new Error('No partner available');
    }
    return `${baseUrl}/3.0/partners/${partner.id}/plans/${planId}/calendars/${calendarId}/`;
  }

  #patchUrl(planId: number, calendarId: string): string {
    const baseUrl = environment.apiBaseUrl;
    const partner = this.#partnerService.getPartner();
    if (!partner?.id) {
      throw new Error('No partner available');
    }
    return `${baseUrl}/3.0/partners/${partner.id}/plans/${planId}/calendars/${calendarId}/`;
  }

  #postUrl(planId: number, placeId: number): string {
    const baseUrl = environment.apiBaseUrl;
    const partner = this.#partnerService.getPartner();
    if (!partner?.id) {
      throw new Error('No partner available');
    }
    return `${baseUrl}/3.0/partners/${partner.id}/plans/${planId}/places/${placeId}/calendars/`;
  }

  #withoutGenericRetry(context?: HttpContext): HttpContext {
    return (context ?? new HttpContext()).set(SKIP_RETRY_INTERCEPTOR, true);
  }
}
