import { Moment } from 'moment-timezone';

import { flatArray } from '../../utils/object.utils';
import { MaxLimitTicketFieldEnum } from '../ticket-type/max-limit-ticket-field.enum';
import { pickNextUpcomingSession } from './next-upcoming-session.util';
import { SessionAvailabilitySummaryByDatetime } from './session-availability-summary-by-datetime.model';
import { SessionAvailability } from './session-availability.model';

export enum SessionAvailabilitySummaryByDateType {
  Regular = 'regular',
}

/** Optional legs of {@link SessionAvailabilitySummaryByDate.selectNextAvailableDatetime}. */
export interface SelectNextAvailableDatetimeOptions {
  ongoingTicketTypeNames?: ReadonlySet<string>;
  preferNextUpcoming?: boolean;
  skipBookingLimitsValidation?: boolean;
  skipCapacityValidation?: boolean;
}

export class SessionAvailabilitySummaryByDate {
  readonly dateTimeFormat = 'YYYY-MM-DDTHH:mm:ssZ';

  ticketTypes: string[] = [];
  ticketTypesBySessionId: Map<number, string> = new Map();

  maxAvailabilityByTicketTypes: Map<string, number> = new Map();
  minAvailabilityByTicketTypes: Map<string, number> = new Map();
  selectedDatetime: SessionAvailabilitySummaryByDatetime | null = null;
  selectedVenueId: number | null = null;

  constructor(
    public date: string,
    public sessionAvailabilityByDatetimeList: SessionAvailabilitySummaryByDatetime[],
    public venueId: number | null,
  ) {
    this.setTicketTypesValuesAndLimitations();
    this.selectedVenueId = venueId;
  }

  isAvailable(
    availabilityTicketByTypes: Map<string, number>,
    maxLimitField: MaxLimitTicketFieldEnum = MaxLimitTicketFieldEnum.MAXIMUM,
    excludeNextHours = 0,
    skipCapacityValidation = false,
    ongoingTicketTypeNames: ReadonlySet<string> = new Set(),
    skipBookingLimitsValidation = false,
  ): boolean {
    return this.sessionAvailabilityByDatetimeList.some(session =>
      session.isAvailable(
        availabilityTicketByTypes,
        maxLimitField,
        excludeNextHours,
        skipCapacityValidation,
        ongoingTicketTypeNames,
        skipBookingLimitsValidation,
      ),
    );
  }

  selectNextAvailableDatetime(
    availabilityTicketByTypes: Map<string, number>,
    maxLimitField: MaxLimitTicketFieldEnum,
    options: SelectNextAvailableDatetimeOptions = {},
  ): void {
    const {
      ongoingTicketTypeNames = new Set<string>(),
      preferNextUpcoming = false,
      skipBookingLimitsValidation = false,
      skipCapacityValidation = false,
    } = options;
    const selectableDatetimes = this.sessionAvailabilityByDatetimeList.filter(sessionDatetime =>
      sessionDatetime.isAvailable(
        availabilityTicketByTypes,
        maxLimitField,
        0,
        skipCapacityValidation,
        ongoingTicketTypeNames,
        skipBookingLimitsValidation,
      ),
    );
    if (selectableDatetimes.length === 0) {
      return;
    }

    const nextUpcoming = preferNextUpcoming ? pickNextUpcomingSession(selectableDatetimes) : null;
    this.selectedDatetime = nextUpcoming ?? selectableDatetimes[0];
  }

  selectDatetime(date: Moment): void {
    this.selectedDatetime = this.sessionAvailabilityByDatetimeList.filter(
      session => session.datetime === date.format(this.dateTimeFormat),
    )[0];
  }

  getArraySessionAvailability(): SessionAvailability[] {
    return flatArray(this.sessionAvailabilityByDatetimeList.map(availability => availability.sessionAvailabilityList));
  }

  private setTicketTypesValuesAndLimitations() {
    this.sessionAvailabilityByDatetimeList.forEach(sessionAvailabilityByDatetime => {
      sessionAvailabilityByDatetime.ticketTypesBySessionId.forEach((ticketTypeName, sessionId) => {
        const isNewTicketType = !this.ticketTypes.includes(ticketTypeName);
        if (isNewTicketType) {
          this.ticketTypesBySessionId.set(sessionId, ticketTypeName);
          this.ticketTypes.push(ticketTypeName);
        }
        this.setMinAndMaxAvailabilityByTicketTypes(ticketTypeName, sessionAvailabilityByDatetime);
      });
    });
  }

  private setMinAndMaxAvailabilityByTicketTypes(
    ticketType: string,
    sessionAvailabilityByDatetime: SessionAvailabilitySummaryByDatetime,
  ): void {
    const minAvailabilityByDatetime = sessionAvailabilityByDatetime.minAvailabilityByTicketTypes.get(ticketType);
    const maxAvailabilityByDatetime = sessionAvailabilityByDatetime.maxAvailabilityByTicketTypes.get(ticketType);
    const minAvailabilityByDate = this.minAvailabilityByTicketTypes.get(ticketType);
    const maxAvailabilityByDate = this.maxAvailabilityByTicketTypes.get(ticketType);

    if (
      minAvailabilityByDatetime !== undefined &&
      (minAvailabilityByDate === undefined || minAvailabilityByDatetime < minAvailabilityByDate)
    ) {
      this.minAvailabilityByTicketTypes.set(ticketType, minAvailabilityByDatetime);
    }
    if (
      maxAvailabilityByDatetime !== undefined &&
      (maxAvailabilityByDate === undefined || maxAvailabilityByDatetime > maxAvailabilityByDate)
    ) {
      this.maxAvailabilityByTicketTypes.set(ticketType, maxAvailabilityByDatetime);
    }
  }
}
