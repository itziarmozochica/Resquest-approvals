import { AfterViewChecked, Component, computed, DestroyRef, inject, input, Input, ViewChild } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { type PosTimeSlotRange } from '@fz-original/app/modules/box-office/one-stop-shop/tracking/events/pos-time-slot-range-opened.event';
import { TrackPosTimeSlotCalendarService } from '@fz-original/app/modules/box-office/one-stop-shop/tracking/services/track-pos-time-slot-calendar.service';
import { IgntDatePickerInputComponent } from '@ignite/legacy/components/ignt-date-picker-input/ignt-date-picker-input.component';
import { IgntTabsComponent } from '@ignite/legacy/components/ignt-tabs/ignt-tabs.component';
import moment from 'moment-timezone';

import { DateAvailability } from '../../models/session-availability/date-availability.model';
import { RegularSessionAvailabilitySummaryByDate } from '../../models/session-availability/regular-session-availability-summary-by-date.model';
import { SessionAvailabilitySummaryByDatetime } from '../../models/session-availability/session-availability-summary-by-datetime.model';
import { SessionSelectorType } from '../../services/session-availability/session-selector-type.enum';
import { DateSelectorComponent, type TimeRangeSection } from '../date-selector/date-selector.component';

@Component({
  selector: 'app-date-selector-obo',
  standalone: false,
  styleUrls: ['../common/styles/date-selector-common.scss', './date-selector-obo.component.scss'],
  templateUrl: './date-selector-obo.component.html',
})
export class DateSelectorOboComponent extends DateSelectorComponent implements AfterViewChecked {
  #destroyRef = inject(DestroyRef);
  readonly #trackPosTimeSlotCalendar = inject(TrackPosTimeSlotCalendarService, { optional: true });
  readonly isMobile = input(false);
  readonly isTablet = input(false);
  readonly skeletonWhite = input<boolean | undefined>(undefined);

  readonly useWhiteSkeleton = computed<boolean>(() => {
    const override = this.skeletonWhite();
    if (override !== undefined) {
      return override;
    }
    return !this.isMobile() && !this.isTablet();
  });

  @Input() compact = false;
  @Input() isOneStepFlow = true;
  @Input() isOneStopShop = false;
  @Input() loadingAvailability = true;
  @Input() enableTimelessExtendedSelectors = false;
  selectedTabIndex = 0;
  override sessionSelectorType = SessionSelectorType.BY_DATE;
  sessionSelectorTypeEnum = SessionSelectorType;
  @Input() shouldShowDateSelector = false;
  @Input() showLoadMoreButton = false;
  skeletonTabWidths: number[] = [68, 77, 65, 50];
  @ViewChild('availabilityDatePicker') availabilityDatePicker?: IgntDatePickerInputComponent;
  @ViewChild('tabs') tabs!: IgntTabsComponent;

  constructor() {
    super();
    this.selectedSessionChange.pipe(takeUntilDestroyed(this.#destroyRef)).subscribe(() => {
      this.changeTabIndex();
    });
  }

  override handleShowAvailabilityFromDatePickerChanges(date: string | null): void {
    this.#trackPosTimeSlotCalendar?.trackCalendarDateSelected(this.isOneStopShop, date);

    super.handleShowAvailabilityFromDatePickerChanges(date as string);
  }

  override selectDate(sessionAvailabilitySummaryByDate: RegularSessionAvailabilitySummaryByDate): void {
    const dateChanged = this.selectedSession !== sessionAvailabilitySummaryByDate;
    if (this.isOneStopShop && dateChanged) {
      this.#trackPosTimeSlotCalendar?.trackDatePickerSelected(this.isOneStopShop, 'date', sessionAvailabilitySummaryByDate.date);
    }

    super.selectDate(sessionAvailabilitySummaryByDate);
  }

  override selectDateAvailability(dateItem: DateAvailability): void {
    const dateChanged = this.selectedDateAvailability?.date !== dateItem.date;
    if (this.isOneStopShop && dateChanged && !this.loadingSessions) {
      this.#trackPosTimeSlotCalendar?.trackDatePickerSelected(this.isOneStopShop, 'date', dateItem.date);
    }

    super.selectDateAvailability(dateItem);
  }

  override selectHour(sessionAvailabilitySummaryByDatetime: SessionAvailabilitySummaryByDatetime): void {
    if (this.disabledDatetimes().has(sessionAvailabilitySummaryByDatetime.datetime)) {
      return;
    }

    if ((this.isMobile() || this.isTablet()) && this.selectedSession?.selectedDatetime === sessionAvailabilitySummaryByDatetime) {
      this.confirmSelection();
      return;
    }

    const hourChanged = this.selectedSession?.selectedDatetime !== sessionAvailabilitySummaryByDatetime;
    if (this.isOneStopShop && hourChanged) {
      this.#trackPosTimeSlotCalendar?.trackTimeSlotPickerSelected(
        this.isOneStopShop,
        moment(sessionAvailabilitySummaryByDatetime.datetime).tz(this.timezone).format('H:mm'),
      );
    }

