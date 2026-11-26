export interface ReservationCapabilityConfigurationStatusApi {
  max_advance_reservation_period_configured?: boolean;
  max_reservations_per_business_per_day_configured?: boolean;
  min_advance_reservation_period_configured?: boolean;
  min_number_of_tickets_required_configured?: boolean;
  no_availability_number_hours_from_current_day_configured?: boolean;
}

export interface ReservationCapabilityConfigurationStatus {
  readonly maxAdvanceReservationPeriodConfigured: boolean;
  readonly maxReservationsPerBusinessPerDayConfigured: boolean;
  readonly minAdvanceReservationPeriodConfigured: boolean;
  readonly minNumberOfTicketsRequiredConfigured: boolean;
  readonly noAvailabilityNumberHoursFromCurrentDayConfigured: boolean;
}
