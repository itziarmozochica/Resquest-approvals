import { InjectionToken, type Signal } from '@angular/core';

import { type DaySummary } from '@fz/ticketing';

import { type FlexibleBundlePricingSnapshot } from '../utils/flexible-bundle-session-prices.util';

export interface PosTicketSelectorCatalogSource {
  readonly canOverrideCapacities: boolean;
  readonly flexibleBundlePricing: FlexibleBundlePricingSnapshot;
  readonly includeOverrideCapacity: boolean;
  readonly minutesBeforeToExpire: number;
  readonly orderedDaySummaries: readonly DaySummary[];
  readonly overrideMaximumTickets: number | null;
  readonly selectedDate: string | null;
  readonly selectedDatetime: string | null;
  readonly timeZone: string;
}

export const POS_TICKET_SELECTOR_CATALOG_SOURCE = new InjectionToken<Signal<PosTicketSelectorCatalogSource>>(
  'POS_TICKET_SELECTOR_CATALOG_SOURCE',
);
