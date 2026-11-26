import type { BaseResponse } from '@fz/http-models';

import type { ReservationCapabilitySettings, ReservationCapabilitySettingsApi } from '../models/reservation-capability-settings.model';

export function adaptReservationCapabilitySettings(
  response: BaseResponse<ReservationCapabilitySettingsApi>,
): ReservationCapabilitySettings | null {
  return adaptData(response.data);
}

function adaptData(data: ReservationCapabilitySettingsApi | null | undefined): ReservationCapabilitySettings | null {
  if (data === null || data === undefined) {
    return null;
  }
  return {
    affectedBusinessesCount: data.affected_businesses_count ?? 0,
    businessType: data.business_type ?? null,
    channelId: data.channel_id ?? null,
    expirationStrategy: data.expiration_strategy ?? 'RESERVATIONS_CLOSE_DATE',
    expiresAfterInHours: data.expires_after_in_hours ?? null,
    maxAdvanceReservationPeriodInHours: data.max_advance_reservation_period_in_hours ?? null,
    maxReservationsPerBusinessPerDay: data.max_reservations_per_business_per_day ?? null,
    minAdvanceReservationPeriodInHours: data.min_advance_reservation_period_in_hours ?? null,
    minNumberOfTicketsRequired: data.min_number_of_tickets_required ?? null,
    noAvailabilityNumberHoursFromCurrentDay: data.no_availability_number_hours_from_current_day ?? null,
  };
}
