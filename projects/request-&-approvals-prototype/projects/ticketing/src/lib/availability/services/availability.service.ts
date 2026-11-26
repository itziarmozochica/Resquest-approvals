import { HttpClient, HttpContext } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';

import { defer, map, type Observable } from 'rxjs';

import { TICKETING_CONFIG, type TicketingConfig } from '../../ticketing.config';
import { adaptDatesAvailabilityResponse } from '../api-adapters/adapt-dates-availability-response';
import { adaptSessionAvailabilitySummaryResponse } from '../api-adapters/adapt-session-availability-summary-response';
import { mapToDatesAvailabilityParams } from '../api-mappers/map-to-dates-availability-params';
import { mapToSessionAvailabilityForDateParams } from '../api-mappers/map-to-session-availability-for-date-params';
import { mapToSessionAvailabilityParams } from '../api-mappers/map-to-session-availability-params';
import type { DatesAvailabilityResponse } from '../models/api/dates-availability-response.model';
import type { SessionAvailabilitySummaryResponse } from '../models/api/session-availability-summary-response.model';
import type {
  AvailabilityDataConsistency,
  AvailabilityQueryBase,
  DatesAvailabilityQuery,
  SessionAvailabilityForDateQuery,
  SessionAvailabilityQuery,
} from '../models/availability-query.model';
import type { DatesAvailability } from '../models/date-availability.model';
import type { SessionAvailabilitySummary } from '../models/session-availability-summary.model';
import { TICKETING_AVAILABILITY_REQUEST } from '../tokens/availability-request-context.token';

@Injectable()
export class TicketingAvailabilityService {
  readonly #config: TicketingConfig = inject(TICKETING_CONFIG);
  readonly #http = inject(HttpClient);

  getDatesAvailability(query: DatesAvailabilityQuery): Observable<DatesAvailability> {
    return defer(() => {
      const datesQuery: DatesAvailabilityQuery = { ...query, dataConsistency: this.#resolveDataConsistency(query) };

      return this.#http.get<DatesAvailabilityResponse>(`${this.#availabilityUrl(datesQuery)}/availability/`, {
        context: this.#requestContext(),
        params: mapToDatesAvailabilityParams(datesQuery),
      });
    }).pipe(map(adaptDatesAvailabilityResponse));
  }

  getSessionAvailability(query: SessionAvailabilityQuery): Observable<SessionAvailabilitySummary> {
    return defer(() =>
      this.#http.get<SessionAvailabilitySummaryResponse>(`${this.#availabilityUrl(query)}/sessions/`, {
        context: this.#requestContext(),
        params: mapToSessionAvailabilityParams(query),
      }),
    ).pipe(map(response => adaptSessionAvailabilitySummaryResponse(response)));
  }

  getSessionAvailabilityForDate(query: SessionAvailabilityForDateQuery): Observable<SessionAvailabilitySummary> {
    return defer(() =>
      this.#http.get<SessionAvailabilitySummaryResponse>(`${this.#availabilityUrl(query)}/sessions_for_date/`, {
        context: this.#requestContext(),
        params: mapToSessionAvailabilityForDateParams(query),
      }),
    ).pipe(map(response => adaptSessionAvailabilitySummaryResponse(response)));
  }

  #availabilityUrl(query: AvailabilityQueryBase): string {
    return `${this.#config.apiBaseUrl}${this.#getBasePath(query.partnerId)}/plans/${query.planId}/places/${query.placeId}`;
  }

  #getBasePath(partnerId: string): string {
    const resolveBasePath = this.#config.basePath;
    if (resolveBasePath === undefined) {
      return `/partners/${partnerId}`;
    }

    return resolveBasePath(partnerId);
  }

  #requestContext(): HttpContext {
    return new HttpContext().set(TICKETING_AVAILABILITY_REQUEST, true);
  }

  #resolveDataConsistency(query: DatesAvailabilityQuery): AvailabilityDataConsistency {
    return query.dataConsistency ?? (this.#config.usePerformanceAvailability?.(query.planId) ? 'materialized' : 'real_time');
  }
}
