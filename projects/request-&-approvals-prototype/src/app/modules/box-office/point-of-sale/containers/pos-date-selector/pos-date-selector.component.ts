import { ChangeDetectionStrategy, Component, computed, DestroyRef, inject, input, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { type PosTimeSlotRange } from '@fz-original/app/modules/box-office/one-stop-shop/tracking/events/pos-time-slot-range-opened.event';
import { TrackPosTimeSlotCalendarService } from '@fz-original/app/modules/box-office/one-stop-shop/tracking/services/track-pos-time-slot-calendar.service';
import { FilterProductSessionsPipe } from '@fz-original/app/modules/box-office/ticketing/filter-product-sessions.pipe';
import { MaxLimitTicketFieldEnum } from '@fz-original/app/shared/models/ticket-type/max-limit-ticket-field.enum';
import { MaxLimitTicketField, type DaySummary } from '@fz/ticketing';
import {
  buildDateSelectorVm,
  buildPartyDatePanelVm,
  formatTimeslotTimeLabel,
  FztDateSelectorComponent,
  FztPartyDatePanelComponent,
  isTimeslotExpired,
  type FztAvailabilityParams,
  type FztDateSelectorVm,
  type FztDateSelectorVmParams,
  type FztPartyDatePanelVm,
  type FztPartyMemberQuantityChange,
  type FztSectionToggle,
} from '@fz/ticketing-ui';
import { interval } from 'rxjs';

import { PosAvailabilityService } from '../../services/availability/pos-availability.service';
import { PosPartyIntentService } from '../../services/party/pos-party-intent.service';
import { PosViewUpdateService } from '../../services/pos-view-update/pos-view-update.service';
import { PosTicketSelectionService } from '../../services/ticket-selection/pos-ticket-selection.service';
import { PosTicketingState } from '../../state/pos-ticketing.state';
import { PosAvailabilityStore } from '../../store/pos-availability.store';
import { PosTicketSelectorStore } from '../../store/pos-ticket-selector.store';
import { loadingHoursAroundWindow } from '../../utils/loading-hours-around-window.util';
import { orderedDaySummaries } from '../../utils/pos-ordered-day-summaries.util';

/**
 * Smart container of the POS date selector: builds the view-model the reusable `fzt-date-selector`
 * renders and owns the Mixpanel events. Contracts, the tracking table and the `viewVersion`
 * change-detection bridge are documented in `point-of-sale/AGENTS.md`.
 */
@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FztDateSelectorComponent, FztPartyDatePanelComponent],
  selector: 'pos-date-selector',
  standalone: true,
  styleUrl: './pos-date-selector.component.scss',
  templateUrl: './pos-date-selector.component.html',
})
export class PosDateSelectorComponent {
  /** How often an open Box Office re-checks `purchasable_until_date`: the backend drops expired slots, the loaded list does not. */
  static readonly expiredTimeslotsCheckIntervalMs = 15_000;
  readonly #availability = inject(PosAvailabilityService);
  readonly #destroyRef = inject(DestroyRef);
  readonly #party = inject(PosTicketSelectorStore);
  readonly #partyIntent = inject(PosPartyIntentService);
  readonly #state = inject(PosTicketingState);
  readonly #store = inject(PosAvailabilityStore);
  readonly #ticketSelection = inject(PosTicketSelectionService);
  readonly #track = inject(TrackPosTimeSlotCalendarService);
  readonly #viewUpdate = inject(PosViewUpdateService);
  readonly #now = signal<number>(Date.now());
  readonly isMobile = input(false);
  readonly isTablet = input(false);

