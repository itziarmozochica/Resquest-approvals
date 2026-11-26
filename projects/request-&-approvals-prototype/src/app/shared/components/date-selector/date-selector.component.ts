import { Component, EventEmitter, inject, input, Input, OnChanges, Output, SimpleChanges } from '@angular/core';

import { TranslateService } from '@ngx-translate/core';

import { DateAvailability } from '../../models/session-availability/date-availability.model';
import { pickNextUpcomingSession } from '../../models/session-availability/next-upcoming-session.util';
import { RegularSessionAvailabilitySummaryByDate } from '../../models/session-availability/regular-session-availability-summary-by-date.model';
import {
  SessionAvailabilitySummaryByDate,
  SessionAvailabilitySummaryByDateType,
} from '../../models/session-availability/session-availability-summary-by-date.model';
import { SessionAvailabilitySummaryByDatetime } from '../../models/session-availability/session-availability-summary-by-datetime.model';
import type { TimeRangeSection } from '../../models/session-availability/time-range-section.util';
import { MaxLimitTicketFieldEnum } from '../../models/ticket-type/max-limit-ticket-field.enum';
import { SessionSelectorType } from '../../services/session-availability/session-selector-type.enum';
import { formatLocalDate, getDateSelectorTitleKey } from './date-selector.util';

// Re-exported so existing importers (date-selector-obo, date-selector-kiosk) keep resolving it here.
export type { TimeRangeSection };
type SelectionKey = { date: string | null; datetime: string | null };

@Component({
  selector: 'box-office-date-selector',
  standalone: false,
  templateUrl: './date-selector.component.html',
  styleUrls: ['./date-selector.component.scss'],
})
export class DateSelectorComponent implements OnChanges {
  #translateService = inject(TranslateService);
  #lastEmittedSelectionKey: SelectionKey | null = null;
  #pendingDateAvailabilitySelectionChange = false;
  @Input() allowMultiTimeSlot = false;
  @Input() datesAvailability?: Array<DateAvailability>;
  @Input() disabled = false;
  readonly disabledDatetimes = input<ReadonlySet<string>>(new Set());
  @Input() displayedSessionType: SessionAvailabilitySummaryByDateType = SessionAvailabilitySummaryByDateType.Regular;
  @Output() displayedSessionTypeChange = new EventEmitter<SessionAvailabilitySummaryByDateType>();
  @Input() excludeNextHours = 0;
  @Output() handleShowAvailabilityFromDateChange: EventEmitter<string> = new EventEmitter<string>();
  hideDateSelector = true;
  @Input() hideDates = false;
  @Input() hideSessionDuration = false;
  @Output() loadMore: EventEmitter<void> = new EventEmitter<void>();
  @Output() loadOneStepFreeSeatingMap = new EventEmitter<void>();
  @Input() loading = false;
  @Input() loadingSessions = false;
  @Input() locale = this.#translateService.currentLang;
  @Input() maxLimitField = MaxLimitTicketFieldEnum.MAXIMUM;
  newDateSelected = false;
  openedTimeRangeSections: Set<TimeRangeSection> = new Set();
  @Input() preselectNextUpcomingSession = false;
  @Input() regularSessionAvailabilitySummaryByDate: RegularSessionAvailabilitySummaryByDate[] = [];
  @Input() sessionSelectorType: SessionSelectorType = SessionSelectorType.BY_DATE_AND_TIME;
  @Input() selectedAvailabilityFromDate: string | null = null;
  @Input() selectedDateAvailability?: DateAvailability;
  @Output() selectedDateChange: EventEmitter<DateAvailability> = new EventEmitter<DateAvailability>();
  @Input() selectedSession: RegularSessionAvailabilitySummaryByDate | null = null;
  @Output() selectedSessionChange: EventEmitter<SessionAvailabilitySummaryByDate> = new EventEmitter<SessionAvailabilitySummaryByDate>();
  sessionAvailabilitySummaryByDateType = SessionAvailabilitySummaryByDateType;
  @Input() showCapacity = false;
  @Input() skipBookingLimitsValidation = false;
  @Input() ticketTypes = new Map<string, number>();
  @Input() ongoingMultiDayTicketTypeNames: string[] = [];
  @Input() timezone = 'Europe/London';
  @Output() updateFreeMapMode = new EventEmitter<null>();

