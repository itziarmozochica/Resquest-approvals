import { computed, inject, type Signal } from '@angular/core';

import { type DaySummary } from '@fz/ticketing';

import { PosFlexibleBundleService } from '../services/flexible-bundle/pos-flexible-bundle.service';
import { PosViewUpdateService } from '../services/pos-view-update/pos-view-update.service';
import { PosTicketingState } from '../state/pos-ticketing.state';
import { PosAvailabilityStore } from '../store/pos-availability.store';
import { type PosTicketSelectorCatalogSource } from '../tokens/pos-ticket-selector-catalog-source.token';

export function posTicketSelectorCatalogSourceFactory(): Signal<PosTicketSelectorCatalogSource> {
  const availability = inject(PosAvailabilityStore);
  const flexibleBundle = inject(PosFlexibleBundleService);
  const state = inject(PosTicketingState);
  const viewUpdate = inject(PosViewUpdateService);

  return computed<PosTicketSelectorCatalogSource>(() => {
    // The override flags and the expiry window are plain fields on the legacy state; `viewVersion`
    // is the one signal every legacy writer ends on, the same bridge the containers read.
    viewUpdate.viewVersion();
    const daySummaries = availability.daySummaries();

    return {
      canOverrideCapacities: state.canOverrideCapacities,
      flexibleBundlePricing: flexibleBundle.snapshot(),
      includeOverrideCapacity: state.includeOverrideCapacity === true,
      minutesBeforeToExpire: state.minutesBeforeToExpire ?? 0,
      orderedDaySummaries: availability
        .daySummaryOrder()
        .map((date: string): DaySummary | undefined => daySummaries[date])
        .filter((daySummary): daySummary is DaySummary => daySummary !== undefined),
      overrideMaximumTickets: state.overrideMaximumTickets ?? null,
      selectedDate: availability.selectedDate(),
      selectedDatetime: availability.selectedDatetime(),
      timeZone: availability.timezone(),
    };
  });
}
