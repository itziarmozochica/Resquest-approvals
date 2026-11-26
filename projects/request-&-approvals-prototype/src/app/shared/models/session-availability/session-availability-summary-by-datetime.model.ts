import { MaxLimitTicketFieldEnum } from '../ticket-type/max-limit-ticket-field.enum';
import { SessionAvailability } from './session-availability.model';

export class SessionAvailabilitySummaryByDatetime {
  ticketTypes: string[] = [];
  ticketTypesBySessionId: Map<number, string> = new Map();

  maxAvailabilityByTicketTypes: Map<string, number> = new Map();
  minAvailabilityByTicketTypes: Map<string, number> = new Map();

  constructor(
    public datetime: string,
    public sessionAvailabilityList: SessionAvailability[],
    public capacity?: number,
    public overrideCapacity?: number,
    public canOverrideCapacity: boolean = false,
  ) {
    this.setNameTicketByTypes();
    this.setMaximumAvailabilityTicketByTypes();
    this.setMinimumAvailabilityTicketByTypes();
  }

  isAvailable(
    availabilityTicketByTypes: Map<string, number>,
    maxLimitField: MaxLimitTicketFieldEnum = MaxLimitTicketFieldEnum.MAXIMUM,
    excludeNextHours: number = 0,
    skipCapacityValidation: boolean = false,
    ongoingTicketTypeNames: ReadonlySet<string> = new Set(),
    skipBookingLimitsValidation: boolean = false,
  ): boolean {
    let isAvailable = true;
    if (excludeNextHours > 0) {
      if (this.getHoursDifferenceFromNow(this.datetime) <= excludeNextHours) {
        return false;
      }
    }
    if (!this.#hasSelectableEntrySession(skipBookingLimitsValidation)) {
      return false;
    }
    if (skipCapacityValidation) {
      return true;
    }
    if (availabilityTicketByTypes.size === 0) {
      return isAvailable;
    }
    for (const availabilityTicketByType of availabilityTicketByTypes) {
      if (availabilityTicketByTypes.get(availabilityTicketByType[0]) !== 0) {
        const ticketTypeName = availabilityTicketByType[0];
        // Ongoing multi-day tickets selected in another datetime are not sold in this slot — do not grey out the hour.
        // We only skip when the caller has explicitly marked the ticket type as ongoing multi-day; otherwise a ticket
        // that does not exist in this slot (e.g. exclusive of another date) must still flag the slot as unavailable.
        if (!this.#ticketTypeExistsInThisSlot(ticketTypeName) && ongoingTicketTypeNames.has(ticketTypeName)) {
          continue;
        }

        const session = this.#findSessionByTicketType(ticketTypeName);
        const hasSeating = session?.seating != null;

        if (skipBookingLimitsValidation) {
          const stockAvailable = session?.getEffectiveAvailableTickets(this.canOverrideCapacity) ?? 0;
          if (!hasSeating && stockAvailable < availabilityTicketByType[1]) {
            isAvailable = false;
            break;
          }
        } else {
          const maxLimit: number = this.getMaxLimit(availabilityTicketByType, maxLimitField);
          if (!maxLimit) {
            isAvailable = false;
            break;
          }
          if (maxLimit < availabilityTicketByType[1]) {
            isAvailable = false;
            break;
          }

          if (!hasSeating) {
            const minAvailability = this.minAvailabilityByTicketTypes.get(ticketTypeName);
            if (minAvailability !== undefined && minAvailability > availabilityTicketByType[1]) {
              isAvailable = false;
              break;
            }
          }
        }
      }
    }
    return isAvailable;
  }

  // Same-name sessions resolve to the best-stocked one, never to a sold-out twin that comes first (see AGENTS.md).
  #findSessionByTicketType(ticketTypeName: string): SessionAvailability | undefined {
    const candidates = this.sessionAvailabilityList.filter(
      session => session.name === ticketTypeName || session.sessionType?.label === ticketTypeName,
    );

