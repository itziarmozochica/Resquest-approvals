import { InjectionToken, type Provider } from '@angular/core';

export interface ReservationsConfig {
  baseUrl: string;
  gatewayBaseUrl: string;
}

export interface ReservationsFeature {
  readonly providers: Provider[];
}

export const RESERVATIONS_CONFIG = new InjectionToken<ReservationsConfig>('RESERVATIONS_CONFIG');
