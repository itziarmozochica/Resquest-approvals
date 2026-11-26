import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';

import { ErrorResponseUtils } from '@fz-original/app/shared/utils/error-response.utils';
import { environment } from '@fz-original/environments/environment';
import { Observable, throwError } from 'rxjs';
import { catchError, map } from 'rxjs/operators';

import {
  CreateTicketReleaseRequest,
  CreateTicketReminderRequest,
  PatchTicketReleaseGroupingRequest,
  PreviewNotificationRequest,
  TicketDeliverySettingsRule,
  UpsertTicketReleaseRequest,
  UpsertTicketReminderRequest,
} from './models/ticket-delivery-settings.model';
import {
  ApiCreateTicketDeliverySettingsResponse,
  ApiTicketDeliverySettingsResponse,
  TicketDeliverySettingsAdapter,
} from './ticket-delivery-settings.adapter';

@Injectable({
  providedIn: 'root',
})
export class TicketDeliverySettingsService {
  readonly #http = inject(HttpClient);
  readonly #adapter = inject(TicketDeliverySettingsAdapter);

  createTicketRelease(partnerId: number, request: CreateTicketReleaseRequest): Observable<string> {
    const url = `${this.#baseUrl(partnerId)}ticket-release/`;
    return this.#http.post<ApiCreateTicketDeliverySettingsResponse>(url, request).pipe(
      map(response => response.data.id),
      catchError(error => throwError(() => ErrorResponseUtils.getErrorResponseError(error))),
    );
  }

  createTicketReminder(partnerId: number, request: CreateTicketReminderRequest): Observable<string> {
    const url = `${this.#baseUrl(partnerId)}ticket-reminder/`;
    return this.#http.post<ApiCreateTicketDeliverySettingsResponse>(url, request).pipe(
      map(response => response.data.id),
      catchError(error => throwError(() => ErrorResponseUtils.getErrorResponseError(error))),
    );
  }

  deleteTicketRelease(partnerId: number, mainPlanId: number): Observable<void> {
    const url = `${this.#baseUrl(partnerId)}ticket-release/${mainPlanId}/`;
    return this.#http.delete<void>(url).pipe(
      map((): undefined => undefined),
      catchError(error => throwError(() => ErrorResponseUtils.getErrorResponseError(error))),
    );
  }

  deleteTicketReminder(partnerId: number, mainPlanIds: number[]): Observable<void> {
    const queryString = mainPlanIds.map(id => `main_plan_ids=${id}`).join('&');
    const url = `${this.#baseUrl(partnerId)}ticket-reminder/?${queryString}`;
    return this.#http.delete<void>(url).pipe(
      map((): undefined => undefined),
      catchError(error => throwError(() => ErrorResponseUtils.getErrorResponseError(error))),
    );
  }

  getSettings(partnerId: number, mainPlanIds: number[]): Observable<TicketDeliverySettingsRule[]> {
    const queryString = mainPlanIds.map(id => `main_plan_ids=${id}`).join('&');
    const url = `${this.#baseUrl(partnerId)}?${queryString}`;
    return this.#http.get<ApiTicketDeliverySettingsResponse>(url).pipe(
      map(response => this.#adapter.fromApi(response)),
      catchError(error => throwError(() => ErrorResponseUtils.getErrorResponseError(error))),
    );
  }

  patchTicketReleaseGrouping(partnerId: number, settingsId: string, request: PatchTicketReleaseGroupingRequest): Observable<void> {
    const url = `${this.#baseUrl(partnerId)}${settingsId}/ticket-release/`;
    return this.#http.patch<void>(url, request).pipe(
      map((): undefined => undefined),
      catchError(error => throwError(() => ErrorResponseUtils.getErrorResponseError(error))),
    );
  }

  previewNotification(partnerId: number, settingsId: string, request: PreviewNotificationRequest): Observable<void> {
    const url = `${this.#baseUrl(partnerId)}${settingsId}/preview-notification/`;
    return this.#http.post<void>(url, request).pipe(
      map((): undefined => undefined),
      catchError(error => throwError(() => ErrorResponseUtils.getErrorResponseError(error))),
    );
  }

  upsertTicketRelease(partnerId: number, settingsId: string, request: UpsertTicketReleaseRequest): Observable<void> {
    const url = `${this.#baseUrl(partnerId)}${settingsId}/ticket-release/`;
    return this.#http.put<void>(url, request).pipe(
      map((): undefined => undefined),
      catchError(error => throwError(() => ErrorResponseUtils.getErrorResponseError(error))),
    );
  }

  upsertTicketReminder(partnerId: number, settingsId: string, request: UpsertTicketReminderRequest): Observable<void> {
    const url = `${this.#baseUrl(partnerId)}${settingsId}/ticket-reminder/`;
    return this.#http.put<void>(url, request).pipe(
      map((): undefined => undefined),
      catchError(error => throwError(() => ErrorResponseUtils.getErrorResponseError(error))),
    );
  }

  #baseUrl(partnerId: number): string {
    return `${environment.apiBaseUrl}/3.0/partners/${partnerId}/ticket-delivery-settings/`;
  }
}
