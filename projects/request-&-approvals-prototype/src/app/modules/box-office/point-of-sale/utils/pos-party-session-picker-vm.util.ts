import {
  addAmounts,
  compareAmounts,
  multiplyAmount,
  nextAllowedSessionAddition,
  partySessionName,
  remainingTicketsOf,
  type DecimalAmount,
  type Money,
  type PartyFitParams,
  type PartyMember,
  type PartyMemberSessionOptions,
  type PartySessionAllocationFit,
  type Session,
  type SessionQuantities,
  type TimeslotSummary,
} from '@fz/ticketing';

import {
  type AlertVm,
  type MemberSessionAllocation,
  type PartyAllocationMode,
  type PartySessionPickerSelection,
  type SessionCounterVm,
  type SessionPriceVm,
  type SessionTileVm,
  type TranslatableText,
} from '../containers/pos-ticket-selector/pos-party-session-picker-modal/pos-party-session-picker-modal.model';
import { formatPosPrice } from './pos-format-price.util';

export interface SessionCounterParams {
  readonly allocation: MemberSessionAllocation;
  readonly assigned: number;
  readonly fitParams: PartyFitParams;
  readonly locale: string;
  readonly memberQuantity: number;
  readonly session: Session;
  readonly sessionTotal: number;
  readonly timeslot: TimeslotSummary;
}

const sessionPickerKeyPrefix = 'boxOffice.partyMembers.sessionPicker';
const bookingFeeKey = 'oneStopShop.cart.bookingFee';
const memberQuantitySeparator = ' × ';
const memberListSeparator = ', ';

export function sessionPickerKey(name: string): string {
  return `${sessionPickerKeyPrefix}.${name}`;
}

export function membersInPanelOrder(
  memberSessionOptions: readonly PartyMemberSessionOptions[],
  members: readonly PartyMember[],
): readonly PartyMemberSessionOptions[] {
  const panelIndexOf = (memberKey: string): number => {
    const index = members.findIndex((member: PartyMember) => member.key === memberKey);

    return index === -1 ? members.length : index;
  };

  return [...memberSessionOptions].sort(
    (first: PartyMemberSessionOptions, second: PartyMemberSessionOptions) => panelIndexOf(first.memberKey) - panelIndexOf(second.memberKey),
  );
}

export function memberName(memberKey: string, members: readonly PartyMember[]): string {
  return members.find((member: PartyMember) => member.key === memberKey)?.name ?? memberKey;
}

export function initialSessionSelection(
  membersWithChoice: readonly PartyMemberSessionOptions[],
  confirmed: PartySessionPickerSelection | null,
): PartySessionPickerSelection {
  const keptAllocations = new Map(
    membersWithChoice.map((member: PartyMemberSessionOptions): [string, MemberSessionAllocation | null] => [
      member.memberKey,
      confirmedMemberAllocation(member, confirmed),
    ]),
  );

  return {
    allocation: new Map(
      membersWithChoice.map((member: PartyMemberSessionOptions): [string, MemberSessionAllocation] => [
        member.memberKey,
        keptAllocations.get(member.memberKey) ?? standardMemberAllocation(member),
      ]),
    ),
    modes: new Map(
      [...(confirmed?.modes ?? [])].filter(
        ([memberKey]: [string, PartyAllocationMode]) => (keptAllocations.get(memberKey) ?? null) !== null,
      ),
    ),
  };
}

function standardMemberAllocation(member: PartyMemberSessionOptions): MemberSessionAllocation {
  return new Map([[member.sessions[0].id, member.quantity]]);
}

function confirmedMemberAllocation(
  member: PartyMemberSessionOptions,
  confirmed: PartySessionPickerSelection | null,
): MemberSessionAllocation | null {
  const allocation = confirmed?.allocation.get(member.memberKey);
  const offeredSessionIds = new Set(member.sessions.map((session: Session) => session.id));

  return allocation !== undefined &&
    sumAdditions(allocation) === member.quantity &&
    [...allocation].every(([sessionId, quantity]: [number, number]) => quantity === 0 || offeredSessionIds.has(sessionId))
    ? allocation
    : null;
}

export function withSessionQuantity(allocation: MemberSessionAllocation, sessionId: number, quantity: number): MemberSessionAllocation {
  const entries: readonly (readonly [number, number])[] = [...new Map([...allocation, [sessionId, quantity]])];

  return new Map(entries.filter(([, sessionQuantity]: readonly [number, number]) => sessionQuantity > 0));
}

export function additionsBySessionIdOf(
  membersWithoutChoice: readonly PartyMemberSessionOptions[],
  allocations: ReadonlyMap<string, MemberSessionAllocation>,
): ReadonlyMap<number, number> {
  const additions = new Map<number, number>();
  const add = (sessionId: number, quantity: number): void => {
    additions.set(sessionId, (additions.get(sessionId) ?? 0) + quantity);
  };

  for (const member of membersWithoutChoice) {
    add(member.sessions[0].id, member.quantity);
  }

  for (const allocation of allocations.values()) {
    for (const [sessionId, quantity] of allocation) {
      add(sessionId, quantity);
    }
  }

  return additions;
}

export function toSessionQuantities(additions: ReadonlyMap<number, number>): SessionQuantities {
  return Object.fromEntries(additions);
}

