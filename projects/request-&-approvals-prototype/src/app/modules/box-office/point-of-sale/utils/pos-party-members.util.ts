import { TicketSelectorTypeEnum } from '@fz-original/app/modules/box-office/shared/models/onsite-setup';
import {
  derivePartyMembers,
  reconcilePartyQuantities,
  type DaySummary,
  type PartyMember,
  type PartyQuantities,
  type Session,
  type SessionQuantities,
  type TimeslotSummary,
} from '@fz/ticketing';

import { type PosPartyDay } from '../models/store/pos-party-members.feature.model';
import { withResolvedMaximum } from './derive-ticket-selector-catalog.util';

export interface PosPartyMembersModeParams {
  readonly isFreeSeatingMap: boolean;
  readonly isRearchitectEnabled: boolean;
  readonly ticketSelectorType: TicketSelectorTypeEnum | null;
}

export function isPartyMembersMode(params: PosPartyMembersModeParams): boolean {
  return params.isRearchitectEnabled && params.ticketSelectorType === TicketSelectorTypeEnum.party_members && !params.isFreeSeatingMap;
}

export function partyMembersOfLoadedDay(day: PosPartyDay | null, timeZone: string): readonly PartyMember[] | null {
  if (day === null) {
    return null;
  }

  return day.daySummary === null ? [] : derivePartyMembers(day.daySummary, timeZone);
}

export function arePartyMemberListsEqual(first: readonly PartyMember[] | null, second: readonly PartyMember[] | null): boolean {
  if (first === null || second === null) {
    return first === second;
  }

  return (
    first.length === second.length &&
    first.every((member: PartyMember, index: number) => member.key === second[index].key && member.name === second[index].name)
  );
}

/** The store rebuilds the quantities object on every write and on every loaded-day reconcile, so sameness is by content. */
export function arePartyQuantitiesEqual(first: PartyQuantities, second: PartyQuantities): boolean {
  const firstKeys = Object.keys(first);

  return firstKeys.length === Object.keys(second).length && firstKeys.every((key: string) => first[key] === second[key]);
}

export function keepPartyMembersWhileLoading(
  members: readonly PartyMember[] | null,
  previous: { value: readonly PartyMember[] } | undefined,
): readonly PartyMember[] {
  return members ?? previous?.value ?? [];
}

export function reconcilePartyQuantitiesOnLoadedDay(
  members: readonly PartyMember[] | null,
  previous: { value: PartyQuantities } | undefined,
): PartyQuantities {
  if (members === null) {
    return previous?.value ?? {};
  }

  return reconcilePartyQuantities(previous?.value ?? {}, members);
}

/**
 * The cut moves only when a search settles: a day loaded after a loading phase, or another date.
 * A day committed again without one (SWR revalidation, a view bump) keeps it (rule S8).
 */
export function capturePartySearchedAt(
  day: PosPartyDay | null,
  previous: { source: PosPartyDay | null; value: number } | undefined,
  now: number,
): number {
  if (previous === undefined) {
    return now;
  }

  if (day === null) {
    return previous.value;
  }

  const isNewSettle = previous.source === null || previous.source.daySummary?.date !== day.daySummary?.date;

  return isNewSettle ? now : previous.value;
}

export function toPartySessionQuantities(bySessionId: ReadonlyMap<string, number>): SessionQuantities {
  const quantities: Record<number, number> = {};

  for (const [sessionId, quantity] of bySessionId) {
    const id = Number(sessionId);

    if (Number.isInteger(id) && quantity > 0) {
      quantities[id] = quantity;
    }
  }

  return quantities;
}

export function withPartyMaximumOverride(daySummary: DaySummary, overrideMaximumTickets: number | null): DaySummary {
  if (overrideMaximumTickets === null) {
    return daySummary;
  }

  return {
    ...daySummary,
    timeslots: daySummary.timeslots.map(
      (timeslot: TimeslotSummary): TimeslotSummary => ({
        ...timeslot,
        sessions: timeslot.sessions.map((session: Session) => withResolvedMaximum(session, overrideMaximumTickets)),
      }),
    ),
  };
}

export function partySessionAdditions(
  nextQuantitiesBySessionId: SessionQuantities,
  selectedQuantities: SessionQuantities,
): SessionQuantities {
  return Object.fromEntries(
    Object.entries(nextQuantitiesBySessionId)
      .map(([sessionId, quantity]: [string, number]): [string, number] => [
        sessionId,
        quantity - (selectedQuantities[Number(sessionId)] ?? 0),
      ])
      .filter(([, addition]: [string, number]) => addition > 0),
  );
}

export function isSameStartTime(first: string | null, second: string): boolean {
  return first !== null && Date.parse(first) === Date.parse(second);
}
