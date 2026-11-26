import { DestroyRef, inject, Injectable } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute } from '@angular/router';

import { OnsiteSetup, ShiftStrategyEnum } from '@fz-original/app/modules/box-office/shared/models/onsite-setup';
import { OnsiteSetupsStorageService } from '@fz-original/app/modules/box-office/shared/services/onsite-setups/onsite-setups-storage.service';
import {
  ActiveShift,
  ShiftsActionsEnum,
} from '@fz-original/app/modules/box-office/ticketing/components/start-end-shift/start-end-shift.component';
import { FzTrackingService } from '@fz/fz-tracking/src/public-api';
import { EMPTY, filter, fromEvent, map, mergeMap, Observable, of, take, takeUntil } from 'rxjs';

import { OSS_SHIFT_ACTION_EVENT_KEY } from '../../../one-stop-shop/components/oss-shift-widget/oss-shift-action-event-key';
import { OSS_SHIFT_READY_EVENT_KEY } from '../../../one-stop-shop/components/oss-shift-widget/oss-shift-ready-event-key';
import { OSS_SHIFT_REQUEST_EVENT_KEY } from '../../../one-stop-shop/components/oss-shift-widget/oss-shift-request-event-key';
import { OSS_SHIFT_START_CANCELLED_EVENT_KEY } from '../../../one-stop-shop/components/oss-shift-widget/oss-shift-start-cancelled-event-key';
import { posCheckoutShiftCloseModal } from '../../../one-stop-shop/tracking/events/pos-checkout-shift-close-modal.event';
import { posCheckoutShiftShowModal } from '../../../one-stop-shop/tracking/events/pos-checkout-shift-show-modal.event';
import { PosTicketingState } from '../../state/pos-ticketing.state';
import { toActiveShift } from '../adapters/active-shift.adapter';
import { PosCartService } from '../cart/pos-cart.service';
import { PosUiPortService } from '../pos-ui-port/pos-ui-port.service';
import { PosViewUpdateService } from '../pos-view-update/pos-view-update.service';
import { PosSeatingService } from '../seating/pos-seating.service';
import { TicketingCoreService } from '../ticketing-core/ticketing-core.service';

/** Outcome of comparing the open shift against the setup id carried by the URL. */
export interface ShiftMismatchResolution {
  /** `true` when a shift is open on a *different* onsite setup than the one the URL asks for. */
  isMismatch: boolean;
  /** The setup that must actually be loaded: the open shift's on mismatch, the URL's otherwise. */
  targetOnsiteSetupId: string;
}

/**
 * Cashier shift: active shift tracking, the three confirmation branches and mismatch detection.
 *
 * The shift *widget* is mounted by the app header, outside the ticketing page and unaffected by the
 * rearchitect flag, so the `window` `CustomEvent` protocol it shares with this strategy must stay
 * unchanged. No shift API call is made here — the widget owns the fetch. The one exception is
 * {@link resolveShiftMismatch}, which mirrors the wrapper's own `getOpenedShift()` probe.
 */
@Injectable()
export class PosShiftService {
  readonly #activatedRoute = inject(ActivatedRoute);
  readonly #cart = inject(PosCartService);
  readonly #core = inject(TicketingCoreService);
  readonly #destroyRef = inject(DestroyRef);
  readonly #onsiteSetupsStorage = inject(OnsiteSetupsStorageService);
  readonly #seating = inject(PosSeatingService);
  readonly #state = inject(PosTicketingState);
  readonly #tracking = inject(FzTrackingService);
  readonly #ui = inject(PosUiPortService);
  readonly #viewUpdate = inject(PosViewUpdateService);

  // ─────────────────────────────────────────── active shift ───────────────────────────────────────

