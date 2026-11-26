import type { Provider } from '@angular/core';

import { ReservationCapabilityClient } from './reservation-capability-client.service';
import { ReservationsClient } from './reservations-client.service';
import { RESERVATIONS_CONFIG, type ReservationsConfig, type ReservationsFeature } from './reservations.config';

export type { ReservationsFeature } from './reservations.config';

/** These clients have no `providedIn`, so each feature registers its own in the calling injector. */
export function provideReservations(config: ReservationsConfig, ...features: ReservationsFeature[]): Provider[] {
  const providers: Provider[] = [{ provide: RESERVATIONS_CONFIG, useValue: config }];

  for (const feature of features) {
    providers.push(...feature.providers);
  }

  return providers;
}

/** The reserve and reservation-read client. */
export function withReservations(): ReservationsFeature {
  return { providers: [ReservationsClient] };
}

/** The capability client: evaluate, settings, configuration-status and purchase-close. */
export function withReservationCapability(): ReservationsFeature {
  return { providers: [ReservationCapabilityClient] };
}
