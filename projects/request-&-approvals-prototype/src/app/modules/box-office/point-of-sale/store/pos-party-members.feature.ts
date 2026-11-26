import { computed, inject, Injector, linkedSignal, untracked } from '@angular/core';

import { resolvePartyHourFilter, setPartyMemberQuantity, type PartyMember, type PartyQuantities } from '@fz/ticketing';
import { patchState, signalStoreFeature, withComputed, withMethods, withProps, withState } from '@ngrx/signals';

import {
  initialPartyMembersState,
  type PosPartyDay,
  type PosPartyMembersFeatureState,
} from '../models/store/pos-party-members.feature.model';
import { POS_PARTY_MEMBERS_SOURCE, type PosPartyMembersSource } from '../tokens/pos-party-members-source.token';
import { POS_TICKET_SELECTOR_REARCHITECT } from '../tokens/pos-ticket-selector-rearchitect.token';
import {
  arePartyMemberListsEqual,
  capturePartySearchedAt,
  isPartyMembersMode,
  keepPartyMembersWhileLoading,
  partyMembersOfLoadedDay,
  reconcilePartyQuantitiesOnLoadedDay,
} from '../utils/pos-party-members.util';

const posPartyMembersFeature = signalStoreFeature(
  withState<PosPartyMembersFeatureState>(initialPartyMembersState),
  withComputed(() => {
    const isRearchitectEnabled = inject(POS_TICKET_SELECTOR_REARCHITECT);
    const injector = inject(Injector);
    const source = (): PosPartyMembersSource => injector.get(POS_PARTY_MEMBERS_SOURCE);
    const partyDay = computed<PosPartyDay | null>(() => source().loadedDay());
    const partyTimeZone = computed<string>(() => source().timeZone());

    return {
      isPartyMembersMode: computed<boolean>(
        () =>
          isRearchitectEnabled &&
          isPartyMembersMode({
            isFreeSeatingMap: source().isFreeSeatingMap(),
            isRearchitectEnabled,
            ticketSelectorType: source().ticketSelectorType(),
          }),
      ),
      partyDay,
      partyLoadedMembers: computed<readonly PartyMember[] | null>(() => partyMembersOfLoadedDay(partyDay(), partyTimeZone()), {
        equal: arePartyMemberListsEqual,
      }),
      partySelectedDate: computed<string | null>(() => source().selectedDate()),
      partyTimeZone,
    };
  }),
  withProps(({ partyDay, partyLoadedMembers, partySelectedDate }) => ({
    partyHourFilter: linkedSignal<string | null, string | null>({
      computation: (): string | null => null,
      source: partySelectedDate,
    }),
    partyMembers: linkedSignal<readonly PartyMember[] | null, readonly PartyMember[]>({
      computation: keepPartyMembersWhileLoading,
      source: partyLoadedMembers,
    }),
    partyQuantities: linkedSignal<readonly PartyMember[] | null, PartyQuantities>({
      computation: reconcilePartyQuantitiesOnLoadedDay,
      source: partyLoadedMembers,
    }),
    partySearchedAt: linkedSignal<PosPartyDay | null, number>({
      computation: (day: PosPartyDay | null, previous: { source: PosPartyDay | null; value: number } | undefined): number =>
        capturePartySearchedAt(day, previous, Date.now()),
      source: partyDay,
    }),
  })),
  withComputed(({ partyDay, partyHourFilter, partySearchedAt, partyTimeZone }) => ({
    partyResolvedHourFilter: computed<string | null>(() =>
      resolvePartyHourFilter(partyDay()?.daySummary ?? null, partyHourFilter(), partyTimeZone(), partySearchedAt()),
    ),
  })),
  withMethods(store => ({
    selectPartyCategory(category: string): void {
      patchState(store, { partyCategory: category });
    },
    selectPartyHour(hour: string | null): void {
      store.partyHourFilter.set(hour);
    },
    setPartyMemberQuantity(memberKey: string, quantity: number): void {
      store.partyQuantities.set(setPartyMemberQuantity(untracked(store.partyQuantities), memberKey, quantity));
    },
  })),
);

export type WithPosPartyMembersFeature = typeof posPartyMembersFeature;

export function withPosPartyMembersFeature(): WithPosPartyMembersFeature {
  return posPartyMembersFeature;
}
