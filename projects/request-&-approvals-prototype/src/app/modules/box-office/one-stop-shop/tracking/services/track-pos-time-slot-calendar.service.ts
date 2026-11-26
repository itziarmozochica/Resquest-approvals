import { inject, Injectable } from '@angular/core';

import { FzTrackingService } from '@fz/fz-tracking/src/public-api';

import { posTimeSlotCalendarClosed } from '../events/pos-time-slot-calendar-closed.event';
import { posTimeSlotCalendarDateSelected } from '../events/pos-time-slot-calendar-date-selected.event';
import { posTimeSlotCalendarOpened } from '../events/pos-time-slot-calendar-opened.event';
import { posTimeSlotDatePickerSelected, type PosTimeSlotDatePickerType } from '../events/pos-time-slot-date-picker-selected.event';
import { posTimeSlotRangeClosed } from '../events/pos-time-slot-range-closed.event';
import { posTimeSlotRangeOpened, type PosTimeSlotRange } from '../events/pos-time-slot-range-opened.event';
import { posTimeSlotTimeSlotPickerSelected } from '../events/pos-time-slot-time-slot-picker-selected.event';
import { getAvailabilityCalendarOpenTransition } from '../utils/pos-time-slot-calendar.util';

@Injectable()
export class TrackPosTimeSlotCalendarService {
  readonly #fzTracking = inject(FzTrackingService);
  #wasAvailabilityCalendarOpen = false;

  trackCalendarClosed(isOneStopShop: boolean): void {
    if (!isOneStopShop) {
      return;
    }

    this.#fzTracking.track(posTimeSlotCalendarClosed());
  }

  trackCalendarDateSelected(isOneStopShop: boolean, selectedDate: string | null): void {
    if (!isOneStopShop || selectedDate === null) {
      return;
    }

    this.#fzTracking.track(posTimeSlotCalendarDateSelected({ selectedDate }));
  }

  trackCalendarOpened(isOneStopShop: boolean): void {
    if (!isOneStopShop) {
      return;
    }

    this.#fzTracking.track(posTimeSlotCalendarOpened());
  }

  syncCalendarOpenState(isOneStopShop: boolean, isCalendarOpen: boolean | null): void {
    if (!isOneStopShop) {
      return;
    }

    if (isCalendarOpen === null) {
      this.#wasAvailabilityCalendarOpen = false;
      return;
    }

    const transition = getAvailabilityCalendarOpenTransition(this.#wasAvailabilityCalendarOpen, isCalendarOpen);

    if (transition === null) {
      return;
    }

    this.#wasAvailabilityCalendarOpen = isCalendarOpen;

    if (transition === 'opened') {
      this.trackCalendarOpened(isOneStopShop);
    } else {
      this.trackCalendarClosed(isOneStopShop);
    }
  }

  trackDatePickerSelected(isOneStopShop: boolean, datePickerType: PosTimeSlotDatePickerType, dateSelected: string): void {
    if (!isOneStopShop) {
      return;
    }

    this.#fzTracking.track(
      posTimeSlotDatePickerSelected({
        datePickerType,
        dateSelected,
      }),
    );
  }

  trackRangeClosed(isOneStopShop: boolean, range: PosTimeSlotRange): void {
    if (!isOneStopShop) {
      return;
    }

    this.#fzTracking.track(posTimeSlotRangeClosed({ range }));
  }

  trackRangeOpened(isOneStopShop: boolean, range: PosTimeSlotRange): void {
    if (!isOneStopShop) {
      return;
    }

    this.#fzTracking.track(posTimeSlotRangeOpened({ range }));
  }

  trackTimeSlotPickerSelected(isOneStopShop: boolean, selectedTimeSlot: string): void {
    if (!isOneStopShop) {
      return;
    }

    this.#fzTracking.track(
      posTimeSlotTimeSlotPickerSelected({
        selectedTimeSlot,
      }),
    );
  }
}
