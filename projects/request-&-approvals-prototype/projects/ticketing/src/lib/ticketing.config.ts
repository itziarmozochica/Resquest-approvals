import { InjectionToken, type Provider } from '@angular/core';

export interface TicketingConfig {
  apiBaseUrl: string;
  gatewayBaseUrl?: string;
  basePath?: (partnerId: string) => string;
  usePerformanceAvailability?: (planId: string) => boolean;
}

export interface TicketingFeature {
  readonly providers: Provider[];
}

export const TICKETING_CONFIG = new InjectionToken<TicketingConfig>('TICKETING_CONFIG');
