import type { BaseResponse } from '@fz/http-models';

import type {
  ReservationCapabilityConfigurationStatus,
  ReservationCapabilityConfigurationStatusApi,
} from '../models/reservation-capability-configuration-status.model';

export function adaptReservationCapabilityConfigurationStatus(
  response: BaseResponse<ReservationCapabilityConfigurationStatusApi>,
): ReservationCapabilityConfigurationStatus | null {
  return adaptData(response.data);
}

function adaptData(data: ReservationCapabilityConfigurationStatusApi | null | undefined): ReservationCapabilityConfigurationStatus | null {
  if (data === null || data === undefined) {
    return null;
  }
  return {
    maxAdvanceReservationPeriodConfigured: data.max_advance_reservation_period_configured ?? false,
    maxReservationsPerBusinessPerDayConfigured: data.max_reservations_per_business_per_day_configured ?? false,
    minAdvanceReservationPeriodConfigured: data.min_advance_reservation_period_configured ?? false,
    minNumberOfTicketsRequiredConfigured: data.min_number_of_tickets_required_configured ?? false,
    noAvailabilityNumberHoursFromCurrentDayConfigured: data.no_availability_number_hours_from_current_day_configured ?? false,
  };
}
