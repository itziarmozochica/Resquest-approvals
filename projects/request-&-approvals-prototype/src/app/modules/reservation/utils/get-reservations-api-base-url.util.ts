import { environment } from '../../../../environments/environment';
import { ReservationsListAudience } from '../enums/reservations-list-audience.enum';

export function getReservationsListUrl(
  partnerId: number | undefined,
  audience: ReservationsListAudience = ReservationsListAudience.BUSINESS,
): string {
  if (audience === ReservationsListAudience.MARKETPLACE) {
    return `${environment.apiBaseUrl}/3.0/partners/${partnerId}/b2c-reservations/`;
  }

  return `${environment.apiBaseUrl}/partners/${partnerId}/reservations/`;
}

// Twin routes, one per collection, unlike the lists above: both are on 3.0.
export function getPartySummariesUrl(
  partnerId: number | undefined,
  audience: ReservationsListAudience = ReservationsListAudience.BUSINESS,
): string {
  const collection = audience === ReservationsListAudience.MARKETPLACE ? 'b2c-reservations' : 'reservations';

  return `${environment.apiBaseUrl}/3.0/partners/${partnerId}/${collection}/party-summaries/`;
}
