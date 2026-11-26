import {
  adaptSessionToTicketType,
  buildOngoingGroups,
  getMaximumSelectableTickets,
  isMultiDaySession,
  isSessionDisabled,
  partySizeMinimumForSession,
  type DaySummary,
  type Money,
  type Session,
  type TicketType,
} from '@fz/ticketing';

import { type DerivedTicketSelectorRow, type TicketSelectorCatalogPrice } from '../models/ticket-selector-catalog-item.model';

export interface DeriveTicketSelectorCatalogInput {
  readonly canOverrideCapacities: boolean;
  readonly customTileSessions: readonly Session[];
  readonly includeOverrideCapacity: boolean;
  readonly minutesBeforeToExpire: number;
  readonly orderedDaySummaries: readonly DaySummary[];
  readonly overrideMaximumTickets: number | null;
  readonly selectedDate: string | null;
  readonly selectedDatetime: string | null;
  readonly timeZone: string;
  readonly now?: number;
}

interface RowOptions {
  readonly availableTickets: number;
  readonly hasSeating: boolean;
  readonly isCustomTile: boolean;
  readonly isHidden: boolean;
  readonly isOngoing: boolean;
  readonly isPurchasable: boolean;
  readonly isShopProduct: boolean;
  readonly maximum: number;
  readonly minimum: number;
  readonly partySizeMinimum: number;
  readonly price: TicketSelectorCatalogPrice | null;
  readonly stepQuantity: number;
}

interface MutableRow {
  maximum: number;
  minimum: number;
  readonly row: DerivedTicketSelectorRow;
}

export function deriveTicketSelectorCatalog(input: DeriveTicketSelectorCatalogInput): readonly DerivedTicketSelectorRow[] {
  const selectedDay = input.orderedDaySummaries.find((daySummary: DaySummary) => daySummary.date === input.selectedDate) ?? null;
  const selectedTimeslot = selectedDay?.timeslots.find(timeslot => timeslot.datetime === input.selectedDatetime) ?? null;
  const primaryRows = selectedTimeslot === null ? summaryWideRows(input, selectedDay) : timeslotRows(selectedTimeslot.sessions, input);
  const rows = [...primaryRows, ...customTileRows(input, primaryRows)];

  return [...rows, ...ongoingRows(input)];
}

export function deriveSeatlessSessionTypeIds(orderedDaySummaries: readonly DaySummary[]): ReadonlySet<number> {
  const sessionTypeIds = new Set<number>();

  for (const daySummary of orderedDaySummaries) {
    for (const timeslot of daySummary.timeslots) {
      for (const session of timeslot.sessions) {
        if (session.seating === null && session.sessionType !== null) {
          sessionTypeIds.add(session.sessionType.id);
        }
      }
    }
  }

  return sessionTypeIds;
}

function timeslotRows(sessions: readonly Session[], input: DeriveTicketSelectorCatalogInput): readonly DerivedTicketSelectorRow[] {
  const rows: DerivedTicketSelectorRow[] = [];

  for (const session of sessions) {
    const base = adaptBase(session, input.timeZone);

    if (base === null) {
      continue;
    }

    const bounded = withResolvedMaximum(session, input.overrideMaximumTickets);

    rows.push(
      toRow(session, base, input, {
        availableTickets: session.availableTickets,
        hasSeating: session.seating !== null,
        isCustomTile: false,
        isHidden: session.isHidden,
        isOngoing: false,
        isPurchasable: !isSessionDisabled(bounded, disabledParams(input, input.canOverrideCapacities)),
        isShopProduct: session.sessionType?.isShopProduct ?? false,
        maximum: getMaximumSelectableTickets(bounded, input.canOverrideCapacities),
        minimum: session.ticketsAllowedPerBooking.minimum,
        partySizeMinimum: partySizeMinimumForSession(session, sessions),
        price: toCatalogPrice(base.price),
        stepQuantity: stepQuantityOf(session),
      }),
    );
  }

  return rows;
}