export function sumAdditions(additions: ReadonlyMap<number, number>): number {
  return [...additions.values()].reduce((total: number, quantity: number) => total + quantity, 0);
}

export function additionsTotal(additions: ReadonlyMap<number, number>, sessions: readonly Session[]): Money | null {
  let total: DecimalAmount = '0';
  let currency: string | null = null;

  for (const [sessionId, quantity] of additions) {
    const session = sessions.find((candidate: Session) => candidate.id === sessionId);
    const unitPrice = addAmounts(amountOf(session?.ticketPrice), amountOf(session?.surchargePerTicket));

    total = addAmounts(total, multiplyAmount(unitPrice, quantity));
    currency ??= session?.ticketPrice?.currency ?? null;
  }

  return currency === null ? null : { amount: total, currency };
}

export function sessionPriceText(session: Session, locale: string): SessionPriceVm {
  const fee = session.surchargePerTicket;

  return {
    bookingFee:
      fee !== null && compareAmounts(fee.amount, '0') > 0 ? { key: bookingFeeKey, params: { amount: formatPosPrice(fee, locale) } } : null,
    price: session.ticketPrice === null ? '' : formatPosPrice(session.ticketPrice, locale),
  };
}

export function buildSessionTileVm(session: Session, allocation: MemberSessionAllocation, locale: string): SessionTileVm {
  return {
    ...sessionPriceText(session, locale),
    isSelected: (allocation.get(session.id) ?? 0) > 0,
    name: partySessionName(session.title),
    sessionId: session.id,
  };
}

export function buildSessionCounterVm({
  allocation,
  assigned,
  fitParams,
  locale,
  memberQuantity,
  session,
  sessionTotal,
  timeslot,
}: SessionCounterParams): SessionCounterVm {
  const quantity = allocation.get(session.id) ?? 0;
  const up = nextAllowedSessionAddition({ current: sessionTotal, direction: 1, session, timeslot }, fitParams);
  const down = nextAllowedSessionAddition({ current: sessionTotal, direction: -1, session, timeslot }, fitParams);
  const remaining = remainingTicketsOf(session, fitParams);

  return {
    ...buildSessionTileVm(session, allocation, locale),
    canDecrease: quantity > 0 && down !== null,
    canIncrease: up !== null && assigned + (up - sessionTotal) <= memberQuantity,
    // Only when the session's own places are what stops the "+": a step, a maximum per booking or a full
    // member count say nothing about places, so "Only 1 left" would be wrong there.
    limitLeft: up === null && quantity > 0 && assigned < memberQuantity && sessionTotal >= remaining ? remaining : null,
    quantity,
  };
}

export function visibleSessionTiles<T extends SessionTileVm>(tiles: readonly T[], rowLength: number, isExpanded: boolean): readonly T[] {
  if (isExpanded) {
    return tiles;
  }

  const selectedCount = tiles.filter((tile: T) => tile.isSelected).length;
  const unselectedRoom = Math.max(0, rowLength - selectedCount);
  const visibleUnselectedIds = new Set(
    tiles
      .filter((tile: T) => !tile.isSelected)
      .slice(0, unselectedRoom)
      .map((tile: T) => tile.sessionId),
  );

  return tiles.filter((tile: T) => tile.isSelected || visibleUnselectedIds.has(tile.sessionId));
}

export function topSessionId(allocation: MemberSessionAllocation, sessions: readonly Session[]): number | undefined {
  // Leaving split mode keeps the session most of the member's tickets were on, ties by ticket type order,
  // so one switch back never moves the whole count to a session the cashier barely used.
  return sessions.reduce<Session | undefined>(
    (top: Session | undefined, session: Session) =>
      top === undefined || (allocation.get(session.id) ?? 0) > (allocation.get(top.id) ?? 0) ? session : top,
    undefined,
  )?.id;
}

export function allocationAlert(allocationFit: PartySessionAllocationFit): AlertVm | null {
  return allocationFit.isSelectable ? null : doesNotFitAlert(allocationFit.violationMessage);
}

export function doesNotFitAlert(violationMessage: string | null = null): AlertVm {
  return { key: sessionPickerKey('doesNotFit'), text: violationMessage };
}

export function confirmText(ticketCount: number, total: Money | null, locale: string): TranslatableText {
  if (ticketCount === 0) {
    return { key: sessionPickerKey('confirmEmpty'), params: {} };
  }

  const totalLabel = total === null ? '' : formatPosPrice(total, locale);

  return ticketCount === 1
    ? { key: sessionPickerKey('confirmOne'), params: { count: ticketCount, total: totalLabel } }
    : { key: sessionPickerKey('confirm'), params: { count: ticketCount, total: totalLabel } };
}

export function fixedAdditionsSummary(membersWithoutChoice: readonly PartyMemberSessionOptions[], members: readonly PartyMember[]): string {
  return membersWithoutChoice
    .map((member: PartyMemberSessionOptions) => `${member.quantity}${memberQuantitySeparator}${memberName(member.memberKey, members)}`)
    .join(memberListSeparator);
}

function amountOf(money: Money | null | undefined): DecimalAmount {
  return money?.amount ?? '0';
}
