import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';

import { environment } from '@fz-original/environments/environment';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

import {
  PlanAvailabilityResponse,
  PlanDetailResponse,
  RescheduleSession,
  SessionAddOn,
  SessionsForDateResponse,
  TicketLevel,
} from './booking-availability.model';

const SOLD_OUT_STATUS = 'sold_out';

/**
 * Loads reschedule availability from the PUBLIC plan endpoints (no otoken —
 * matches the webclient3 portal): bookable dates and the sessions for a date.
 * The leaf session id is the `target_session_id` fed into the reschedule.
 */
@Injectable({ providedIn: 'root' })
export class BookingAvailabilityService {
  #httpClient = inject(HttpClient);

  getAvailableDates(planId: number, placeId: number, from: string, to: string, channel?: string): Observable<string[]> {
    const url = `${environment.apiB2CBaseUrl}/api/4.2/plans/${planId}/place/${placeId}/availability/`;
    let params = new HttpParams().set('from', from).set('to', to);
    if (channel) {
      params = params.set('channel', channel);
    }
    return this.#httpClient.get<PlanAvailabilityResponse>(url, { params }).pipe(
      map(response =>
        Object.entries(response.dates ?? {})
          .filter(([, day]) => day.status !== SOLD_OUT_STATUS)
          .map(([date]) => date)
          .sort(),
      ),
    );
  }

  getPlanPlaceId(planId: number, channel?: string): Observable<number | null> {
    const url = `${environment.apiB2CBaseUrl}/api/4.4/plans/${planId}/`;
    let params = new HttpParams();
    if (channel) {
      params = params.set('channel', channel);
    }
    return this.#httpClient
      .get<PlanDetailResponse>(url, { params })
      .pipe(map(response => (response.places?.length === 1 ? response.places[0].id : null)));
  }

  getSessionsForDate(
    planId: number,
    placeId: number,
    date: string,
    channel?: string,
    sessionTypeIds?: number[],
  ): Observable<RescheduleSession[]> {
    const url = `${environment.apiB2CBaseUrl}/api/4.2/plans/${planId}/place/${placeId}/sessions_for_date/${date}/`;
    let params = new HttpParams().set('exclude_sessions_as_add_ons', 'true').set('include_add_ons', 'true');
    if (channel) {
      params = params.set('channel', channel);
    }
    if (sessionTypeIds?.length) {
      params = params.set('session_type_ids', sessionTypeIds.join(','));
    }
    return this.#httpClient
      .get<SessionsForDateResponse>(url, { params })
      .pipe(map(response => flattenSessions(response.level, response.add_ons)));
  }
}

function flattenSessions(
  level: TicketLevel | null | undefined,
  addOns: Record<string, SessionAddOn[]> | undefined,
  parentLabel?: string,
  consumedAddOnHashes: Set<string> = new Set(),
): RescheduleSession[] {
  const sessions: RescheduleSession[] = [];
  for (const item of level?.items ?? []) {
    if (item.level) {
      sessions.push(...flattenSessions(item.level, addOns, parentLabel ?? item.default_label, consumedAddOnHashes));
      continue;
    }
    const value = item.value as
      | { available_tickets?: number; id?: number; item_type?: number | string; session_id?: number }
      | number
      | null;
    const leaf = typeof value === 'number' ? null : value;
    const id = typeof value === 'number' ? value : (value?.id ?? value?.session_id);
    if (typeof id === 'number') {
      sessions.push({
        availableTickets: leaf?.available_tickets,
        id,
        itemType: leaf?.item_type == null ? undefined : String(leaf.item_type),
        label: parentLabel ?? item.default_label,
      });
    }
  }
  sessions.push(...addOnSessions(level, addOns, parentLabel, consumedAddOnHashes));
  return sessions;
}

/**
 * Sessions-as-add-ons are excluded from the tree (`exclude_sessions_as_add_ons`) and delivered in the
 * top-level `add_ons` map instead, keyed by the `session_selector_group_hash` of the time slot they
 * belong to; each entry's `cart_item_id` is the add-on's session id at that slot, valid as the
 * `target_session_id` of a reschedule pair. Materialising them as regular leaves lets the reschedule
 * pairing find them for tickets whose entitlement targets an add-on session type.
 */
function addOnSessions(
  level: TicketLevel | null | undefined,
  addOns: Record<string, SessionAddOn[]> | undefined,
  parentLabel: string | undefined,
  consumedAddOnHashes: Set<string>,
): RescheduleSession[] {
  const hash = level?.session_selector_group_hash;
  if (hash === undefined || hash.length === 0 || parentLabel === undefined || addOns === undefined || consumedAddOnHashes.has(hash)) {
    return [];
  }
  consumedAddOnHashes.add(hash);
  const sessions: RescheduleSession[] = [];
  for (const addOn of addOns[hash] ?? []) {
    if (typeof addOn.cart_item_id !== 'number' || (addOn.purchasable_state !== undefined && addOn.purchasable_state !== 'enabled')) {
      continue;
    }
    sessions.push({
      availableTickets: addOn.view_configuration?.allowed_range?.max,
      id: addOn.cart_item_id,
      itemType: addOn.item_type == null ? undefined : String(addOn.item_type),
      label: parentLabel,
    });
  }
  return sessions;
}