// The legacy summary-wide fold: within a timeslot, then within a day, the first session per ticket-type
// name stands for that name. Its bounds are the name's: the lowest minimum everywhere, and a maximum
// that is the lowest selectable count within a timeslot but the highest across timeslots and days
// (`getMaximumSelectableTickets` under the timeslot's own override flag). Rendered only while no
// timeslot is selected, over the selected day alone when there is one (legacy rebuilt its summary from
// that day) and over every day otherwise.
function summaryWideRows(input: DeriveTicketSelectorCatalogInput, selectedDay: DaySummary | null): readonly DerivedTicketSelectorRow[] {
  const drafts: MutableRow[] = [];
  const daySummaries = selectedDay === null ? input.orderedDaySummaries : [selectedDay];

  for (const daySummary of daySummaries) {
    const dayNames = new Set<string>();
    const firstPerName: Session[] = [];
    const dayMinimum = new Map<string, number>();
    const dayMaximum = new Map<string, number>();

    for (const timeslot of daySummary.timeslots) {
      const slotNames = new Set<string>();
      const slotMinimum = new Map<string, number>();
      const slotMaximum = new Map<string, number>();

      for (const session of timeslot.sessions) {
        const name = session.title;
        const label = session.sessionType?.label ?? null;
        const maximum = getMaximumSelectableTickets(
          withResolvedMaximum(session, input.overrideMaximumTickets),
          input.includeOverrideCapacity,
        );

        for (const key of label === null ? [name] : [name, label]) {
          keepLower(slotMinimum, key, session.ticketsAllowedPerBooking.minimum);
          keepLower(slotMaximum, key, maximum);
        }

        if (!slotNames.has(name)) {
          slotNames.add(name);

          if (!dayNames.has(name)) {
            dayNames.add(name);
            firstPerName.push(session);
          }
        }

        if (label !== null) {
          slotNames.add(label);
        }
      }

      slotMinimum.forEach((minimum, key) => keepLower(dayMinimum, key, minimum));
      slotMaximum.forEach((maximum, key) => keepHigher(dayMaximum, key, maximum));
    }

    for (const session of firstPerName) {
      const minimum = dayMinimum.get(session.title) ?? session.ticketsAllowedPerBooking.minimum;
      const maximum =
        dayMaximum.get(session.title) ??
        getMaximumSelectableTickets(withResolvedMaximum(session, input.overrideMaximumTickets), input.includeOverrideCapacity);
      const existing = drafts.find((draft: MutableRow) => draft.row.sessionId === session.id);

      if (existing !== undefined) {
        existing.minimum = Math.min(existing.minimum, minimum);
        existing.maximum = Math.max(existing.maximum, maximum);
        continue;
      }

      const base = adaptBase(session, input.timeZone);

      if (base === null) {
        continue;
      }

      const bounded = withResolvedMaximum(session, input.overrideMaximumTickets);
      const row = toRow(session, base, input, {
        availableTickets: session.availableTickets,
        hasSeating: session.seating !== null,
        isCustomTile: false,
        isHidden: session.isHidden,
        isOngoing: false,
        isPurchasable: !isSessionDisabled(bounded, disabledParams(input, false)),
        isShopProduct: session.sessionType?.isShopProduct ?? false,
        maximum,
        minimum,
        partySizeMinimum: 0,
        price: toCatalogPrice(base.price),
        stepQuantity: stepQuantityOf(session),
      });

      drafts.push({ maximum, minimum, row });
    }
  }

  return drafts.map((draft: MutableRow): DerivedTicketSelectorRow => {
    const row: DerivedTicketSelectorRow = { ...draft.row, maximum: draft.maximum, minimum: draft.minimum };

    // A selected day with no selected timeslot: legacy blanks every non-product row before the
    // per-timeslot refresh, and with no timeslot that refresh never runs.
    if (selectedDay !== null && !row.isShopProduct) {
      return { ...row, availableTickets: 0, isHidden: false, partySizeMinimum: 0, price: null };
    }

    return row;
  });
}

// Custom-tile sessions join the rows once their tab has loaded, unless a row already carries that
// session. Shop products go to the product list instead and never become a tile here. The rows are
// flagged so the tickets grid can leave them to their own tab: legacy never rebuilt its level strip
// for them and dropped them from the tiles on the first level click.
function customTileRows(
  input: DeriveTicketSelectorCatalogInput,
  existingRows: readonly DerivedTicketSelectorRow[],
): readonly DerivedTicketSelectorRow[] {
  const knownSessionIds = new Set(existingRows.map((row: DerivedTicketSelectorRow) => row.sessionId));
  const rows: DerivedTicketSelectorRow[] = [];

  for (const session of input.customTileSessions) {
    if (session.sessionType?.isShopProduct === true || knownSessionIds.has(session.id)) {
      continue;
    }

    const base = adaptBase(session, input.timeZone);

    if (base === null) {
      continue;
    }

    knownSessionIds.add(session.id);
    rows.push(
      toRow(session, base, input, {
        availableTickets: session.availableTickets,
        // The legacy add-ons filter looks the session up in the selected timeslot, where a custom-tile
        // session never is, so it always passes.
        hasSeating: false,
        isCustomTile: true,
        isHidden: session.isHidden,
        isOngoing: false,
        isPurchasable: !isSessionDisabled(session, disabledParams(input, input.canOverrideCapacities)),
        isShopProduct: false,
        maximum: getMaximumSelectableTickets(session, input.canOverrideCapacities),
        minimum: session.ticketsAllowedPerBooking.minimum,
        partySizeMinimum: 0,
        price: toCatalogPrice(base.price),
        stepQuantity: stepQuantityOf(session),
      }),
    );
  }

  return rows;
}

