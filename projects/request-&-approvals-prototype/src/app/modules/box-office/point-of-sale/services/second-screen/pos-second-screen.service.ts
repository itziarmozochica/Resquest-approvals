import { computed, inject, Injectable, Signal } from '@angular/core';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute } from '@angular/router';

import { IconProp } from '@fortawesome/fontawesome-svg-core';
import { CartSession } from '@fz-original/app/shared/models/cart/cart-session.model';
import { Cart } from '@fz-original/app/shared/models/cart/cart.model';
import { Plan } from '@fz-original/app/shared/models/plan/plan.model';
import { SecondScreenSeatingMapStorage } from '@fz-original/app/shared/models/seating-map/second-screen-seating-map-storage.model';
import { OptimizelyService } from '@fz-original/app/shared/optimizely/optimizely.service';
import { SeatingProviderEnum } from '@fz-original/app/shared/seating-selector/components/seating-selector/__data__/seating-provider.enum';
import { DualScreenStorageService } from '@fz-original/app/shared/services/dual-screen/dual-screen-storage.service';

import { OboSecondScreenSeatingMap } from '../../../obo-second-screen/models/seating-map/obo-second-screen-seating-map.model';
import { OboSecondScreenDataService } from '../../../obo-second-screen/services/obo-second-screen-data.service';
import { SecondScreenSeatingMapStorageService } from '../../../obo-second-screen/services/seating-map/second-screen-seating-map-storage.service';
import { applyUpgradeSeatingPricing, isUpgradeSeatingMode } from '../../../obo-second-screen/utils/upgrade-seating-pricing.util';
import { PosTicketingState } from '../../state/pos-ticketing.state';
import { PosAvailabilityService } from '../availability/pos-availability.service';
import { PosViewUpdateService } from '../pos-view-update/pos-view-update.service';

const getSeatIdsFromCartLines = (cartLines: CartSession[]): string[] =>
  cartLines
    .map((session: CartSession) => session.seats)
    .filter((seats): seats is string[] => seats != null)
    .flat();

const getSortedUniqueSessionIds = (sessionIds: number[]): number[] =>
  [...new Set(sessionIds)].sort((firstSessionId: number, secondSessionId: number) => firstSessionId - secondSessionId);

/**
 * Mirrors cart, plan, place and seating state onto the customer-facing second screen.
 *
 * `resetSecondScreenSeatingMapVisibility` routes through the deduping sync, which also keeps
 * `isSeatingMapFullscreen` (the eye-button icon) in step. Parity-locked: the `changePlan` and
 * contact-info-modal call sites deliberately do **not** update `isSeatingMapFullscreen` when they
 * set fullscreen state — {@link setSeatingMapFullscreen} keeps that asymmetry verbatim.
 */
@Injectable()
export class PosSecondScreenService {
  readonly #activatedRoute = inject(ActivatedRoute);
  readonly #availability = inject(PosAvailabilityService);
  readonly #dualScreenStorage = inject(DualScreenStorageService);
  readonly #optimizely = inject(OptimizelyService);
  readonly #seatingMapStorage = inject(SecondScreenSeatingMapStorageService);
  readonly #secondScreenData = inject(OboSecondScreenDataService);
  readonly #state = inject(PosTicketingState);
  readonly #viewUpdate = inject(PosViewUpdateService);

