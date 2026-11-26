import { isMultiDaySession } from '../../../core/utils/calendar-day/calendar-day.util';
import type { PartyMember } from '../../models/party-members/party-members.model';
import type { DaySummary } from '../../models/session-availability-summary.model';
import type { Session } from '../../models/session.model';

interface PartyEligibility {
  readonly isEligible: boolean;
  readonly timeZone: string;
}

// Sessions are immutable payload values, and the fit asks every session of the day these two
// questions once per leaf on each party change: answer each session once.
const memberKeysBySession = new WeakMap<Session, readonly string[]>();
const eligibilityBySession = new WeakMap<Session, PartyEligibility>();

export function partyMemberKey(tag: string): string {
  return tag.trim().toLowerCase();
}

export function partyMemberKeysOfSession(session: Session): readonly string[] {
  const cached = memberKeysBySession.get(session);

  if (cached !== undefined) {
    return cached;
  }

  const keys = dedupe((session.sessionType?.tags ?? []).map(({ tag }) => partyMemberKey(tag)).filter((key: string) => key.length > 0));
  memberKeysBySession.set(session, keys);

  return keys;
}

export function isPartyEligibleSession(session: Session, timeZone: string): boolean {
  const cached = eligibilityBySession.get(session);

  if (cached?.timeZone === timeZone) {
    return cached.isEligible;
  }

  const isEligible = computePartyEligibility(session, timeZone);
  eligibilityBySession.set(session, { isEligible, timeZone });

  return isEligible;
}

export function partyEligibleSessionsOfDay(daySummary: DaySummary, timeZone: string): readonly Session[] {
  return daySummary.timeslots.flatMap(timeslot =>
    timeslot.sessions.filter((session: Session) => isPartyEligibleSession(session, timeZone)),
  );
}

export function derivePartyMembers(daySummary: DaySummary, timeZone: string): readonly PartyMember[] {
  const members = new Map<string, PartyMember>();

  for (const session of partyEligibleSessionsOfDay(daySummary, timeZone)) {
    for (const { tag } of session.sessionType?.tags ?? []) {
      const key = partyMemberKey(tag);

      if (key.length > 0 && !members.has(key)) {
        members.set(key, { key, name: tag.trim() });
      }
    }
  }

  return [...members.values()];
}

function computePartyEligibility(session: Session, timeZone: string): boolean {
  const sessionType = session.sessionType;

  return (
    sessionType !== null &&
    !sessionType.isAddOn &&
    !sessionType.isShopProduct &&
    session.seating === null &&
    partyMemberKeysOfSession(session).length > 0 &&
    !isMultiDaySession(session.startsAt, session.endsAt, timeZone)
  );
}

function dedupe(keys: readonly string[]): readonly string[] {
  return [...new Set(keys)];
}
