import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';

import { DatesAvailabilityStoredService } from '@fz-original/app/shared/services/session-availability/dates-availability-stored.service';
import type { DistributorTarget } from '@fz/reservations';
import { TranslateService } from '@ngx-translate/core';
import moment from 'moment-timezone';
import { concat, EMPTY, Observable, of } from 'rxjs';
import { catchError, map, tap } from 'rxjs/operators';

import { environment } from '../../../../environments/environment';
import { BaseResponse } from '../../models/base-response';
import {
  SessionAvailabilitySummary,
  SessionAvailabilitySummaryData,
} from '../../models/session-availability/session-availability-summary.model';
import { DateUtil } from '../../utils/date.util';
import { OngoingSessionUtil } from '../../utils/ongoing-session.util';
import { DistributorRouteService, scopedOrganizationHeader } from '../distributor/distributor-route.service';
import { CAPN_ID, PartnerService } from '../partner/partner.service';
import { DatesAvailabilityAdapter, DatesAvailabilityResponse } from './dates-availability.adapter';
import { GetAvailableSessionForDateQuery } from './get-available-session-for-date-query';
import { GetAvailableSessionQuery } from './get-available-session-query';
import { GetDatesAvailabilityQuery } from './get-dates-availability-query';
import { SessionAvailabilityForDateStoredService } from './session-availability-for-date-stored.service';
import { SessionAvailabilityStoredService } from './session-availability-stored.service';
import { SessionAvailabilitySummaryAdapter } from './session-availability-summary.adapter';

export enum AvailabilityDataConsistency {
  Materialized = 'materialized',
  RealTime = 'real_time',
}

@Injectable({
  providedIn: 'root',
})
export class SessionAvailabilityService {
  private readonly GET_SESSIONS_AVAILABLE_TIMEOUT_IN_MS = 12000;

  readonly #distributorRoute = inject(DistributorRouteService);

  constructor(
    private httpClient: HttpClient,
    private partnerService: PartnerService,
    private sessionAvailabilitySummaryAdapter: SessionAvailabilitySummaryAdapter,
    private datesAvailabilityAdapter: DatesAvailabilityAdapter,
    private sessionAvailabilityStoredService: SessionAvailabilityStoredService,
    private sessionAvailabilityForDateStoredService: SessionAvailabilityForDateStoredService,
    private datesAvailabilityStoredService: DatesAvailabilityStoredService,
    public translateService: TranslateService,
  ) {}

