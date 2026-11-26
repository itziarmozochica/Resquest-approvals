import { ChangeDetectionStrategy, Component, computed, inject, type Signal } from '@angular/core';

import { TrackPosTimeSlotCalendarService } from '@fz-original/app/modules/box-office/one-stop-shop/tracking/services/track-pos-time-slot-calendar.service';
import { buildPartyHandheldDateVm, FztPartyHandheldDateSectionComponent, type FztPartyHandheldDateSectionVm } from '@fz/ticketing-ui';

import { PosAvailabilityService } from '../../../../services/availability/pos-availability.service';
import { PosPartyIntentService } from '../../../../services/party/pos-party-intent.service';
import { PosViewUpdateService } from '../../../../services/pos-view-update/pos-view-update.service';
import { PosTicketingState } from '../../../../state/pos-ticketing.state';
import { PosAvailabilityStore } from '../../../../store/pos-availability.store';
import { PosTicketSelectorStore } from '../../../../store/pos-ticket-selector.store';
import { orderedDaySummaries } from '../../../../utils/pos-ordered-day-summaries.util';

/**
 * The date sheet's body: the date and the hour write through, with the guards and the tracking of
 * `pos-date-selector`, and Cancel puts them back. Everything resolves from the Point of Sale injector.
 */
@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FztPartyHandheldDateSectionComponent],
  selector: 'pos-party-date-step',
  styleUrl: './pos-party-date-step.component.scss',
  templateUrl: './pos-party-date-step.component.html',
})
export class PosPartyDateStepComponent {
  readonly #availability = inject(PosAvailabilityService);
  readonly #availabilityStore = inject(PosAvailabilityStore);
  readonly #party = inject(PosTicketSelectorStore);
  readonly #partyIntent = inject(PosPartyIntentService);
  readonly #state = inject(PosTicketingState);
  readonly #track = inject(TrackPosTimeSlotCalendarService);
  readonly #viewUpdate = inject(PosViewUpdateService);

  /** `viewVersion()` reproduces `CheckAlways` for the legacy-mirror reads, as in `pos-date-selector`. */
  protected readonly vm: Signal<FztPartyHandheldDateSectionVm> = computed(() => {
    this.#viewUpdate.viewVersion();

    return buildPartyHandheldDateVm(this.#buildVmParams());
  });

  protected onDateSelected(dateIso: string): void {
    if (this.#availabilityStore.isLoadingAnySessions()) {
      return;
    }

    if (dateIso !== this.#state.selectedDateAvailability?.date) {
      this.#track.trackDatePickerSelected(true, 'date', dateIso);
    }

    this.#availability.selectDateFromSelector(dateIso);
  }

  protected onFromDateChanged(date: string | null): void {
    if (date === null) {
      return;
    }

    this.#track.trackCalendarDateSelected(true, date);
    this.#availability.handleShowAvailabilityFromDateChange(date);
  }

  protected onHourSelected(hour: string | null): void {
    this.#partyIntent.selectHour(hour);
  }

  #buildVmParams(): Parameters<typeof buildPartyHandheldDateVm>[0] {
    const store = this.#availabilityStore;
    const dates = store.dates();

    return {
      dates,
      daySummary: orderedDaySummaries(store.daySummaryOrder(), store.daySummaries()).at(-1) ?? null,
      fromDate: store.selectedAvailabilityFromDate(),
      hasFetchSettled: store.availabilityAction() !== null,
      hourFilter: this.#party.partyResolvedHourFilter(),
      isLoadingDates: store.isLoadingDates(),
      isLoadingSessions: store.isLoadingAnySessions() || this.#state.isLoadingDateSessions,
      locale: this.#state.locale,
      searchedAt: this.#party.partySearchedAt(),
      selectedDate: dates.length > 0 ? (this.#state.selectedDateAvailability?.date ?? null) : store.selectedDate(),
      timeZone: store.timezone(),
    };
  }
}
