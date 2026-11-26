import { computed, inject } from '@angular/core';

import { type TicketSelectorTypeEnum } from '@fz-original/app/modules/box-office/shared/models/onsite-setup';
import { OnsiteSetupsStorageService } from '@fz-original/app/modules/box-office/shared/services/onsite-setups/onsite-setups-storage.service';

import { type PosPartyDay } from '../models/store/pos-party-members.feature.model';
import { PosViewUpdateService } from '../services/pos-view-update/pos-view-update.service';
import { PosTicketingState } from '../state/pos-ticketing.state';
import { PosAvailabilityStore } from '../store/pos-availability.store';
import { type PosPartyMembersSource } from '../tokens/pos-party-members-source.token';

export function posPartyMembersSourceFactory(): PosPartyMembersSource {
  const availability = inject(PosAvailabilityStore);
  const onsiteSetupsStorage = inject(OnsiteSetupsStorageService);
  const state = inject(PosTicketingState);
  const viewUpdate = inject(PosViewUpdateService);

  const isFreeSeatingMap = computed<boolean>(() => {
    viewUpdate.viewVersion();

    return state.manageAsFreeSeatingMap;
  });
  const isDayLoaded = computed<boolean>(() => {
    viewUpdate.viewVersion();

    return availability.availabilityAction() !== null && !availability.isLoadingAnySessions() && !state.isLoadingDateSessions;
  });

  return {
    isFreeSeatingMap,
    loadedDay: computed<PosPartyDay | null>(() => {
      if (!isDayLoaded()) {
        return null;
      }

      const renderedDate = availability.daySummaryOrder().at(-1);

      return { daySummary: renderedDate === undefined ? null : (availability.daySummaries()[renderedDate] ?? null) };
    }),
    selectedDate: availability.selectedDate,
    ticketSelectorType: computed<TicketSelectorTypeEnum | null>(
      () => (state.activeOnsiteSetup() ?? onsiteSetupsStorage.getConfiguration())?.ticket_selector_type ?? null,
    ),
    timeZone: availability.timezone,
  };
}
