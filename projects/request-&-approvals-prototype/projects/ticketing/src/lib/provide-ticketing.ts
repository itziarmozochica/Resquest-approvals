import type { Provider } from '@angular/core';

import { TICKETING_CONFIG, type TicketingConfig, type TicketingFeature } from './ticketing.config';

export type { TicketingFeature } from './ticketing.config';

export function provideTicketing(config: TicketingConfig, ...features: TicketingFeature[]): Provider[] {
  const providers: Provider[] = [{ provide: TICKETING_CONFIG, useValue: config }];

  for (const feature of features) {
    providers.push(...feature.providers);
  }

  return providers;
}