    super.selectHour(sessionAvailabilitySummaryByDatetime);
  }

  override toggleTimeRangeSection(timeRangeSection: TimeRangeSection, sessionsOfRange: SessionAvailabilitySummaryByDatetime[]): void {
    if (this.isOneStopShop && !this.isSelectedSessionInHoursRange(sessionsOfRange)) {
      const isClosing = this.openedTimeRangeSections.has(timeRangeSection);
      const range = timeRangeSection as PosTimeSlotRange;

      if (isClosing) {
        this.#trackPosTimeSlotCalendar?.trackRangeClosed(this.isOneStopShop, range);
      } else {
        this.#trackPosTimeSlotCalendar?.trackRangeOpened(this.isOneStopShop, range);
      }
    }

    super.toggleTimeRangeSection(timeRangeSection, sessionsOfRange);
  }

  changeTabIndex(index?: number): void {
    if (index !== undefined) {
      this.selectedTabIndex = index;
    }

    if (this.tabs == null || !this.selectedSession) {
      return;
    }

    this.selectedTabIndex = this.#calculateSelectedTabIndex();
  }

  get hasMultipleDates(): boolean {
    const byDate = this.regularSessionAvailabilitySummaryByDate?.length ?? 0;
    const byAvailability = this.datesAvailability?.length ?? 0;
    return byDate > 1 || byAvailability > 1;
  }

  get hasMultipleTimeSlotsOnSelectedSession(): boolean {
    const s = this.selectedSession;
    return (s?.sessionAvailabilityByDatetimeList?.length ?? 0) > 1;
  }

  isSessionDisabled(session: SessionAvailabilitySummaryByDatetime, ticketTypes: Map<string, number>): boolean {
    return (
      this.disabled ||
      this.disabledDatetimes().has(session.datetime) ||
      !this.#isSessionAvailableForTickets(session, ticketTypes, this.excludeNextHours, this.skipBookingLimitsValidation)
    );
  }

  isSessionSelected(session: SessionAvailabilitySummaryByDatetime, ticketTypes: Map<string, number>): boolean {
    return (
      this.#isSessionAvailableForTickets(session, ticketTypes, 0, this.skipBookingLimitsValidation) &&
      session === this.selectedSession?.selectedDatetime
    );
  }

  ngAfterViewChecked(): void {
    this.#trackPosTimeSlotCalendar?.syncCalendarOpenState(this.isOneStopShop, this.availabilityDatePicker?.isOpen ?? null);
  }

  onLoadMoreClick(): void {
    this.#trackPosTimeSlotCalendar?.trackDatePickerSelected(this.isOneStopShop, 'more_dates', '');

    this.loadMore.emit();
  }

  onScroll(event: MouseEvent): void {
    event.preventDefault();
    return;
  }

  get showSkeletonAvailability(): boolean {
    return this.loadingAvailability && this.isOneStopShop && !this.compact;
  }

  get showSkeletonDates(): boolean {
    return (this.loadingAvailability || this.loadingSessions) && this.isOneStopShop && !this.compact;
  }

  get showSkeletonSessions(): boolean {
    return this.loadingSessions && !this.compact;
  }

  get displaySessionSelectorType(): SessionSelectorType {
    if (this.sessionSelectorType === SessionSelectorType.BY_DATE) {
      return SessionSelectorType.BY_DATE_AND_TIME;
    }

    return this.sessionSelectorType;
  }

  #calculateSelectedTabIndex(): number {
    if (!this.selectedSession) {
      return 0;
    }

    const session = this.selectedSession;

    const sessionTypes = [
      { name: 'morning', sessions: session.morningSessions },
      { name: 'afternoon', sessions: session.afternoonSessions },
      { name: 'evening', sessions: session.eveningSessions },
      { name: 'night', sessions: session.nightSessions },
    ];

    const visibleTabs = sessionTypes.filter(({ sessions }) => sessions?.length).map(({ name }) => name);
    const selectedTab = sessionTypes.find(({ sessions }) => this.isSelectedSessionInHoursRange(sessions ?? []));
    const index = selectedTab ? visibleTabs.indexOf(selectedTab.name) : -1;

    return index >= 0 ? index : 0;
  }

  #isSessionAvailableForTickets(
    session: SessionAvailabilitySummaryByDatetime,
    ticketTypes: Map<string, number>,
    excludeNextHours = 0,
    skipBookingLimitsValidation = false,
  ): boolean {
    return (
      session.isAvailable(
        ticketTypes,
        this.maxLimitField,
        excludeNextHours,
        this.allowMultiTimeSlot,
        this.ongoingTicketTypeNamesSet,
        skipBookingLimitsValidation,
      ) || !session.isTicketTypePresentInAvailabilitySummary(ticketTypes)
    );
  }
}