  protected formatLocalDate(dateStr: string): string {
    return formatLocalDate(dateStr, this.locale, this.timezone);
  }

  protected get shouldShowTitle(): boolean {
    return !this.loading && !this.loadingSessions;
  }

  protected get titleText(): string {
    return getDateSelectorTitleKey(this.sessionSelectorType, this.hideDateSelector);
  }

  protected get ongoingTicketTypeNamesSet(): ReadonlySet<string> {
    return new Set(this.ongoingMultiDayTicketTypeNames);
  }

  // In operating-day grouping (B2BO-7586) the fixed legacy hour-range subtitles no longer match the buckets, so they are hidden.
  protected get isOperatingDayGrouping(): boolean {
    return this.selectedSession?.groupingMode === 'operatingDay';
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes.ticketTypes && changes.ticketTypes.currentValue !== changes.ticketTypes.previousValue) {
      const isLoadOneDay = this.datesAvailability?.length === 0 && this.regularSessionAvailabilitySummaryByDate?.length === 1;
      this.hideDateSelector = this.hideDates && isLoadOneDay;
      if (changes.ticketTypes.currentValue.size === 0 && (!this.datesAvailability || this.datesAvailability.length === 0)) {
        this.selectDefaultSessionType();
        return;
      }
      this.ticketTypes = changes.ticketTypes.currentValue;
      const sessions: RegularSessionAvailabilitySummaryByDate[] = this.regularSessionAvailabilitySummaryByDate;
      const availableDateSessions: RegularSessionAvailabilitySummaryByDate[] = sessions.filter(
        (item: RegularSessionAvailabilitySummaryByDate) =>
          item.isAvailable(
            changes.ticketTypes.currentValue,
            this.maxLimitField,
            this.excludeNextHours,
            this.allowMultiTimeSlot,
            this.ongoingTicketTypeNamesSet,
            this.skipBookingLimitsValidation,
          ),
      );
      if (!this.isDateSelected(this.selectedSession)) {
        this.selectedSession =
          availableDateSessions && availableDateSessions.length > 0 ? this.#preferredSessionAmong(availableDateSessions) : null;
      }
      if (this.selectedSession) {
        if (!this.isDatetimeSelected(this.selectedSession.selectedDatetime)) {
          this.updateSelectedHour();
        }
      }
      this.#emitSelectedSessionChangeIfChanged();
    }

    const regularSessionsChanged =
      !!changes.regularSessionAvailabilitySummaryByDate &&
      changes.regularSessionAvailabilitySummaryByDate.currentValue !== changes.regularSessionAvailabilitySummaryByDate.previousValue;

    if ((this.datesAvailability?.length ?? 0) > 0 && !this.selectedSession && regularSessionsChanged) {
      this.selectedSession =
        this.regularSessionAvailabilitySummaryByDate.length > 0
          ? this.#preferredSessionAmong(this.regularSessionAvailabilitySummaryByDate)
          : null;
      this.updateSelectedHour();
    }

