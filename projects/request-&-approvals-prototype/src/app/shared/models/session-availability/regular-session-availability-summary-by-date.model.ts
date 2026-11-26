import { SessionAvailabilitySummaryByDate } from './session-availability-summary-by-date.model';
import { SessionAvailabilitySummaryByDatetime } from './session-availability-summary-by-datetime.model';
import { resolveTimeRangeSection, TimeRangeGroupingMode, TimeRangeSection } from './time-range-section.util';

export type RegularSessionAvailabilitySummaryByDatePropsAsKeys =
  | 'morningSessions'
  | 'afternoonSessions'
  | 'eveningSessions'
  | 'nightSessions';

export class RegularSessionAvailabilitySummaryByDate extends SessionAvailabilitySummaryByDate {
  morningSessions: SessionAvailabilitySummaryByDatetime[] = [];
  afternoonSessions: SessionAvailabilitySummaryByDatetime[] = [];
  eveningSessions: SessionAvailabilitySummaryByDatetime[] = [];
  nightSessions: SessionAvailabilitySummaryByDatetime[] = [];

  constructor(
    public date: string,
    public timezone: string,
    public sessionAvailabilityByDatetimeList: SessionAvailabilitySummaryByDatetime[],
    public venueId: number | null,
    public readonly groupingMode: TimeRangeGroupingMode = 'operatingDay',
  ) {
    super(date, sessionAvailabilityByDatetimeList, venueId);
    this.setMorningSessions();
    this.setAfternoonSessions();
    this.setEveningSessions();
    this.setNightSessions();
  }

  private setMorningSessions(): void {
    this.morningSessions = this.sessionsInSection('morning');
  }

  private setAfternoonSessions(): void {
    this.afternoonSessions = this.sessionsInSection('afternoon');
  }

  private setEveningSessions(): void {
    this.eveningSessions = this.sessionsInSection('evening');
  }

  private setNightSessions(): void {
    // In operating-day mode the util never returns 'night', so this stays empty by design (B2BO-7586).
    this.nightSessions = this.sessionsInSection('night');
  }

  private sessionsInSection(section: TimeRangeSection): SessionAvailabilitySummaryByDatetime[] {
    return this.sessionAvailabilityByDatetimeList.filter(
      item => resolveTimeRangeSection(item.datetime, this.timezone, this.groupingMode) === section,
    );
  }
}