    return candidates.reduce<SessionAvailability | undefined>(
      (best, session) =>
        best === undefined ||
        session.getEffectiveAvailableTickets(this.canOverrideCapacity) > best.getEffectiveAvailableTickets(this.canOverrideCapacity)
          ? session
          : best,
      undefined,
    );
  }

  #hasSelectableEntrySession(skipBookingLimitsValidation: boolean): boolean {
    const entrySessions = this.sessionAvailabilityList.filter(session => session.sessionType?.isAddOn !== true);
    const sessionsToCheck = entrySessions.length > 0 ? entrySessions : this.sessionAvailabilityList;
    for (const session of sessionsToCheck) {
      if (!session.isDisabled(this.canOverrideCapacity, skipBookingLimitsValidation)) {
        return true;
      }
    }
    return false;
  }

  #ticketTypeExistsInThisSlot(ticketTypeName: string): boolean {
    return this.sessionAvailabilityList.some(s => s.name === ticketTypeName || s.sessionType?.label === ticketTypeName);
  }

  isInOverrideZone(selectedCount: number): boolean {
    if (!this.canOverrideCapacity || this.capacity === undefined || this.overrideCapacity === undefined) {
      return false;
    }
    return selectedCount > this.capacity && selectedCount <= this.capacity + this.overrideCapacity;
  }

  isTicketTypePresentInAvailabilitySummary(ticketTypes: Map<string, number> | null | undefined): boolean {
    if (!ticketTypes) {
      return false;
    }

    return this.sessionAvailabilityList.some(session => {
      return (
        (ticketTypes.get(session.name) !== undefined && ticketTypes.get(session.name) !== 0) ||
        (ticketTypes.get(session.sessionType?.label ?? '') !== undefined && ticketTypes.get(session.sessionType?.label ?? '') !== 0)
      );
    });
  }

  private getHoursDifferenceFromNow(datetime: string): number {
    const currentDate = new Date();
    const givenDate = new Date(Date.parse(datetime));
    return (givenDate.getTime() - currentDate.getTime()) / (1000 * 60 * 60);
  }

  private getMaxLimit(availabilityTicketByType: [string, number], maxLimitField: MaxLimitTicketFieldEnum): number {
    if (maxLimitField === MaxLimitTicketFieldEnum.MAXIMUM) {
      return !this.maxAvailabilityByTicketTypes.has(availabilityTicketByType[0])
        ? 0
        : (this.maxAvailabilityByTicketTypes.get(availabilityTicketByType[0]) as number);
    }

    const sessionAvailability = this.#findSessionByTicketType(availabilityTicketByType[0]);
    if (!sessionAvailability) {
      return 0;
    }

    return sessionAvailability.getEffectiveAvailableTickets(this.canOverrideCapacity);
  }

  private setMaximumAvailabilityTicketByTypes(): void {
    this.sessionAvailabilityList.forEach(sessionAvailability => {
      const maxAvailability = sessionAvailability.getMaximumSelectableTickets(this.canOverrideCapacity);
      const keys = [sessionAvailability.name, sessionAvailability.sessionType?.label].filter(Boolean) as string[];
      keys.forEach(key => {
        const current = this.maxAvailabilityByTicketTypes.get(key);
        // A name shared by several sessions can take what its best-stocked session can: a sold-out twin never caps it.
        if (current === undefined || current < maxAvailability) {
          this.maxAvailabilityByTicketTypes.set(key, maxAvailability);
        }
      });
    });
  }

  private setMinimumAvailabilityTicketByTypes(): void {
    this.sessionAvailabilityList.forEach(sessionAvailability => {
      const minAvailability = sessionAvailability.minimumTicketsAllowedPerBooking;
      const keys = [sessionAvailability.name, sessionAvailability.sessionType?.label].filter(Boolean) as string[];
      keys.forEach(key => {
        if (this.minAvailabilityByTicketTypes.has(key)) {
          if ((this.minAvailabilityByTicketTypes.get(key) as number) >= minAvailability) {
            this.minAvailabilityByTicketTypes.set(key, minAvailability);
          }
        } else {
          this.minAvailabilityByTicketTypes.set(key, minAvailability);
        }
      });
    });
  }

  private setNameTicketByTypes(): void {
    this.sessionAvailabilityList.forEach(sessionAvailability => {
      const sessionId = sessionAvailability.id;
      const name = sessionAvailability.name;
      const altLabel = sessionAvailability.sessionType?.label;
      // TODO temporary use altLabel because we are using sessionLabel map,
      //      but we need to refactor and use sessionTypeId map
      if (!this.ticketTypes.includes(name)) {
        this.ticketTypesBySessionId.set(sessionId, name);
        this.ticketTypes.push(name);
      }
      if (altLabel && !this.ticketTypes.includes(altLabel)) {
        this.ticketTypes.push(altLabel);
      }
    });
  }
}