  /**
   * `boxOffice.notCompatibleShiftModal`. Accepting ends the current shift, so the caller is told
   * **not** to continue: the emitted boolean is the negation of the operator's answer. Intentional:
   * no `posCheckoutShift*` tracking event fires here.
   */
  askUserCloseCurrentShift(): Observable<boolean> {
    return this.#openShiftConfirmationModal('boxOffice.notCompatibleShiftModal').pipe(
      map(value => {
        if (value) {
          this.#emitShiftAction(ShiftsActionsEnum.end);
        }
        return !value;
      }),
    );
  }

  /**
   * `boxOffice.noShiftStartedModal`. Accepting opens a shift and stops the flow; declining continues
   * without one. `posCheckoutShiftCloseModal` fires on **both** answers here — unlike
   * {@link askUserOpenMandatoryShift}, which only tracks the accept branch. Parity-locked: the
   * asymmetry is intentional.
   */
  askUserContinueWithoutShift(): Observable<boolean> {
    this.#tracking.track(posCheckoutShiftShowModal({ shiftType: 'optional' }));

    return this.#openShiftConfirmationModal('boxOffice.noShiftStartedModal').pipe(
      map(value => {
        this.#tracking.track(posCheckoutShiftCloseModal({ shiftType: 'optional' }));
        if (value) {
          this.#emitShiftAction(ShiftsActionsEnum.start);
        }
        return !value;
      }),
    );
  }

  /** `boxOffice.shiftStartedMandatoryModal`. */
  askUserOpenMandatoryShift(): Observable<boolean> {
    this.#tracking.track(posCheckoutShiftShowModal({ shiftType: 'required' }));

    return this.#openShiftConfirmationModal('boxOffice.shiftStartedMandatoryModal').pipe(
      map(value => {
        if (value) {
          this.#tracking.track(posCheckoutShiftCloseModal({ shiftType: 'required' }));
          this.#emitShiftAction(ShiftsActionsEnum.start);
        }
        return value;
      }),
    );
  }

  /**
   * Asks the header shift widget to re-broadcast the shift it already holds. The widget answers with
   * `OSS_SHIFT_READY_EVENT_KEY`, which {@link initialiseActiveShiftEvents} turns into
   * {@link setActiveShift}.
   */
  checkExistingActiveShift(): void {
    const requestShiftEvent = new CustomEvent(OSS_SHIFT_REQUEST_EVENT_KEY);
    window.dispatchEvent(requestShiftEvent);
  }

  // ───────────────────────────────────────── validation branches ──────────────────────────────────

  /**
   * Deep-link case: `?onsiteSetupId=` points at a setup that does not match the operator's open
   * shift. Standalone entry point — reads the URL and the stored setup itself, so it can be fired
   * without touching setup resolution. Callers that also want the resolved target id should compose
   * {@link resolveShiftMismatch} instead, so the shift is fetched once.
   */
  detectShiftMismatch(): void {
    const onsiteSetupIdFromUrl = this.#activatedRoute.snapshot.queryParams['onsiteSetupId'] as string | undefined;
    const currentOnsiteSetup: OnsiteSetup | null = this.#onsiteSetupsStorage.getConfiguration();
    const shouldLoadFromUrl = Boolean(onsiteSetupIdFromUrl) && currentOnsiteSetup?.id !== onsiteSetupIdFromUrl;

    if (!shouldLoadFromUrl) {
      return;
    }

    this.resolveShiftMismatch(onsiteSetupIdFromUrl as string)
      .pipe(take(1), takeUntilDestroyed(this.#destroyRef))
      // Intentional: probe failures are swallowed (falls back to plain setup resolution);
      // without this handler they surface as unhandled RxJS errors.
      .subscribe({ error: () => undefined });
  }

  /**
   * Wires the cross-component shift request/ready events. Registered once, so
   * `activeShiftOneStepReady$` emits once per resolved shift.
   *
   * The ready listener MUST be registered before the request is dispatched: `window.dispatchEvent`
   * invokes listeners synchronously, so when the header widget already holds a shift (e.g. a page
   * remount after a purchase) its reply fires during the request dispatch and would be lost.
   */
  initialiseActiveShiftEvents(): void {
    fromEvent<CustomEvent>(window, OSS_SHIFT_READY_EVENT_KEY)
      .pipe(takeUntilDestroyed(this.#destroyRef))
      .subscribe((event: CustomEvent) => {
        const activeShift = event.detail.activeShift as ActiveShift;
        this.setActiveShift(activeShift);
      });

    this.checkExistingActiveShift();
  }

  /**
   * The mismatch probe itself: compares the open shift's `onsiteSetupId` with the one the URL asks
   * for and resolves to the setup that must actually be loaded. Errors are left to the caller, which
   * falls back to plain setup resolution on failure.
   */
  resolveShiftMismatch(onsiteSetupIdFromUrl: string): Observable<ShiftMismatchResolution> {
    return this.#core.getOpenedShift().pipe(
      map(openedShift => {
        const isMismatch = Boolean(openedShift?.onsiteSetupId && openedShift.onsiteSetupId !== onsiteSetupIdFromUrl);
        const targetOnsiteSetupId = (isMismatch ? openedShift?.onsiteSetupId : onsiteSetupIdFromUrl) as string;

        if (isMismatch) {
          const activeShift = toActiveShift(openedShift);
          if (activeShift) {
            this.#state.shiftMismatch$.next(activeShift);
          }
          this.#viewUpdate.markForCheck();
        }

        return { isMismatch, targetOnsiteSetupId };
      }),
    );
  }

  /** Widget handed us the resolved shift. */
  setActiveShift(shift: ActiveShift): void {
    this.#state.activeShift.set(shift);
    this.#state.activeShiftReady = true;
    this.#state.activeShiftOneStepReady$.next();
    if (!this.#state.onsiteSetupSelected) {
      this.#state.activeShiftReady$.next(shift);
    }
  }

  /**
   * Pre-add-to-cart gate: continues straight through when shifts are disabled or the open shift's
   * currency matches, otherwise asks the operator. The resume calls target `PosCartService` and
   * `PosSeatingService` directly because the gate itself lives one level up, on
   * `PointOfSaleTicketing.addSessionsToCart()` — neither body may re-enter this method.
   */
  showShiftModal(): void {
    const hasCompatibleActiveShift = this.#state.currency === this.#state.activeShift()?.currency;

    if (!this.#state.hasShiftsEnabled || hasCompatibleActiveShift) {
      this.#resumeAddToCart();
      return;
    }

    if (!this.#state.activeShift()) {
      if (this.#state.onsiteSetupSelected.shift_strategy === ShiftStrategyEnum.mandatory) {
        this.askUserOpenMandatoryShift()
          .pipe(takeUntilDestroyed(this.#destroyRef), filter(Boolean))
          .subscribe(() => this.#resumeAddToCart());
      } else {
        this.askUserContinueWithoutShift()
          .pipe(takeUntilDestroyed(this.#destroyRef), filter(Boolean))
          .subscribe(() => this.#resumeAddToCart());
      }
    } else if (!hasCompatibleActiveShift) {
      this.askUserCloseCurrentShift().pipe(takeUntilDestroyed(this.#destroyRef)).subscribe();
    }
  }

  /** Pre-payment gate inside the purchase pipeline. */
  validateShift(): Observable<void> {
    const hasCompatibleActiveShift = this.#state.currency === this.#state.activeShift()?.currency;

    if (!this.#state.hasShiftsEnabled || hasCompatibleActiveShift) {
      return of(void 0);
    }

    if (!this.#state.activeShift()) {
      const shiftIsMandatory = this.#state.onsiteSetupSelected.shift_strategy === ShiftStrategyEnum.mandatory;
      const shiftReady$ = this.#state.activeShiftOneStepReady$.pipe(takeUntil(fromEvent(window, OSS_SHIFT_START_CANCELLED_EVENT_KEY)));
      if (shiftIsMandatory) {
        return this.askUserOpenMandatoryShift().pipe(mergeMap(confirmed => (confirmed ? shiftReady$ : EMPTY)));
      }
      return this.askUserContinueWithoutShift().pipe(mergeMap(confirmed => (confirmed ? of(void 0) : shiftReady$)));
    }

    if (!hasCompatibleActiveShift) {
      return this.askUserCloseCurrentShift().pipe(mergeMap(() => EMPTY));
    }

    return EMPTY;
  }

  /** Asks the widget to open its start/end shift modal. */
  #emitShiftAction(shiftAction: string): void {
    const ossShiftActionEvent = new CustomEvent(OSS_SHIFT_ACTION_EVENT_KEY, {
      detail: { shiftAction },
    });
    window.dispatchEvent(ossShiftActionEvent);
  }

  // ──────────────────────────────────────────── mismatch ─────────────────────────────────────────

  /**
   * Routes through the UI port: the component owns the modal, this method only names the
   * translation prefix and reads the resulting boolean back.
   */
  #openShiftConfirmationModal(translationPrefix: string): Observable<boolean> {
    return this.#ui.request('confirm', { translationPrefix }).pipe(take(1));
  }

  /** The free map replaces add-to-cart when the selection is general admission. */
  #resumeAddToCart(): void {
    if (this.#state.manageAsFreeSeatingMap) {
      this.#seating.generateFreeSeatingMap();
      return;
    }
    this.#cart.addSessionsToCart();
  }
}