function ongoingRows(input: DeriveTicketSelectorCatalogInput): readonly DerivedTicketSelectorRow[] {
  const rows: DerivedTicketSelectorRow[] = [];

  for (const group of buildOngoingGroups(input.orderedDaySummaries, input.selectedDate, input.timeZone, {
    now: input.now,
    selectedDatetime: input.selectedDatetime,
  })) {
    for (const session of group.sessions) {
      const base = adaptBase(session, input.timeZone);

      if (base === null) {
        continue;
      }

      const bounded = withResolvedMaximum(session, input.overrideMaximumTickets);

      rows.push(
        toRow(session, base, input, {
          availableTickets: session.availableTickets,
          hasSeating: session.seating !== null,
          isCustomTile: false,
          isHidden: session.isHidden,
          isOngoing: true,
          isPurchasable: !isSessionDisabled(bounded, disabledParams(input, input.canOverrideCapacities)),
          isShopProduct: false,
          maximum: input.canOverrideCapacities
            ? getMaximumSelectableTickets(bounded, true)
            : resolveMaximumTicketsAllowedPerBooking(session, input.overrideMaximumTickets),
          minimum: session.ticketsAllowedPerBooking.minimum,
          partySizeMinimum: 0,
          price: toCatalogPrice(base.price),
          stepQuantity: sanitizedStepQuantityOf(session),
        }),
      );
    }
  }

  return rows;
}

function toRow(session: Session, base: TicketType, input: DeriveTicketSelectorCatalogInput, options: RowOptions): DerivedTicketSelectorRow {
  return {
    availableTickets: options.availableTickets,
    endsAt: session.endsAt,
    hasSeating: options.hasSeating,
    isAddon: base.isAddon ?? false,
    isCustomTile: options.isCustomTile,
    isHidden: options.isHidden,
    isMultiDay: isMultiDaySession(session.startsAt, session.endsAt, input.timeZone),
    isOngoing: options.isOngoing,
    isPack: session.isPack ?? false,
    isPass: base.isPass ?? false,
    isPurchasable: options.isPurchasable,
    isShopProduct: options.isShopProduct,
    key: `${base.name}#${session.id}`,
    maximum: options.maximum,
    minimum: options.minimum,
    name: base.name,
    partySizeMinimum: options.partySizeMinimum,
    price: options.price,
    priceWithDiscount: null,
    sessionId: session.id,
    sessionTypeId: session.sessionType?.id ?? null,
    sessionTypeColor: session.sessionType?.color ?? null,
    startsAt: session.startsAt,
    stepQuantity: options.stepQuantity,
    ticketTypeId: base.ticketTypeId,
  };
}

function adaptBase(session: Session, timeZone: string): TicketType | null {
  return session.sessionType === null ? null : adaptSessionToTicketType(session, timeZone);
}

// Port of the legacy adapter's maximum: a fixed-size booking keeps its size, and the override, when
// the host sets one, only ever lowers the ceiling here (invitations alone may raise it).
function resolveMaximumTicketsAllowedPerBooking(session: Session, overrideMaximumTickets: number | null): number {
  const { maximum, minimum } = session.ticketsAllowedPerBooking;

  if (maximum === minimum || overrideMaximumTickets === null) {
    return maximum;
  }

  return Math.min(overrideMaximumTickets, maximum);
}

export function withResolvedMaximum(session: Session, overrideMaximumTickets: number | null): Session {
  const maximum = resolveMaximumTicketsAllowedPerBooking(session, overrideMaximumTickets);

  if (maximum === session.ticketsAllowedPerBooking.maximum) {
    return session;
  }

  return { ...session, ticketsAllowedPerBooking: { ...session.ticketsAllowedPerBooking, maximum } };
}

function disabledParams(
  input: DeriveTicketSelectorCatalogInput,
  canOverrideCapacity: boolean,
): { canOverrideCapacity: boolean; minutesBeforeToExpire: number; skipBookingLimitsValidation: boolean; now?: number } {
  return { canOverrideCapacity, minutesBeforeToExpire: input.minutesBeforeToExpire, now: input.now, skipBookingLimitsValidation: false };
}

function stepQuantityOf(session: Session): number {
  return session.sessionType?.ticketSelectorStepQuantity ?? 1;
}

function sanitizedStepQuantityOf(session: Session): number {
  const stepQuantity = Number(session.sessionType?.ticketSelectorStepQuantity);

  return Number.isInteger(stepQuantity) && stepQuantity > 0 ? stepQuantity : 1;
}

function toCatalogPrice(price: Money | undefined): TicketSelectorCatalogPrice | null {
  return price === undefined ? null : { amount: Number(price.amount), currency: price.currency };
}

function keepLower(target: Map<string, number>, key: string, value: number): void {
  const current = target.get(key);

  if (current === undefined || value <= current) {
    target.set(key, value);
  }
}

function keepHigher(target: Map<string, number>, key: string, value: number): void {
  const current = target.get(key);

  if (current === undefined || value > current) {
    target.set(key, value);
  }
}