    if (this.#pendingDateAvailabilitySelectionChange && regularSessionsChanged) {
      this.#pendingDateAvailabilitySelectionChange = this.regularSessionAvailabilitySummaryByDate.length === 0;
      this.#emitSelectedSessionChangeIfChanged();
    }
  }

  #selectionKeyFor(session: SessionAvailabilitySummaryByDate | null): SelectionKey {
    return {
      date: session?.date ?? null,
      datetime: session?.selectedDatetime?.datetime ?? null,
    };
  }

  #emitSelectedSessionChangeIfChanged(): void {
    if (!this.selectedSession || !this.selectedSession.selectedDatetime) {
      this.#lastEmittedSelectionKey = null;
      return;
    }
    const nextKey = this.#selectionKeyFor(this.selectedSession);
    const lastKey = this.#lastEmittedSelectionKey;
    if (lastKey && lastKey.date === nextKey.date && lastKey.datetime === nextKey.datetime) {
      return;
    }
    this.#emitSelectionChange(nextKey);
  }

  #emitSelectionChange(selectionKey: SelectionKey): void {
    if (!this.selectedSession) {
      return;
    }
    this.#lastEmittedSelectionKey = selectionKey;
    this.selectedSessionChange.emit(this.selectedSession);
  }

  #preferredSessionAmong(candidates: RegularSessionAvailabilitySummaryByDate[]): RegularSessionAvailabilitySummaryByDate | null {
    if (candidates.length === 0) {
      return null;
    }
    const selectedKey = this.selectedDateAvailability?.date;
    if (selectedKey) {
      const match = candidates.find(s => s.date === selectedKey);
      if (match) {
        return match;
      }
    }
    return candidates[0];
  }

  isSelectedSessionInHoursRange(sessionsOfRange: SessionAvailabilitySummaryByDatetime[]): boolean {
    return !!(
      this.selectedSession &&
      this.selectedSession.selectedDatetime &&
      sessionsOfRange.some(session => session.datetime === this.selectedSession?.selectedDatetime?.datetime)
    );
  }

  toggleTimeRangeSection(timeRangeSection: TimeRangeSection, sessionsOfRange: SessionAvailabilitySummaryByDatetime[]): void {
    if (this.isSelectedSessionInHoursRange(sessionsOfRange)) {
      return;
    }

    if (this.openedTimeRangeSections.has(timeRangeSection)) {
      this.openedTimeRangeSections.delete(timeRangeSection);
    } else {
      this.openedTimeRangeSections.add(timeRangeSection);
    }
  }

  private selectDefaultSessionType(): void {
    const noTicketTypes = new Map();

    const availableRegularSessions = this.regularSessionAvailabilitySummaryByDate.filter(item =>
      item.isAvailable(
        noTicketTypes,
        this.maxLimitField,
        this.excludeNextHours,
        this.allowMultiTimeSlot,
        this.ongoingTicketTypeNamesSet,
        this.skipBookingLimitsValidation,
      ),
    );
    if (availableRegularSessions.length > 0) {
      this.displayedSessionTypeChange.emit(SessionAvailabilitySummaryByDateType.Regular);
      return;
    }

    this.displayedSessionTypeChange.emit(SessionAvailabilitySummaryByDateType.Regular);
  }

  updateSelectedHour(): void {
    if (!this.selectedSession) {
      return;
    }
    this.selectedSession.selectedDatetime = null;

    let firstAvailableHour: SessionAvailabilitySummaryByDatetime | null = null;

    if (this.selectedSession instanceof RegularSessionAvailabilitySummaryByDate) {
      firstAvailableHour = this.getFirstAvailableHourForRegularSession(this.selectedSession);
    }

    this.#setSelectDatetime(firstAvailableHour);
    this.#emitSelectedSessionChangeIfChanged();
    if (this.newDateSelected) {
      this.updateFreeMapMode.emit();
      this.loadOneStepFreeSeatingMap.emit();
      this.newDateSelected = false;
    }
  }

  private getFirstAvailableHourForRegularSession(
    selectedSession: RegularSessionAvailabilitySummaryByDate,
  ): SessionAvailabilitySummaryByDatetime | null {
    if (this.preselectNextUpcomingSession) {
      const nextUpcoming = pickNextUpcomingSession(this.#getAvailableHoursInDayPartOrder(selectedSession));
      if (nextUpcoming !== null) {
        return nextUpcoming;
      }
    }

    let availableFirstHour: SessionAvailabilitySummaryByDatetime | null = null;
    const morningSessions: SessionAvailabilitySummaryByDatetime[] = selectedSession.morningSessions;
    availableFirstHour = this.getFirstAvailableHour(morningSessions);

    if (!availableFirstHour) {
      const afternoonSessions: SessionAvailabilitySummaryByDatetime[] = selectedSession.afternoonSessions;
      availableFirstHour = this.getFirstAvailableHour(afternoonSessions);
    }

    if (!availableFirstHour) {
      const eveningSessions: SessionAvailabilitySummaryByDatetime[] = selectedSession.eveningSessions;
      availableFirstHour = this.getFirstAvailableHour(eveningSessions);
    }

    if (!availableFirstHour) {
      const nightSessions: SessionAvailabilitySummaryByDatetime[] = selectedSession.nightSessions;
      availableFirstHour = this.getFirstAvailableHour(nightSessions);
    }

    if (!availableFirstHour) {
      availableFirstHour = this.getFirstAvailableHourInSessionAvailabilitySummary(selectedSession.sessionAvailabilityByDatetimeList);
    }

    return availableFirstHour;
  }

  getFirstAvailableHour(availableSessions: SessionAvailabilitySummaryByDatetime[]): SessionAvailabilitySummaryByDatetime | null {
    const filtered = availableSessions.filter(availableSession => this.#isHourAvailable(availableSession));
    return filtered.length > 0 ? filtered[0] : null;
  }

  #isHourAvailable(sessionAvailabilityByDatetime: SessionAvailabilitySummaryByDatetime): boolean {
    return (
      !this.disabledDatetimes().has(sessionAvailabilityByDatetime.datetime) &&
      sessionAvailabilityByDatetime.isAvailable(
        this.ticketTypes,
        this.maxLimitField,
        this.excludeNextHours,
        this.allowMultiTimeSlot,
        this.ongoingTicketTypeNamesSet,
        this.skipBookingLimitsValidation,
      )
    );
  }

  #getAvailableHoursInDayPartOrder(selectedSession: RegularSessionAvailabilitySummaryByDate): SessionAvailabilitySummaryByDatetime[] {
    return [
      ...selectedSession.morningSessions,
      ...selectedSession.afternoonSessions,
      ...selectedSession.eveningSessions,
      ...selectedSession.nightSessions,
    ].filter(sessionAvailabilityByDatetime => this.#isHourAvailable(sessionAvailabilityByDatetime));
  }

  getFirstAvailableHourInSessionAvailabilitySummary(
    sessionAvailabilitySummary: SessionAvailabilitySummaryByDatetime[],
  ): SessionAvailabilitySummaryByDatetime | null {
    if (!this.ticketTypes || this.ticketTypes.size === 0) {
      return null;
    }

    const candidates = sessionAvailabilitySummary.filter(session => !this.disabledDatetimes().has(session.datetime));
    const filtered = candidates.filter(session => session.isTicketTypePresentInAvailabilitySummary(this.ticketTypes));

    return filtered.length === 0 ? (candidates[0] ?? null) : null;
  }

  isDateDisabled(sessionAvailabilityByDate: SessionAvailabilitySummaryByDate): boolean {
    return (
      this.disabled ||
      !sessionAvailabilityByDate ||
      !sessionAvailabilityByDate.isAvailable(
        this.ticketTypes,
        this.maxLimitField,
        this.excludeNextHours,
        this.allowMultiTimeSlot,
        this.ongoingTicketTypeNamesSet,
        this.skipBookingLimitsValidation,
      )
    );
  }

  isDateSelected(sessionAvailabilityByDate: SessionAvailabilitySummaryByDate | null): boolean {
    if (this.selectedSession === null || sessionAvailabilityByDate === null) {
      return false;
    }
    return this.selectedSession.date === sessionAvailabilityByDate.date;
  }

  isDatetimeDisabled(sessionAvailabilityByDatetime: SessionAvailabilitySummaryByDatetime | null): boolean {
    if (sessionAvailabilityByDatetime === null) {
      return true;
    }
    return (
      this.disabledDatetimes().has(sessionAvailabilityByDatetime.datetime) ||
      !sessionAvailabilityByDatetime.isAvailable(
        this.ticketTypes,
        this.maxLimitField,
        this.excludeNextHours,
        this.allowMultiTimeSlot,
        this.ongoingTicketTypeNamesSet,
        this.skipBookingLimitsValidation,
      )
    );
  }

  isDatetimeSelected(sessionAvailabilityByDatetime: SessionAvailabilitySummaryByDatetime | null): boolean {
    if (sessionAvailabilityByDatetime === null) {
      return false;
    }
    if (this.isDatetimeDisabled(sessionAvailabilityByDatetime)) {
      return false;
    }
    if (this.selectedSession?.selectedDatetime === null) {
      return false;
    }
    return this.selectedSession?.selectedDatetime.datetime === sessionAvailabilityByDatetime.datetime;
  }

  isDateAvailabilitySelected(dateItem: DateAvailability): boolean {
    return this.selectedDateAvailability?.date === dateItem.date;
  }

  isDateAvailabilityDisabled(dateItem: DateAvailability): boolean {
    return !dateItem.isPurchasable;
  }

  selectDateAvailability(dateItem: DateAvailability): void {
    if (this.loadingSessions) {
      return;
    }
    this.newDateSelected = true;
    this.#pendingDateAvailabilitySelectionChange = true;
    this.#lastEmittedSelectionKey = null;
    this.selectedDateAvailability = dateItem;
    this.selectedDateChange.emit(dateItem);
  }

  selectSessionType(sessionType: SessionAvailabilitySummaryByDateType): void {
    const sessions: RegularSessionAvailabilitySummaryByDate[] = this.regularSessionAvailabilitySummaryByDate;
    const availableDateSessions: RegularSessionAvailabilitySummaryByDate[] = sessions.filter(item =>
      item.isAvailable(
        this.ticketTypes,
        this.maxLimitField,
        this.excludeNextHours,
        this.allowMultiTimeSlot,
        this.ongoingTicketTypeNamesSet,
        this.skipBookingLimitsValidation,
      ),
    );
    this.selectedSession =
      availableDateSessions && availableDateSessions.length > 0 ? this.#preferredSessionAmong(availableDateSessions) : null;
    this.updateSelectedHour();
    this.displayedSessionTypeChange.emit(sessionType);
  }

  selectDate(sessionAvailabilitySummaryByDate: RegularSessionAvailabilitySummaryByDate): void {
    if (this.selectedSession !== sessionAvailabilitySummaryByDate) {
      this.selectedSession = sessionAvailabilitySummaryByDate;
      this.updateSelectedHour();
      this.updateFreeMapMode.emit();
      this.loadOneStepFreeSeatingMap.emit();
    }
  }

  selectHour(sessionAvailabilitySummaryByDatetime: SessionAvailabilitySummaryByDatetime): void {
    if (this.disabledDatetimes().has(sessionAvailabilitySummaryByDatetime.datetime)) {
      return;
    }
    const hourChanged = this.selectedSession?.selectedDatetime !== sessionAvailabilitySummaryByDatetime;
    if (!hourChanged) {
      return;
    }
    this.#setSelectDatetime(sessionAvailabilitySummaryByDatetime);
    this.updateFreeMapMode.emit();
    this.loadOneStepFreeSeatingMap.emit();
    this.confirmSelection();
  }

  confirmSelection(): void {
    if (this.selectedSession && this.selectedSession.selectedDatetime) {
      this.#emitSelectionChange(this.#selectionKeyFor(this.selectedSession));
    }
  }

  onScroll(event: any): void {
    if (event.target.scrollLeft + event.target.offsetWidth + 10 >= event.target.scrollWidth) {
      this.loadMore.emit();
    }
  }

  handleShowAvailabilityFromDatePickerChanges(date: string): void {
    if (!date) {
      return;
    }
    this.handleShowAvailabilityFromDateChange.emit(date);
  }

  #setSelectDatetime(sessionAvailabilityByDatetime: SessionAvailabilitySummaryByDatetime | null): void {
    if (this.selectedSession !== null) {
      this.selectedSession.selectedDatetime = sessionAvailabilityByDatetime;
    }
  }
}
