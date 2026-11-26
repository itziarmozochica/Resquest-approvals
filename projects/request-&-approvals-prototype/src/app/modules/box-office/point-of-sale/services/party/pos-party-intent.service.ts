import { DestroyRef, inject, Injectable } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { posPartyHourFilterSelected } from '@fz-original/app/modules/box-office/one-stop-shop/tracking/events/pos-party-hour-filter-selected.event';
import { posPartyMemberQuantityChanged } from '@fz-original/app/modules/box-office/one-stop-shop/tracking/events/pos-party-member-quantity-changed.event';
import { FzTrackingService } from '@fz/fz-tracking/src/public-api';
import type { PartyMember, PartyQuantities } from '@fz/ticketing';
import { formatTimeslotTimeLabel } from '@fz/ticketing-ui';
import { defer, EMPTY, filter, Observable, take, type Subscription } from 'rxjs';

import type { PosPartyDateSnapshot } from '../../models/pos-party-date-snapshot.model';
import { PosTicketingState } from '../../state/pos-ticketing.state';
import { PosAvailabilityStore } from '../../store/pos-availability.store';
import { PosTicketSelectorStore } from '../../store/pos-ticket-selector.store';
import { PosAvailabilityService } from '../availability/pos-availability.service';

/**
 * The party intents the till panel and the handheld sheet share: each writes the store slice and
 * fires its Mixpanel event, so both surfaces produce one event path. Contracts in `point-of-sale/AGENTS.md`.
 */
@Injectable()
export class PosPartyIntentService {
  readonly #availability = inject(PosAvailabilityService);
  readonly #availabilityStore = inject(PosAvailabilityStore);
  readonly #destroyRef = inject(DestroyRef);
  readonly #fzTracking = inject(FzTrackingService);
  readonly #party = inject(PosTicketSelectorStore);
  readonly #ticketingState = inject(PosTicketingState);
  #pendingRestore: Subscription | null = null;

  selectHour(hour: string | null): void {
    this.#party.selectPartyHour(hour);
    this.#fzTracking.track(
      posPartyHourFilterSelected({ hour: hour === null ? null : formatTimeslotTimeLabel(hour, this.#availabilityStore.timezone()) }),
    );
  }

  setMemberQuantity(memberKey: string, quantity: number): void {
    const previousQuantity = this.#party.partyQuantities()[memberKey] ?? 0;

    this.#party.setPartyMemberQuantity(memberKey, quantity);
    this.#fzTracking.track(
      posPartyMemberQuantityChanged({
        memberName: this.#party.partyMembers().find((member: PartyMember) => member.key === memberKey)?.name ?? memberKey,
        newQuantity: this.#party.partyQuantities()[memberKey] ?? 0,
        previousQuantity,
      }),
    );
  }

  /** Clears the party: sets every member back to 0, one quantity-changed event per member that moved. */
  clearMembers(): void {
    this.commitDraft({});
  }

  /** One write and one event per member whose quantity moved; members that did not move fire nothing. */
  commitDraft(draft: PartyQuantities): void {
    const current = this.#party.partyQuantities();

    this.#party.partyMembers().forEach((member: PartyMember) => {
      const next = draft[member.key] ?? 0;

      if (next !== (current[member.key] ?? 0)) {
        this.setMemberQuantity(member.key, next);
      }
    });
  }

  /** Also drops a restore still waiting on a fetch, so it cannot land over what the operator picks next. */
  dateSnapshot(): PosPartyDateSnapshot {
    this.#pendingRestore?.unsubscribe();
    this.#pendingRestore = null;

    return {
      date: this.#availabilityStore.selectedDate(),
      fromDate: this.#availabilityStore.selectedAvailabilityFromDate(),
      hour: this.#party.partyHourFilter(),
    };
  }

  /**
   * Puts back what the date sheet opened on, writing only what moved: the window first (it reloads the days
   * and lands on their first one), then the day, then the hour. The window waits for its fetch to end, since
   * the day it lands on resets the hour; the day writes the store at once, so the hour follows it straight away.
   * No event: the operator picked nothing.
   */
  restoreDate(snapshot: PosPartyDateSnapshot): void {
    const { fromDate } = snapshot;

    this.#pendingRestore?.unsubscribe();
    this.#pendingRestore = defer(() =>
      fromDate !== null && fromDate !== this.#availabilityStore.selectedAvailabilityFromDate()
        ? this.#untilFetchEnds(() => this.#availability.handleShowAvailabilityFromDateChange(fromDate))
        : EMPTY,
    )
      .pipe(takeUntilDestroyed(this.#destroyRef))
      .subscribe({
        complete: () => {
          this.#pendingRestore = null;
          this.#restoreDayAndHour(snapshot);
        },
      });
  }

  #restoreDayAndHour({ date, hour }: PosPartyDateSnapshot): void {
    if (date !== null && date !== this.#availabilityStore.selectedDate()) {
      this.#availability.selectDateFromSelector(date);
    }

    if (hour !== this.#party.partyHourFilter()) {
      this.#party.selectPartyHour(hour);
    }
  }

  /**
   * Completes on the first settle after `start`, or when its fetch ends without one (failed or superseded).
   * The settle is armed before `start` so a synchronous (cached) one counts and the replay does not; the end
   * after it, so the end of the fetch `start` supersedes does not count.
   */
  #untilFetchEnds(start: () => void): Observable<never> {
    return new Observable<never>(subscriber => {
      let isArmed = false;
      const subscription = this.#ticketingState.sessionAvailableReady
        .pipe(
          filter(() => isArmed),
          take(1),
        )
        .subscribe({ complete: () => subscriber.complete() });

      isArmed = true;
      start();
      subscription.add(this.#availability.availabilityFlowEnded$.pipe(take(1)).subscribe({ complete: () => subscriber.complete() }));

      return subscription;
    });
  }
}