  /**
   * `viewVersion()` is the only tracked dependency of the legacy reads below: it reproduces
   * `CheckAlways` for this subtree while `PosTicketingState` is still a plain holder. `#now()`
   * re-runs it on the expiry clock so slots past `purchasable_until_date` drop out of an open view.
   */
  protected readonly vm = computed<FztDateSelectorVm>(() => {
    this.#viewUpdate.viewVersion();

    return buildDateSelectorVm(this.#buildVmParams(this.#now()));
  });

  protected readonly showPartyPanel = computed<boolean>(
    () => this.#party.isPartyMembersMode() && this.#store.availabilityAction() !== null,
  );

  protected readonly partyVm = computed<FztPartyDatePanelVm>(() => {
    this.#viewUpdate.viewVersion();

    return buildPartyDatePanelVm({
      ...this.#buildVmParams(this.#now()),
      hourFilter: this.#party.partyResolvedHourFilter(),
      members: this.#party.partyMembers(),
      quantities: this.#party.partyQuantities(),
      searchedAt: this.#party.partySearchedAt(),
    });
  });

  constructor() {
    interval(PosDateSelectorComponent.expiredTimeslotsCheckIntervalMs)
      .pipe(takeUntilDestroyed(this.#destroyRef))
      .subscribe(() => this.#onExpiryClockTick());
  }

  protected onCalendarOpenChanged(isCalendarOpen: boolean | null): void {
    this.#track.syncCalendarOpenState(true, isCalendarOpen);
  }

  protected onDateSelected(dateIso: string): void {
    if (this.#store.isLoadingAnySessions()) {
      return;
    }

    if (dateIso !== this.#state.selectedDateAvailability?.date) {
      this.#track.trackDatePickerSelected(true, 'date', dateIso);
    }

    this.#availability.selectDateFromSelector(dateIso);
  }

  protected onFromDateChange(date: string | null): void {
    if (date === null) {
      return;
    }

    this.#track.trackCalendarDateSelected(true, date);
    this.#availability.handleShowAvailabilityFromDateChange(date);
  }

  protected onLoadMoreClicked(): void {
    this.#track.trackDatePickerSelected(true, 'more_dates', '');
    this.#availability.loadMoreDays();
  }

  protected onClearPartyMembers(): void {
    this.#partyIntent.clearMembers();
  }

  protected onPartyHourSelected(hour: string | null): void {
    this.#partyIntent.selectHour(hour);
  }

  protected onPartyMemberQuantityChanged(change: FztPartyMemberQuantityChange): void {
    this.#partyIntent.setMemberQuantity(change.memberKey, change.quantity);
  }

  protected onSectionToggled(toggle: FztSectionToggle): void {
    const range: PosTimeSlotRange = toggle.section;

    if (toggle.open) {
      this.#track.trackRangeOpened(true, range);

      return;
    }

    this.#track.trackRangeClosed(true, range);
  }

  /** Mobile/tablet re-tap of the selected slot: legacy `confirmSelection()` emitted no event. */
  protected onTimeslotConfirmed(): void {
    this.#availability.confirmTimeslotFromSelector();
  }

  protected onTimeslotSelected(datetimeIso: string): void {
    if (datetimeIso === this.#store.selectedDatetime()) {
      return;
    }

    this.#track.trackTimeSlotPickerSelected(true, formatTimeslotTimeLabel(datetimeIso, this.#store.timezone()));
    this.#availability.selectTimeslotFromSelector(datetimeIso);
  }

  #buildAvailabilityParams(now: number): FztAvailabilityParams {
    const state = this.#state;

    return {
      allowMultiTimeSlot: state.allowMultiTimeSlotSelection,
      canOverrideCapacity: state.includeOverrideCapacity,
      maxLimitField:
        state.maxLimitTicketField === MaxLimitTicketFieldEnum.AVAILABLE_TICKETS
          ? MaxLimitTicketField.AvailableTickets
          : MaxLimitTicketField.Maximum,
      minutesBeforeToExpire: state.minutesBeforeToExpire ?? 0,
      now,
      ongoingTicketTypeNames: new Set(this.#ticketSelection.getOngoingMultiDaySelectedTicketTypeNames()),
      // Reschedule-only escape hatch: POS never sets it.
      skipBookingLimitsValidation: false,
      ticketTypes: new FilterProductSessionsPipe().transform(state.selectedTicketsBySessionType, state.productSessions),
    };
  }

  #buildVmParams(now: number): FztDateSelectorVmParams {
    const state = this.#state;
    const dates = this.#store.dates();
    const orderedDaySummaries = this.#orderedDaySummaries();
    const maxPurchasableDays = state.onsiteSetupSelected?.max_purchasable_days ?? 0;

    return {
      availability: this.#buildAvailabilityParams(now),
      dates,
      daySummaries: orderedDaySummaries,
      // "Selected day = last bucket" — the same contract `daySummaryOrder` exists to protect.
      daySummary: orderedDaySummaries.at(-1) ?? null,
      fromDate: this.#store.selectedAvailabilityFromDate(),
      groupingMode: 'operatingDay',
      // Settled = the last dispatched fetch resolved (success, empty or error). While null the
      // library holds the skeletons, covering the dates-leg window where the summaries are already
      // cleared but the sessions leg has not started, and the first frames before any dispatch.
      hasFetchSettled: this.#store.availabilityAction() !== null,
      includeCapacity: state.includeTimeSlotCapacity,
      isLoadingDates: this.#store.isLoadingDates(),
      // Legacy bound `loadingSessions` to `isLoadingSessions || isLoadingDateSessions`, and the mirror
      // never clears `isLoadingDateSessions` on a sessions-leg failure (parity-locked quirk), so the
      // skeleton outlives the error exactly as it did there. The store alone drops its flags in `failFlow`.
      isLoadingSessions: this.#store.isLoadingAnySessions() || state.isLoadingDateSessions,
      loadingHours: loadingHoursAroundWindow(this.#store.pendingWholeDayWindow()),
      locale: state.locale,
      selectedDate: this.#selectedPillDate(dates.length > 0),
      selectedDatetime: this.#store.selectedDatetime(),
      sessionSelectorType: this.#store.sessionSelectorType(),
      showFromDateRow: state.onsiteSetupSelected == null || maxPurchasableDays > 1,
      showLoadMore: this.#showLoadMore(maxPurchasableDays),
      timeZone: this.#store.timezone(),
    };
  }

  #isSelectedTimeslotExpired(now: number): boolean {
    const selectedDatetime = this.#store.selectedDatetime();
    const selectedTimeslot = this.#orderedDaySummaries()
      .at(-1)
      ?.timeslots.find(timeslot => timeslot.datetime === selectedDatetime);

    return selectedTimeslot !== undefined && isTimeslotExpired(selectedTimeslot, this.#buildAvailabilityParams(now));
  }

  /** A selected slot that expired moves to the next available one of the day (POS only, B2BO-9014). */
  #onExpiryClockTick(): void {
    const now = Date.now();
    this.#now.set(now);
    if (!this.#isSelectedTimeslotExpired(now)) {
      return;
    }
    this.#availability.moveSelectionOffExpiredTimeslot();
    // A timer is not a template event, so the OnPush page only repaints the new slot's tiles when told to.
    this.#viewUpdate.markForCheck();
  }

  #orderedDaySummaries(): readonly DaySummary[] {
    return orderedDaySummaries(this.#store.daySummaryOrder(), this.#store.daySummaries());
  }

  #selectedPillDate(hasCalendarDates: boolean): string | null {
    return hasCalendarDates ? (this.#state.selectedDateAvailability?.date ?? null) : this.#store.selectedDate();
  }

  /** Legacy `showLoadMoreButton` expression, verbatim. */
  #showLoadMore(maxPurchasableDays: number): boolean {
    const nextAvailableDate = this.#store.nextAvailableDate();

    if (nextAvailableDate === null || nextAvailableDate.length === 0) {
      return false;
    }

    return this.#state.onsiteSetupSelected == null || maxPurchasableDays > 1;
  }
}