  /** Already a signal in legacy, so it stays one. Gates the fullscreen eye button. */
  readonly isDualScreenStoragePresent: Signal<boolean> = toSignal(this.#dualScreenStorage.observeContainsData(), {
    initialValue: this.#dualScreenStorage.containsData(),
  });

  /** Icon of the "mirror the seating map" toggle. */
  readonly seatingFullscreenButtonIcon: Signal<IconProp> = computed(() =>
    this.#state.isSeatingMapFullscreen() ? ['fas', 'eye-slash'] : ['fas', 'eye'],
  );

  constructor() {
    this.#secondScreenData.seatingMapHiddenByCustomerScreen$
      .pipe(takeUntilDestroyed())
      .subscribe(() => this.#state.isSeatingMapFullscreen.set(false));
  }

  clearHighlightedSeats(): void {
    this.#seatingMapStorage.removeSecondScreenSeatingMapStorage();
  }

  /** True when a second screen is paired — gates every sync below. */
  isSecondScreenActive(): boolean {
    return this.#dualScreenStorage.containsData();
  }

  isSeatingMapMirrorAvailable(): boolean {
    return this.isDualScreenStoragePresent() && this.#state.seatingProvider !== SeatingProviderEnum.ONEBOX;
  }

  /**
   * Hides the mirrored seating map. Called from `ngOnInit`, `ngOnDestroy`, `clickOnPayOneStep`
   * and the free-map load.
   */
  resetSeatingMapVisibility(): void {
    this.#syncSeatingMapVisibility(false);
  }

  /**
   * Back to the idle screen: drops the mirrored cart and the highlighted-seat storage. This is the
   * second-screen half of `clearCart`, the only path that reaches it in the OSS flow, and it is
   * unconditional there. Parity-locked: the legacy `shouldResetOboSecondScreenToStandBy` gate is
   * intentionally absent — adding it would regress the clear-cart path after a settled payment,
   * which sets the flag to `false`.
   */
  resetToStandBy(): void {
    this.#secondScreenData.resetCart();
    this.clearHighlightedSeats();
  }

  /**
   * Raw visibility setter. Deliberately leaves `isSeatingMapFullscreen` untouched — see the class
   * note on the legacy asymmetry.
   */
  setSeatingMapFullscreen(isFullscreen: boolean): void {
    this.#secondScreenData.setIsSeatingMapVisible(isFullscreen);
  }

  /** Mirrors the seats currently highlighted on the operator's map. */
  syncHighlightedSeats(): void {
    if (!this.#dualScreenStorage.containsData()) {
      return;
    }

    // The customer screen renders the highlighted seats as a Seats.io chart. A OneBox (real-time) map has
    // neither a Seats.io event key nor Seats.io seat ids, so the payload would be keyless and the previous
    // plan's keys could survive into the fallback: nothing is mirrored.
    if (!this.#availability.hasPlanSeating() || this.#state.seatingProvider === SeatingProviderEnum.ONEBOX) {
      this.clearHighlightedSeats();
      return;
    }

    const eventKey = this.#state.seatingMapState?.event;

    const storedPayload = this.#seatingMapStorage.getSecondScreenSeatingMapStoragePayload();

    const seats = getSeatIdsFromCartLines(
      this.#getCurrentPlanCartLines(this.#state.nonConfirmedCart ?? this.#state.cart ?? new Cart()),
    ).filter(Boolean);
    const sessionIds = this.#getSeatingSessionIdsForSecondScreen();
    const payload: SecondScreenSeatingMapStorage = {
      channels: this.#state.seatingMapState?.channels ?? storedPayload?.channels,
      eventKey: eventKey ?? storedPayload?.eventKey,
      providerPublicKey: this.#state.seatingMapState?.provider_public_key ?? storedPayload?.providerPublicKey,
      seats: [...new Set(seats)],
      sessionIds,
    };
    this.#seatingMapStorage.setSecondScreenSeatingMapStoragePayload(payload);
  }

  // ───────────────────────────────────────── seating mirroring ────────────────────────────────────

  /** Eye button. */
  toggleSeatingMapVisibility(): void {
    const isVisible = !this.#state.isSeatingMapFullscreen();
    if (isVisible && !this.isSeatingMapMirrorAvailable()) {
      return;
    }
    if (isVisible) {
      this.#secondScreenData.setSeatingMap(this.#buildSeatingMapToSync());
      this.syncHighlightedSeats();
    }
    this.#syncSeatingMapVisibility(isVisible);
  }

  /** Called from every cart write path. */
  updateCart(): void {
    this.#secondScreenData.setCart(this.#buildCartToSync(), this.#buildSeatingMapToSync());
    const isEmpty = !this.#state.nonConfirmedCart || this.#state.nonConfirmedCart.getNumberOfTicketAndProductCounts() === 0;
    if (isEmpty) {
      this.clearHighlightedSeats();
    } else {
      this.syncHighlightedSeats();
    }
  }

  /** Called when a payment starts/settles. */
  updatePayment(): void {
    this.#secondScreenData.finishPayment();
  }

  /** Called on setup/place resolution. */
  updatePlace(placeId?: number): void {
    this.#secondScreenData.setPlace(placeId);
    this.#viewUpdate.markForCheck();
  }

  /** Called on plan selection. */
  updatePlan(plan: Plan): void {
    this.#secondScreenData.setPlan(plan);
  }

  /**
   * The copy of the cart the customer screen renders.
   *
   * `upgrade_seating` mode zeroes the seating lines and returns early — no tax is disclosed there.
   * Otherwise the confirmed cart's `taxItems` are overlaid on a clone of `nonConfirmedCart`, which
   * is where the backend-computed tax lives, together with the total already shown on the Pay
   * button. The overlay is gated on the confirmed cart still representing the live selection, so
   * the tax row self-invalidates the moment the cashier edits the cart and comes back once the
   * cart is confirmed again. `nonConfirmedCart` itself is never mutated.
   */
  #buildCartToSync(): Cart | null {
    const upgradeSessionTypeIds = new Set(this.#getOptimizelyUpgradeSessionTypeIds());
    if (isUpgradeSeatingMode(this.#activatedRoute.snapshot.queryParams as Record<string, string | undefined>)) {
      return applyUpgradeSeatingPricing(this.#state.nonConfirmedCart, { upgradeSessionTypeIds });
    }
    if (this.#state.nonConfirmedCart === null) {
      return null;
    }
    const cartToSync = this.#state.nonConfirmedCart.clone();
    const confirmedCart = this.#state.cart;
    if (confirmedCart != null && confirmedCart.hasSameContent(this.#state.nonConfirmedCart)) {
      cartToSync.taxItems = confirmedCart.taxItems != null ? [...confirmedCart.taxItems] : undefined;
      cartToSync.total = this.#state.cartTotalMoney ?? cartToSync.total;
    } else {
      cartToSync.taxItems = undefined;
    }
    return cartToSync;
  }

  #buildSeatingMapToSync(): OboSecondScreenSeatingMap {
    const cart = this.#state.nonConfirmedCart;
    const sessionIds = cart === null ? [] : this.#getCurrentPlanCartLines(cart).map(cartLine => cartLine.sessionId);
    return {
      provider: this.#availability.hasPlanSeating() ? this.#state.seatingProvider : undefined,
      sessionIds: [...new Set(sessionIds)],
    };
  }

  #getCurrentPlanCartLines(cart: Cart): CartSession[] {
    const cartLines = Array.from(cart.sessionItemsByDatetime?.values() ?? []).flat();
    const currentPlanId = this.#getMultiPlanCurrentPlanId();
    if (currentPlanId === null) {
      return cartLines;
    }
    return cartLines.filter(cartLine => cartLine.mainPlanId == null || cartLine.mainPlanId === currentPlanId);
  }

  #getMultiPlanCurrentPlanId(): number | null {
    return this.#state.multiPlanCartEnabled ? (this.#state.selectedPlan?.id ?? null) : null;
  }

  /**
   * Session types that count as paid seating upgrades, so `upgrade_seating` mode can zero out
   * everything else on the customer screen. Flag: `modify_order_with_seating_through_new_pos`,
   * variable `session_type_ids_considered_as_seating_upgrades`.
   */
  #getOptimizelyUpgradeSessionTypeIds(): number[] {
    return (
      this.#optimizely.getFeatureVariableJSON<{ session_type_ids: number[] }>(
        'modify_order_with_seating_through_new_pos',
        'session_type_ids_considered_as_seating_upgrades',
      )?.session_type_ids ?? []
    );
  }

  /**
   * Session ids whose seats the second screen should highlight: the selected timeslot's sessions,
   * falling back to every regular session when nothing is selected yet.
   */
  #getSeatingSessionIdsForSecondScreen(): number[] {
    const selectedDatetimeSessionIds = (this.#state.selectedSession?.selectedDatetime?.sessionAvailabilityList ?? [])
      .map(session => session.id)
      .filter((sessionId): sessionId is number => typeof sessionId === 'number');
    if (selectedDatetimeSessionIds.length > 0) {
      return getSortedUniqueSessionIds(selectedDatetimeSessionIds);
    }

    const fallbackSessionIds = this.#state.regularSessionAvailabilitySummaryByDateList
      .flatMap(summaryByDate => summaryByDate.sessionAvailabilityByDatetimeList)
      .flatMap(datetimeAvailability => datetimeAvailability.sessionAvailabilityList)
      .map(session => session.id)
      .filter((sessionId): sessionId is number => typeof sessionId === 'number');

    return getSortedUniqueSessionIds(fallbackSessionIds);
  }

  /** Deduped so a redundant toggle does not re-notify the second screen. */
  #syncSeatingMapVisibility(isVisible: boolean): void {
    if (this.#state.isSeatingMapFullscreen() === isVisible) {
      return;
    }
    this.#state.isSeatingMapFullscreen.set(isVisible);
    this.setSeatingMapFullscreen(isVisible);
  }
}