  getSessionAvailable(
    query: GetAvailableSessionQuery,
    overrideMaximumTickets?: number,
    minutesBeforeToExpire?: number,
    useCache: boolean = false,
  ): Observable<BaseResponse<SessionAvailabilitySummary>> {
    if (this.#distributorRoute.isBlocked()) {
      return EMPTY;
    }
    const path = `${this.getSessionAvailableUrl(query.partnerId, query.planId, query.placeId)}`;
    const startDateForApiCall = query.utc
      ? this.formatUtcDate(query.fromDate)
      : DateUtil.prepareDateRangeForApiCall(query.fromDate, null, query.timezone).startDate;
    let parameters = new HttpParams()
      .set('from_date', startDateForApiCall)
      .set('days_with_active_session', query.daysWithActiveSession)
      .set('include_ongoing', query.includeOngoing);
    if (query.isHidden !== undefined) {
      parameters = parameters.set('is_hidden', query.isHidden);
    }

    const channelValue = this.#resolveQueryChannel(query);
    if (channelValue !== undefined) {
      parameters = parameters.set('channel', channelValue);
    }

    if (query.includeTimeSlotCapacity !== undefined) {
      parameters = parameters.set('include_time_slot_capacity', query.includeTimeSlotCapacity);
    }

    if (typeof query.includeOverrideCapacity === 'boolean' && query.includeOverrideCapacity) {
      parameters = parameters.set('include_override_capacity', query.includeOverrideCapacity);
    }

    if (query.sessionTypeIds !== undefined) {
      query.sessionTypeIds.forEach(sessionTypeId => {
        parameters = parameters.append('session_type_ids', sessionTypeId);
      });
    }

    if (typeof query.includeSoldOutSessions === 'boolean') {
      parameters = parameters.append('include_sold_out_sessions', query.includeSoldOutSessions);
    }

    if (typeof query.rescheduleOrderId === 'number') {
      parameters = parameters.append('reschedule_order_id', query.rescheduleOrderId);
    }

    if (typeof query.rescheduleReservationId === 'string' && query.rescheduleReservationId !== '') {
      parameters = parameters.append('reschedule_reservation_id', query.rescheduleReservationId);
    }

    const headers = this.getAvailabilityRequestHeaders(query.partnerId, this.#distributorRoute.pairTarget());

    const canOverrideCapacity = query.includeOverrideCapacity === true;

    if (useCache) {
      const stored = this.sessionAvailabilityStoredService.getResponseStored(query);

      return stored
        ? of(stored)
        : this.httpClient
            .get<BaseResponse<SessionAvailabilitySummaryData>>(path, {
              headers: headers,
              params: parameters,
            })
            .pipe(
              map((result: BaseResponse<SessionAvailabilitySummaryData>) =>
                this.sessionAvailabilitySummaryAdapter.fromApi(
                  {
                    ...result,
                    override_maximum_tickets: overrideMaximumTickets,
                    minutes_before_to_expire: minutesBeforeToExpire,
                  } as BaseResponse<SessionAvailabilitySummaryData> & {
                    override_maximum_tickets?: number;
                    minutes_before_to_expire?: number;
                  },
                  query.channel,
                  query.placeId,
                  canOverrideCapacity,
                  true,
                ),
              ),
              tap((result: BaseResponse<SessionAvailabilitySummary>) => this.sessionAvailabilityStoredService.updateStored(query, result)),
              catchError(() => of(this.sessionAvailabilitySummaryAdapter.fromApi({ data: null, error: null }, query.channel))),
            );
    }
    return this.httpClient
      .get<BaseResponse<SessionAvailabilitySummaryData>>(path, {
        headers: headers,
        params: parameters,
      })
      .pipe(
        map((result: BaseResponse<SessionAvailabilitySummaryData>) =>
          this.sessionAvailabilitySummaryAdapter.fromApi(
            {
              ...result,
              override_maximum_tickets: overrideMaximumTickets,
              minutes_before_to_expire: minutesBeforeToExpire,
            } as BaseResponse<SessionAvailabilitySummaryData> & {
              override_maximum_tickets?: number;
              minutes_before_to_expire?: number;
            },
            query.channel,
            query.placeId,
            canOverrideCapacity,
            true,
          ),
        ),
        catchError(() => of(this.sessionAvailabilitySummaryAdapter.fromApi({ data: null, error: null }, query.channel))),
      );
  }

  getSessionAvailableForDate(
    query: GetAvailableSessionForDateQuery,
    overrideMaximumTickets?: number,
    minutesBeforeToExpire?: number,
    useCache: boolean = false,
    useCacheSwrEnabled: boolean = false,
  ): Observable<BaseResponse<SessionAvailabilitySummary>> {
    if (this.#distributorRoute.isBlocked()) {
      return EMPTY;
    }
    const path = `${this.getSessionAvailableForDateUrl(query.partnerId, query.planId, query.placeId)}`;
    const startDateForApiCall = query.utc ? this.formatUtcDate(query.fromDate) : this.getTimeZoneDate(query.fromDate, query.timezone);
    let parameters = new HttpParams().set('from_date', startDateForApiCall).set('include_ongoing', query.includeOngoing);

    if (query.isHidden !== undefined) {
      parameters = parameters.set('is_hidden', query.isHidden);
    }

    const channelValue = this.#resolveQueryChannel(query);
    if (channelValue !== undefined) {
      parameters = parameters.set('channel', channelValue);
    }

    if (query.sessionTypeIds !== undefined) {
      query.sessionTypeIds.forEach(sessionTypeId => {
        parameters = parameters.append('session_type_ids', sessionTypeId);
      });
    }

    if (query.includeTimeSlotCapacity !== undefined) {
      parameters = parameters.set('include_time_slot_capacity', query.includeTimeSlotCapacity);
    }

    if (typeof query.includeOverrideCapacity === 'boolean' && query.includeOverrideCapacity) {
      parameters = parameters.set('include_override_capacity', query.includeOverrideCapacity);
    }

    if (typeof query.includeSoldOutSessions === 'boolean') {
      parameters = parameters.append('include_sold_out_sessions', query.includeSoldOutSessions);
    }

    if (typeof query.includeShopProducts === 'boolean') {
      parameters = parameters.append('include_shop_products', query.includeShopProducts);
    }

    if (typeof query.businessId === 'string') {
      parameters = parameters.append('business_id', query.businessId);
    }

    if (typeof query.rescheduleOrderId === 'number') {
      parameters = parameters.append('reschedule_order_id', query.rescheduleOrderId);
    }

    if (typeof query.rescheduleReservationId === 'string' && query.rescheduleReservationId !== '') {
      parameters = parameters.append('reschedule_reservation_id', query.rescheduleReservationId);
    }

    const canOverrideCapacity = query.includeOverrideCapacity === true;

    const mapToLastDateSession = (sessionAvailabilitySummary: SessionAvailabilitySummary | null): SessionAvailabilitySummary | null => {
      if (
        sessionAvailabilitySummary &&
        sessionAvailabilitySummary.regularSessionAvailabilitySummaryByDates &&
        sessionAvailabilitySummary.regularSessionAvailabilitySummaryByDates.length > 1
      ) {
        return new SessionAvailabilitySummary(
          sessionAvailabilitySummary.timezone,
          sessionAvailabilitySummary.allowMultiSessionPurchase,
          sessionAvailabilitySummary.hasExplodePipe,
          OngoingSessionUtil.filterToSelectedAndOngoingBuckets(
            sessionAvailabilitySummary.regularSessionAvailabilitySummaryByDates,
            sessionAvailabilitySummary.timezone,
          ),
          sessionAvailabilitySummary.nextAvailableDate,
          sessionAvailabilitySummary.sessionSelectorType,
          sessionAvailabilitySummary.productSessions,
        );
      }
      return sessionAvailabilitySummary;
    };

    const headers = this.getAvailabilityRequestHeaders(query.partnerId, this.#distributorRoute.pairTarget());

    const requestForDate$ = this.httpClient
      .get<BaseResponse<SessionAvailabilitySummaryData>>(path, {
        headers: headers,
        params: parameters,
      })
      .pipe(
        map((result: BaseResponse<SessionAvailabilitySummaryData>) =>
          this.sessionAvailabilitySummaryAdapter.fromApi(
            {
              ...result,
              override_maximum_tickets: overrideMaximumTickets,
              minutes_before_to_expire: minutesBeforeToExpire,
            } as BaseResponse<SessionAvailabilitySummaryData> & {
              override_maximum_tickets?: number;
              minutes_before_to_expire?: number;
            },
            query.channel,
            query.placeId,
            canOverrideCapacity,
            true,
          ),
        ),
        map((result: BaseResponse<SessionAvailabilitySummary>) => new BaseResponse(mapToLastDateSession(result.data), result.error)),
      );

    if (!useCache && !useCacheSwrEnabled) {
      return requestForDate$;
    }

    const stored = this.sessionAvailabilityForDateStoredService.getResponseStored(query);

    const requestForDateAndUpdateCache$ = requestForDate$.pipe(
      tap((result: BaseResponse<SessionAvailabilitySummary>) =>
        this.sessionAvailabilityForDateStoredService.updateStored(query, result, useCacheSwrEnabled),
      ),
    );

    if (!stored) {
      return requestForDateAndUpdateCache$;
    }

    if (!useCacheSwrEnabled) {
      return of(stored);
    }

    return concat(of(stored), requestForDateAndUpdateCache$.pipe(catchError(() => EMPTY)));
  }

  getResellerSessionAvailable(
    query: GetAvailableSessionQuery,
    overrideMaximumTickets?: number,
    minutesBeforeToExpire?: number,
    useCache: boolean = false,
  ): Observable<BaseResponse<SessionAvailabilitySummary>> {
    if (query.resellerId === undefined) {
      return of(this.sessionAvailabilitySummaryAdapter.fromApi({ data: null, error: null }, query.channel));
    }
    const path = `${this.getResellerSessionAvailableUrl(query.resellerId, query.planId, query.placeId)}`;
    const startDateForApiCall = query.utc
      ? this.formatUtcDate(query.fromDate)
      : DateUtil.prepareDateRangeForApiCall(query.fromDate, null, query.timezone).startDate;
    let parameters = new HttpParams()
      .set('from_date', startDateForApiCall)
      .set('days_with_active_session', query.daysWithActiveSession)
      .set('include_ongoing', query.includeOngoing);
    if (query.isHidden !== undefined) {
      parameters = parameters.set('is_hidden', query.isHidden);
    }
    const channelValue = this.#resolveQueryChannel(query);
    if (channelValue !== undefined) {
      parameters = parameters.set('channel', channelValue);
    }
    if (query.includeTimeSlotCapacity !== undefined) {
      parameters = parameters.set('include_time_slot_capacity', query.includeTimeSlotCapacity);
    }
    if (query.sessionTypeIds !== undefined) {
      query.sessionTypeIds.forEach(sessionTypeId => {
        parameters = parameters.append('session_type_ids', sessionTypeId);
      });
    }
    if (typeof query.includeSoldOutSessions === 'boolean') {
      parameters = parameters.append('include_sold_out_sessions', query.includeSoldOutSessions);
    }
    const headers = this.getAvailabilityRequestHeaders(query.partnerId);
    if (useCache) {
      const stored = this.sessionAvailabilityStoredService.getResponseStored(query);
      return stored
        ? of(stored)
        : this.httpClient
            .get<BaseResponse<SessionAvailabilitySummaryData>>(path, {
              headers: headers,
              params: parameters,
            })
            .pipe(
              map((result: BaseResponse<SessionAvailabilitySummaryData>) =>
                this.sessionAvailabilitySummaryAdapter.fromApi({
                  ...result,
                  override_maximum_tickets: overrideMaximumTickets,
                  minutes_before_to_expire: minutesBeforeToExpire,
                } as BaseResponse<SessionAvailabilitySummaryData> & {
                  override_maximum_tickets?: number;
                  minutes_before_to_expire?: number;
                }),
              ),
              tap((result: BaseResponse<SessionAvailabilitySummary>) => this.sessionAvailabilityStoredService.updateStored(query, result)),
              catchError(() => of(this.sessionAvailabilitySummaryAdapter.fromApi({ data: null, error: null }, query.channel))),
            );
    }
    return this.httpClient
      .get<BaseResponse<SessionAvailabilitySummaryData>>(path, {
        headers: headers,
        params: parameters,
      })
      .pipe(
        map((result: BaseResponse<SessionAvailabilitySummaryData>) =>
          this.sessionAvailabilitySummaryAdapter.fromApi({
            ...result,
            override_maximum_tickets: overrideMaximumTickets,
            minutes_before_to_expire: minutesBeforeToExpire,
          } as BaseResponse<SessionAvailabilitySummaryData> & {
            override_maximum_tickets?: number;
            minutes_before_to_expire?: number;
          }),
        ),
        catchError(() => of(this.sessionAvailabilitySummaryAdapter.fromApi({ data: null, error: null }, query.channel))),
      );
  }

  getSessionAvailableByTimeSlotId(
    timeSlotId: number,
    planId: number,
    placeId: number,
  ): Observable<BaseResponse<SessionAvailabilitySummary>> {
    const partner = this.partnerService.getPartner();
    if (!partner) {
      return of(this.sessionAvailabilitySummaryAdapter.fromApi({ data: null, error: null }));
    }
    const partnerId = partner.id;
    if (this.#distributorRoute.isBlocked()) {
      return EMPTY;
    }
    const path = `${this.getSessionAvailableUrl(partnerId, planId, placeId)}`;
    const params = new HttpParams().set('time_slot_id', timeSlotId);
    const headers: HttpHeaders = this.getAvailabilityRequestHeaders(partnerId, this.#distributorRoute.pairTarget());
    return this.httpClient.get<BaseResponse<SessionAvailabilitySummaryData>>(path, { headers, params }).pipe(
      map((result: BaseResponse<SessionAvailabilitySummaryData>) => this.sessionAvailabilitySummaryAdapter.fromApi(result)),
      catchError(() => of(this.sessionAvailabilitySummaryAdapter.fromApi({ data: null, error: null }))),
    );
  }

  getDatesAvailability(
    query: GetDatesAvailabilityQuery,
    usePerformanceAvailability: boolean = false,
    useCache: boolean = false,
  ): Observable<BaseResponse<DatesAvailabilityResponse>> {
    if (this.#distributorRoute.isBlocked()) {
      return EMPTY;
    }
    const path = `${this.getDatesAvailabilityUrl(query.partnerId, query.planId, query.placeId)}`;
    const startDateForApiCall = query.utc
      ? this.formatUtcDate(query.fromDate)
      : DateUtil.prepareDateRangeForApiCall(query.fromDate, null, query.timezone).startDate;
    let params = new HttpParams()
      .set('from_date', startDateForApiCall)
      .set('days_with_active_session', query.daysWithActiveSession)
      .set('include_ongoing', query.includeOngoing);
    if (query.isHidden !== undefined) {
      params = params.set('is_hidden', query.isHidden);
    }
    const channelValue = this.#resolveQueryChannel(query);
    if (channelValue !== undefined) {
      params = params.set('channel', channelValue);
    }
    if (typeof query.includeSoldOutSessions === 'boolean') {
      params = params.append('include_sold_out_sessions', query.includeSoldOutSessions);
    }
    if (query.sessionTypeIds !== undefined) {
      query.sessionTypeIds.forEach(sessionTypeId => {
        params = params.append('session_type_ids', sessionTypeId);
      });
    }
    if (query.rescheduleReservationId !== undefined && query.rescheduleReservationId !== '') {
      params = params.set('reschedule_reservation_id', query.rescheduleReservationId);
    }
    const dataConsistencyValue = usePerformanceAvailability
      ? AvailabilityDataConsistency.Materialized
      : AvailabilityDataConsistency.RealTime;
    params = params.set('data_consistency', dataConsistencyValue);
    const headers = this.getAvailabilityRequestHeaders(query.partnerId, this.#distributorRoute.pairTarget());
    if (useCache) {
      const stored = this.datesAvailabilityStoredService.getResponseStored(query);

      return stored
        ? of(stored)
        : this.httpClient.get(path, { headers, params }).pipe(
            map(result => this.datesAvailabilityAdapter.fromApi(result)),
            tap((result: BaseResponse<DatesAvailabilityResponse>) => this.datesAvailabilityStoredService.updateStored(query, result)),
            catchError(() => of(this.datesAvailabilityAdapter.fromApi(null))),
          );
    }
    return this.httpClient.get(path, { headers, params }).pipe(
      map(result => this.datesAvailabilityAdapter.fromApi(result)),
      catchError(() => of(this.datesAvailabilityAdapter.fromApi(null))),
    );
  }

  /**
   * `target` is the distributor pair for the three availability families that moved onto the header
   * contract: the acting distributor no longer appears in their path, so it has to travel here.
   * The reseller family is unmigrated and passes nothing.
   */
  private getAvailabilityRequestHeaders(partnerId: number, target: DistributorTarget | null = null): HttpHeaders {
    return new HttpHeaders({
      'Accept-Language': this.getHeaderLanguage(partnerId, this.translateService.currentLang),
      timeout: `${this.GET_SESSIONS_AVAILABLE_TIMEOUT_IN_MS}`,
      ...(target !== null ? scopedOrganizationHeader(target) : {}),
    });
  }

  private getHeaderLanguage(partnerID: number, currentLang: string): string {
    if (partnerID !== CAPN_ID) {
      return currentLang;
    }
    const accorLanguageMap: Record<string, string> = {
      en: 'accor-en-gb',
      es: 'accor-es-es',
      fr: 'accor-fr-fr',
      pt: 'accor-pt-br',
    };
    return accorLanguageMap[currentLang] ?? currentLang;
  }

  private getSessionAvailableUrl(partnerId: number, planId: number, placeId: number) {
    const target = this.#distributorRoute.pairTarget();
    if (target !== null) {
      return `${environment.apiBaseUrl}/3.0/partners/${target.targetOrganizationId}/plans/${planId}/places/${placeId}/sessions/`;
    }
    return `${environment.apiBaseUrl}/partners/${partnerId}/plans/${planId}/places/${placeId}/sessions/`;
  }

  private getSessionAvailableForDateUrl(partnerId: number, planId: number, placeId: number) {
    const target = this.#distributorRoute.pairTarget();
    if (target !== null) {
      return `${environment.apiBaseUrl}/3.0/partners/${target.targetOrganizationId}/plans/${planId}/places/${placeId}/sessions_for_date/`;
    }
    return `${environment.apiBaseUrl}/partners/${partnerId}/plans/${planId}/places/${placeId}/sessions_for_date/`;
  }

  private getResellerSessionAvailableUrl(resellerId: number, planId: number, placeId: number) {
    return `${environment.apiBaseUrl}/resellers/${resellerId}/plans/${planId}/places/${placeId}/sessions/`;
  }

  private getDatesAvailabilityUrl(partnerId: number, planId: number, placeId: number) {
    const target = this.#distributorRoute.pairTarget();
    if (target !== null) {
      return `${environment.apiBaseUrl}/3.0/partners/${target.targetOrganizationId}/plans/${planId}/places/${placeId}/availability/`;
    }
    return `${environment.apiBaseUrl}/partners/${partnerId}/plans/${planId}/places/${placeId}/availability/`;
  }

  private getTimeZoneDate(date: Date, timezone: string): string {
    const formatUTC = 'YYYY-MM-DDTHH:mm:ss';
    const timeZoneAgnosticDate = moment(date).tz('UTC').format(formatUTC);
    return moment.tz(timeZoneAgnosticDate, timezone).tz('UTC').format(formatUTC);
  }

  private formatUtcDate(date: Date): string {
    const formatUTC = 'YYYY-MM-DDTHH:mm:ss';
    return moment.utc(date).format(formatUTC);
  }

  #resolveQueryChannel(query: { channel?: string; channelId?: string }): string | undefined {
    // From the chosen partner config, never the session business. Empty stays omitted: the view defaults to `None`.
    if (this.#distributorRoute.pairTarget() !== null) {
      return this.#distributorRoute.pairChannel();
    }
    return query.channelId || query.channel;
  }
}
