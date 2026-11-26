import type { BusinessType } from './business-type.model';

export type ExpirationStrategy = 'RESERVATION_CREATED_AT' | 'RESERVATIONS_CLOSE_DATE';

export interface ReservationCapabilitySettingsApi {
  affected_businesses_count?: number;
  business_type?: BusinessType | null;
  channel_id?: string | null;
  expiration_strategy?: ExpirationStrategy | null;
  expires_after_in_hours?: number | null;
  max_advance_reservation_period_in_hours?: number | null;
  max_reservations_per_business_per_day?: number | null;
  min_advance_reservation_period_in_hours?: number | null;
  min_number_of_tickets_required?: number | null;
  no_availability_number_hours_from_current_day?: number | null;
}

export interface ReservationCapabilitySettings {
  readonly affectedBusinessesCount: number;
  readonly businessType: BusinessType | null;
  readonly channelId: string | null;
  readonly expirationStrategy: ExpirationStrategy;
  readonly expiresAfterInHours: number | null;
  readonly maxAdvanceReservationPeriodInHours: number | null;
  readonly maxReservationsPerBusinessPerDay: number | null;
  readonly minAdvanceReservationPeriodInHours: number | null;
  readonly minNumberOfTicketsRequired: number | null;
  readonly noAvailabilityNumberHoursFromCurrentDay: number | null;
}

export interface CapabilityQuery {
  /** Optional; the distributor route derives it from the concession. `''` is not the same as omitting it. */
  readonly channelId?: string;
  /** Selects which configuration applies, so omitting it can answer a different rule set. */
  readonly businessType?: string;
}
