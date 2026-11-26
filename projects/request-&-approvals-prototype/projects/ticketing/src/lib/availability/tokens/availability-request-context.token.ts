import { HttpContextToken } from '@angular/common/http';

/**
 * Marks every request issued by `TicketingAvailabilityService`, so host interceptors can target the
 * library's availability traffic precisely. The availability URL shapes are shared with unrelated
 * endpoints (FeverZone's custom-packs eligible-sessions call hits the same `…/sessions/` path), so
 * URL matching alone over-matches; the context token travels client-side only and never hits the wire.
 */
export const TICKETING_AVAILABILITY_REQUEST = new HttpContextToken<boolean>(() => false);
