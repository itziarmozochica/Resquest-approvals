import { BookingPortal, BookingPortalResponse } from './booking-portal.model';

/**
 * Extracts the booking portal link from a booking-portal endpoint response.
 *
 * The backend returns `{ data: { booking_portal_url, otoken } }` or
 * `{ data: null }` when there is no portal available for the order/partner.
 * When either field is absent or empty the kiosk should not offer native
 * booking management, so this returns `null` in those cases.
 *
 * @param response - The booking-portal endpoint response (may be null/undefined).
 * @returns The booking portal link and otoken, or `null` when not available.
 */
export function extractBookingPortal(response: BookingPortalResponse | null | undefined): BookingPortal | null {
  const data = response?.data;
  if (!data?.booking_portal_url || !data.otoken) {
    return null;
  }

  return {
    otoken: data.otoken,
    url: data.booking_portal_url,
  };
}
