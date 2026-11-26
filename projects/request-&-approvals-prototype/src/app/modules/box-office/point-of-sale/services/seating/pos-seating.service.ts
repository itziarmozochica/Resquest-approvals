import { DestroyRef, inject, Injectable, Injector } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { DatadogLogService } from '@fz-original/app/core/error/datadog/logger/datadog-log.service';
import { cartWithOnlyOtherPlanSessions } from '@fz-original/app/shared/components/ticketing/ticketing.utils';
import { BaseResponse } from '@fz-original/app/shared/models/base-response';
import { CartSession } from '@fz-original/app/shared/models/cart/cart-session.model';
import { Cart } from '@fz-original/app/shared/models/cart/cart.model';
import { Money } from '@fz-original/app/shared/models/money.model';
import { FreeSeatingMapQuery } from '@fz-original/app/shared/models/seating-map/free-seating-map-query';
import { FreeSeatingMap } from '@fz-original/app/shared/models/seating-map/free-seating-map.model';
import { SeatingMapQuery } from '@fz-original/app/shared/models/seating-map/seating-map-query';
import { SeatingMap } from '@fz-original/app/shared/models/seating-map/seating-map.model';
import { Seat } from '@fz-original/app/shared/models/session-availability/seat.model';
import { SessionAvailability } from '@fz-original/app/shared/models/session-availability/session-availability.model';
import { FreeSeatResponse } from '@fz-original/app/shared/seating-selector/components/seating-selector/__data__/free-seat-response.model';
import { SeatInfo } from '@fz-original/app/shared/seating-selector/components/seating-selector/__data__/seat-info.model';
import { SeatingProviderEnum } from '@fz-original/app/shared/seating-selector/components/seating-selector/__data__/seating-provider.enum';
import { SeatingSelectorFinalizedResponse } from '@fz-original/app/shared/seating-selector/components/seating-selector/__data__/seating-selector-finalized-response.model';
import {
  ExternalItem,
  RealTimeSelection,
} from '@fz-original/app/shared/seating-selector/services/seating-selector-messenger/messages/real-time-selection-change-message';
import { Channel } from '@fz-original/app/shared/services/session-availability/channel.enum';
import { SessionSelectorType } from '@fz-original/app/shared/services/session-availability/session-selector-type.enum';
import { EMPTY, Observable, of, Subject, Subscription, throwError } from 'rxjs';
import { buffer, catchError, debounceTime, filter, finalize, groupBy, mergeMap, take } from 'rxjs/operators';

import { OssSeatingSelectionSnapshot } from '../../../one-stop-shop/models';
import { PosTicketingState } from '../../state/pos-ticketing.state';
import { PosAvailabilityService } from '../availability/pos-availability.service';
import { PosCartService } from '../cart/pos-cart.service';
import { PosUiPortService } from '../pos-ui-port/pos-ui-port.service';
import { PosViewUpdateService } from '../pos-view-update/pos-view-update.service';
import { PosSecondScreenService } from '../second-screen/pos-second-screen.service';
import { PosTicketSelectionService } from '../ticket-selection/pos-ticket-selection.service';
import { TicketingCoreService } from '../ticketing-core/ticketing-core.service';

/**
 * The seating map emits one add/remove per seat; consecutive seat changes within this window are
 * aggregated into a single quantity-change event.
 */
const seatTrackingBatchMs = 700;
/** Ceiling for the widget's `session-started` after a real-time re-`initialize` (measured 1.6 to 3.4 s locally). */
const realTimeSessionStartFallbackMs = 5000;

/** Batched seat quantity change. */
interface SeatTrackingEvent {
  newCount: number;
  previousCount: number;
  sessionId: number | string;
}

/**
 * Reserved seating and general-admission (free) maps: load, seat bookkeeping, hold tokens and the
 * release paths.
 */
@Injectable()
export class PosSeatingService {
  readonly #core = inject(TicketingCoreService);
  readonly #datadog = inject(DatadogLogService);
  readonly #destroyRef = inject(DestroyRef);
  readonly #injector = inject(Injector);
  readonly #secondScreen = inject(PosSecondScreenService);
  readonly #state = inject(PosTicketingState);
  readonly #ui = inject(PosUiPortService);
  readonly #viewUpdate = inject(PosViewUpdateService);

  readonly #realTimeBasketExpired$ = new Subject<void>();
  /**
   * Emits when the OneBox basket of the real-time map expires and its line is emptied. The purchase
   * pipeline listens while it has not engaged the payment yet, so a basket that expires with the
   * contact dialog or the cash calculator open is never paid (GIT-1564).
   */
  readonly realTimeBasketExpired$ = this.#realTimeBasketExpired$.asObservable();
  readonly #seatTrackingTrigger$ = new Subject<SeatTrackingEvent>();
  /** The free-map load in flight; a newer selection cancels it so a late response cannot mount the wrong session. */
  #freeMapLoad: Subscription | null = null;
  /**
   * True once the real-time response for the current load context has been applied, so the `initialize`
   * the widget answers with `session-started` belongs to that context. A `session-started` from the previous
   * map, arriving while the next load is still in flight, finds it false and is ignored.
   */
  #isRealTimeSessionStartExpected = false;
  #realTimeSessionStartFallback: ReturnType<typeof setTimeout> | null = null;

  /**
   * Whether a real-time map answered `finalized` since the last `cart-error` — see {@link sendCartError}.
   */
  #basketHandedToCheckout = false;
  /** Set by `PointOfSaleTicketing.registerSeatingViewHandlers` — see {@link finishSeating}. */
  #finishSeatingHandler: (() => void) | null = null;
  /** Set by `PointOfSaleTicketing.registerSeatingViewHandlers` — see {@link hasSeatingView}. */
  #hasSeatingViewPredicate: (() => boolean) | null = null;
  /** Set by `PointOfSaleTicketing.registerSeatingViewHandlers` — see `releaseCartLineSeatingSelection`. */
  #releaseSeatsByReferenceHandler: ((seatReferences: string[]) => void) | null = null;
  /** Set by `PointOfSaleTicketing.registerSeatingViewHandlers` — see `releaseDroppedSeatingSelection`. */
  #releaseSeatsHandler: (() => void) | null = null;
  /** Set by `PointOfSaleComponent` through {@link registerSendCartErrorHandler} (lego path) — see {@link sendCartError}. */
  #sendCartErrorHandler: (() => void) | null = null;

  constructor() {
    this.#setupSeatTrackingBatch();
    this.#destroyRef.onDestroy(() => this.#forgetRealTimeSessionStart());
  }

  /**
   * Snapshots the current seating selection before a date/timeslot change clears it. The seat
   * references, the hold tokens and the registered release handles are the only way back to the
   * provider once the state maps are wiped, so they must all be taken while they still exist.
   */
  captureSeatingSelectionSnapshot(): OssSeatingSelectionSnapshot | null {
    if (!this.#state.manageAsFreeSeatingMap) {
      return null;
    }
    const seatReferencesBySessionId = new Map<string, string[]>();
    this.#state.selectedTicketsSeatsBySessionId.forEach((seatInfos, sessionId) => {
      const seatReferences = seatInfos.map(seat => seat.seatReference).filter((reference): reference is string => Boolean(reference));
      if (seatReferences.length > 0) {
        seatReferencesBySessionId.set(sessionId, seatReferences);
      }
    });
    if (seatReferencesBySessionId.size === 0) {
      return null;
    }
    return {
      expireHoldToken: this.#releaseSeatsHandler,
      holdTokensBySessionId: new Map(this.#state.seatingHoldTokensBySessionId),
      releaseSeatsByReference: this.#releaseSeatsByReferenceHandler,
      seatReferencesBySessionId,
      state: this.#state.seatingMapState,
    };
  }

  /**
   * Clears the cached map-load context so the next request refetches, and drops the free-map load in
   * flight: the selection that calls this (date, plan or place change, restore) has moved on, so a late
   * response must not publish the previous session onto whatever map is mounted by then.
   */
  clearLastSeatingMapLoadContext(): void {
    this.#state.lastSeatingMapLoadContext = null;
    this.#cancelFreeMapLoad();
  }

  /** Persists the confirmed seating selection into the cart. */
  confirmSeating(data?: SeatingSelectorFinalizedResponse): void {
    this.#state.isLoadingCart = true;
    this.#state.seatingToken = data?.holdToken ?? null;
    if (data?.holdToken) {
      this.storeHoldTokenForSessions(data.holdToken);
      this.#basketHandedToCheckout = this.#state.isRealTimeSeating;
    }
    this.#cart
      .createOrUpdateCart()
      .pipe(
        mergeMap(response => this.#checkResponseData(response)),
        takeUntilDestroyed(this.#destroyRef),
        finalize(() => (this.#state.isLoadingCart = false)),
      )
      .subscribe({
        error: (response: BaseResponse<unknown> | null) => {
          this.sendCartError();
          this.#showModalError(response?.error?.message);
          this.#state.confirmSeatingMap$.complete();
        },
        next: response => {
          this.#cart.createOrUpdateCartResponse(response, this.#hasSeatingInNonConfirmedCart());
          this.#state.confirmSeatingMap$.next();
        },
      });
  }

  /**
   * Imperative "finish selection" on the seating map. `SeatingSelectorComponent` is a view handle, so
   * `PointOfSaleComponent` registers the callback here rather than this service holding a `ViewChild`.
   */
  finishSeating(): void {
    this.#finishSeatingHandler?.();
  }

  /**
   * Hands the basket back to a real-time map after the checkout failed past its `finalized` answer.
   * The OneBox widget forgets its basket token when it answers `request-finish` and only restores it on
   * `cart-error`; without this message the seats stay held in OneBox with no way to pay them again or
   * release them from the POS. The widget writes back the token it saved on the last `request-finish`,
   * so a `cart-error` with no `finalized` in between could overwrite a newer live token with a stale
   * one: it is only forwarded once per `finalized`, and that flag is what makes the payment failure
   * paths safe to call it repeatedly. Classic maps ignore the message, so it is only sent in real time,
   * and a call that finds no real-time map disarms the flag so no later map inherits it.
   */
  sendCartError(): void {
    if (!this.#state.isRealTimeSeating || !this.#basketHandedToCheckout) {
      this.#basketHandedToCheckout = false;
      return;
    }
    this.#sendCartErrorHandler?.();
    this.#basketHandedToCheckout = false;
  }

  /**
   * Free-map entry point — the OSS "add to cart" action when the plan is sold through a
   * general-admission map. Parity-locked: it does not invalidate `#lastSeatingMapLoadContext` before
   * fetching, which would make the free map refetch on every add-to-cart instead of reusing the
   * cached context. That invalidation belongs to `PosCartService.restoreToBeginning` and
   * {@link clearLastSeatingMapLoadContext}.
   */
  generateFreeSeatingMap(): void {
    this.setPreviousAndNextSteps(this.#state.manageAsFreeSeatingMap);
    this.#state.seatingMapState = null;
    this.#state.seatingMapUrl = null;
    this.#state.seatingToken = null;
    this.#state.isRealTimeMapAwaitingSession = false;
    this.loadFreeSeatingMap().subscribe({
      error: (response: BaseResponse<unknown> | null) => this.#showModalError(response?.error?.message),
      next: () => {
        this.#goToNextStep();
      },
    });
  }

  /**
   * Whether a seating map is currently mounted.
   *
   * Parity-locked: `PosCartService.handleCartContent` needs it to abort the payment pipeline with
   * `EMPTY` when the free-seating branch has no map to confirm — without the check the pipeline would
   * wait on `confirmSeatingMap$` forever.
   */
  hasSeatingView(): boolean {
    return this.#hasSeatingViewPredicate?.() ?? false;
  }

  // ───────────────────────────────────────────── map load ─────────────────────────────────────────

  /**
   * General-admission map. Every loaded map starts a new widget session, so the basket of a previous
   * `finalized` is gone and the {@link sendCartError} flag is reset here.
   */
  loadFreeSeatingMap(): Observable<BaseResponse<FreeSeatingMap>> {
    this.#secondScreen.resetSeatingMapVisibility();

    const seating: Seat | null = this.#getSeatedSessionOfSelectedTimeslot()?.seating ?? null;
    const partner = this.#state.partner;
    if (seating == null || !partner) {
      this.#tearDownRealTimeMapLeftMounted();
      return EMPTY;
    }
    const freeSeatingMapQuery: FreeSeatingMapQuery = {
      channel: this.#state.channel,
      channelId: this.#state.channelId,
      isHidden: this.#state.isHidden,
      partnerId: partner.id,
      placeId: this.#state.selectedPlace.id,
      planId: this.#state.selectedPlan.id,
      seatingPoolId: seating.poolId!,
    };
    return this.#core.loadFreeSeatingMap(freeSeatingMapQuery).pipe(
      mergeMap((response: BaseResponse<FreeSeatingMap>) => {
        if (!response.data) {
          return throwError(() => response.error);
        }
        this.#state.seatingMapUrl = response.data.url;
        this.#state.seatingMapState = response.data.state;
        this.#basketHandedToCheckout = false;
        this.updateSeatingProvider();
        // A real-time response only re-`initialize`s the kept iframe: the widget still shows the previous
        // session until it reports `session-started`, which is what lifts the wait (`onRealTimeSessionStarted`),
        // with a timed fallback in case the widget never answers.
        if (this.#state.isRealTimeSeating) {
          this.#expectRealTimeSessionStart();
        } else {
          this.#state.isRealTimeMapAwaitingSession = false;
        }
        return of(response);
      }),
      catchError((error: unknown) => {
        this.#state.isRealTimeMapAwaitingSession = false;
        return throwError(() => error);
      }),
    );
  }

  /**
   * Free-map (re)load driven by the date selector.
   *
   * Skips the request when the map is already showing the same timeslot + seating pool and seats are
   * still held, which is what keeps tab switches from dropping the operator's selection.
   */
  loadOneStepFreeSeatingMap(): void {
    if (!this.#state.manageAsFreeSeatingMap) {
      this.#tearDownRealTimeMapLeftMounted();
      return;
    }
    if (!this.#state.selectedSession?.selectedDatetime?.sessionAvailabilityList) {
      this.#tearDownRealTimeMapLeftMounted();
      return;
    }

    const hasActiveSeats = (this.#state.selectedTicketsSeatsBySessionId?.size ?? 0) > 0;
    const currentContext = this.#getCurrentSeatingMapContext();
    const lastContext = this.#state.lastSeatingMapLoadContext;
    const sameContextAsLastLoaded =
      currentContext != null &&
      lastContext != null &&
      lastContext.datetime === currentContext.datetime &&
      lastContext.poolId === currentContext.poolId;

    if (this.#state.seatingMapUrl && hasActiveSeats && sameContextAsLastLoaded) {
      // Nothing is going to re-initialise the map, so it must not stay inert.
      this.#state.isRealTimeMapAwaitingSession = false;
      return;
    }
    // A newer selection cancels the load in flight: a late response for the previous date would
    // otherwise publish the previous session onto the kept real-time map and lift its overlay.
    this.#cancelFreeMapLoad();
    this.#freeMapLoad = this.loadFreeSeatingMap()
      .pipe(
        // Mirrored cdr call site.
        finalize(() => this.#viewUpdate.markForCheck()),
        takeUntilDestroyed(this.#destroyRef),
      )
      .subscribe({
        error: (error: BaseResponse<unknown> | null) => {
          this.#state.seatingMapUrl = null;
          this.#state.seatingMapState = null;
          this.#state.lastSeatingMapLoadContext = null;
          this.#secondScreen.clearHighlightedSeats();
          this.#showModalError(error?.error?.message);
        },
        next: (response: BaseResponse<FreeSeatingMap>) => {
          if (response && response.data) {
            this.#state.seatingMapUrl = response.data.url;
            this.#state.seatingMapState = response.data.state;
            this.#state.lastSeatingMapLoadContext = currentContext;
            this.#secondScreen.syncHighlightedSeats();
          } else {
            this.#state.seatingMapUrl = null;
            this.#state.seatingMapState = null;
            this.#state.lastSeatingMapLoadContext = null;
            this.#secondScreen.clearHighlightedSeats();
          }
        },
      });
  }

  /**
   * Reserved-seating map for the sessions in `nonConfirmedCart`.
   *
   * Only fetches when the next wizard step is the seating selector, which is why
   * {@link setPreviousAndNextSteps} has to run first (see the note on that method).
   */
  loadSeatingMap(): Observable<unknown> {
    if (this.#state.currentStep.nextStep === this.#state.seatingSelectorStep) {
      const partner = this.#state.partner;
      if (!partner) {
        return EMPTY;
      }
      const seatingMapQuery: SeatingMapQuery = {
        channel: this.#state.channelId || this.#state.channel,
        partnerId: partner.id,
        ...this.#state.nonConfirmedCart!.getSeatingInfo(),
      };
      return this.#core.loadSeatingMap(seatingMapQuery).pipe(
        mergeMap((response: BaseResponse<SeatingMap>) => {
          if (!response.data) {
            return throwError(() => response.error);
          }
          this.#state.seatingMapUrl = response.data.baseUrl;
          this.#state.seatingMapState = response.data.getState();
          this.#state.seatingToken = response.data.holdToken;
          if (response.data.holdToken) {
            this.storeHoldTokenForSessions(response.data.holdToken);
          }
          this.updateSeatingProvider();
          this.updateSeats(this.#state.nonConfirmedCart!, response.data.assignedSeats);
          return of(response);
        }),
      );
    }
    return of({});
  }

  /**
   * Called once the sale is settled, so no later `cart-error` restores the token of a consumed basket —
   * see {@link sendCartError}.
   */
  markBasketConsumed(): void {
    this.#basketHandedToCheckout = false;
  }

  /** Registered by `PointOfSaleTicketing.registerSeatingViewHandlers` from the component's ViewChild. */
  registerFinishSeatingHandler(handler: () => void): void {
    this.#finishSeatingHandler = handler;
  }

  /** Registered by `PointOfSaleTicketing.registerSeatingViewHandlers` from the component's ViewChild. */
  registerHasSeatingViewPredicate(predicate: () => boolean): void {
    this.#hasSeatingViewPredicate = predicate;
  }

  /** Registered by `PointOfSaleTicketing.registerSeatingViewHandlers` from the component's ViewChild. */
  registerReleaseSeatsByReferenceHandler(handler: (seatReferences: string[]) => void): void {
    this.#releaseSeatsByReferenceHandler = handler;
  }

  /**
   * Registered by `PointOfSaleTicketing.registerSeatingViewHandlers` from the component's ViewChild.
   * The facade keeps its own `#releaseSeatsHandler` field for the discard/plan-change paths it
   * sequences; this is the same closure, forwarded so the seating domain can expire a dropped token
   * without reaching back up to the facade.
   */
  registerReleaseSeatsHandler(handler: () => void): void {
    this.#releaseSeatsHandler = handler;
  }

  /**
   * Registered by `PointOfSaleComponent` directly from its ViewChild (a lego view handle, outside the
   * frozen `TicketingStrategy.registerSeatingViewHandlers` contract). Real time only, see {@link sendCartError}.
   */
  registerSendCartErrorHandler(handler: () => void): void {
    this.#sendCartErrorHandler = handler;
  }

  /**
   * Releases the seats held by a single cart line when its counter reaches zero. The
   * `releaseSeatsByReference` view handle is optional and must stay so: when the component has not
   * registered it (no seating map mounted), only the local bookkeeping is dropped.
   */
  releaseCartLineSeatingSelection(sessionId: number): void {
    const sessionIdStr = sessionId.toString();
    const seatInfos = this.#state.selectedTicketsSeatsBySessionId.get(sessionIdStr);
    if (!seatInfos?.length) {
      return;
    }
    const seatReferences = seatInfos.map(seat => seat.seatReference).filter((ref): ref is string => Boolean(ref));
    if (seatReferences.length > 0) {
      this.#releaseSeatsByReferenceHandler?.(seatReferences);
    }
    this.#state.selectedTicketsSeatsBySessionId.delete(sessionIdStr);
    this.#state.seatingHoldTokensBySessionId.delete(sessionIdStr);
  }

  /**
   * Releases the seats a date/timeslot change dropped, so they become selectable again straight away
   * instead of staying held until the provider expires the token.
   *
   * Two mechanisms, and they are not interchangeable: when no surviving session shares the dropped
   * hold token the whole token is expired backend-side (`releaseSeats`), which also covers the date
   * change tearing the map down in the same tick; when the token is shared (multiplan preserving
   * another plan's seats) only the dropped seat references are released through the mounted map.
   */
  releaseDroppedSeatingSelection(snapshot: OssSeatingSelectionSnapshot | null): void {
    if (snapshot === null) {
      return;
    }
    const survivingSessionIds = this.#getSessionIdsHoldingSeats();
    const droppedSessionIds = [...snapshot.seatReferencesBySessionId.keys()].filter(sessionId => !survivingSessionIds.has(sessionId));
    if (droppedSessionIds.length === 0) {
      return;
    }

    const survivingHoldTokens = new Set<string>();
    snapshot.holdTokensBySessionId.forEach((holdToken, sessionId) => {
      if (survivingSessionIds.has(sessionId)) {
        survivingHoldTokens.add(holdToken);
      }
    });
    const isHoldTokenShared = droppedSessionIds.some(sessionId => {
      const holdToken = snapshot.holdTokensBySessionId.get(sessionId) ?? snapshot.state?.hold_token;
      return holdToken != null && survivingHoldTokens.has(holdToken);
    });

    if (isHoldTokenShared) {
      const seatReferences = [...new Set(droppedSessionIds.flatMap(sessionId => snapshot.seatReferencesBySessionId.get(sessionId) ?? []))];
      snapshot.releaseSeatsByReference?.(seatReferences);
    } else {
      snapshot.expireHoldToken?.();
    }

    droppedSessionIds.forEach(sessionId => {
      this.#state.selectedTicketsSeatsBySessionId.delete(sessionId);
      this.#state.seatingHoldTokensBySessionId.delete(sessionId);
    });
  }

  /**
   * Drops the local hold-token bookkeeping — the route-leave / clear-all half of the release policy.
   *
   * Parity-locked: it deliberately does not hit the expiry endpoint. The backend release goes
   * through the seating-map view handle, which `PointOfSaleTicketing.releaseSeats()` invokes
   * immediately before calling this method; expiring each token here too would double-release. The
   * `pagehide` beacon is `TicketingCoreService.discardCartKeepalive`'s job.
   */
  releaseHoldTokens(): void {
    this.#state.seatingHoldTokensBySessionId = new Map();
  }

  /** Reserved-map seat pick. */
  selectSeats(seating: Seat): void {
    this.updateSeats(this.#state.cart!, seating ? seating.seats : [], true, seating?.category);
  }

  // ─────────────────────────────────────────── seat changes ───────────────────────────────────────

  /** Whether the given session of the selected timeslot is sold through a seating map. */
  sessionHasSeating(sessionId: number): boolean {
    const sessions = this.#state.selectedSession?.selectedDatetime?.sessionAvailabilityList ?? [];
    const session = sessions.find(s => s.id === sessionId);
    return session?.seating !== null && session?.seating !== undefined;
  }

  /**
   * Wires the seating step in and out of the purchase wizard — single owner. `PosCartService` calls
   * this rather than keeping a second copy, because the reserved-seating add-to-cart path needs it
   * too.
   *
   * Parity-locked: both call paths must keep running the no-seating branch's trailing `resetScroll()`.
   * It is unreachable from this strategy's own call site (which always passes
   * `manageAsFreeSeatingMap === true` and returns early) but reachable from the cart path.
   */
  setPreviousAndNextSteps(hasSeating?: boolean): void {
    if (hasSeating) {
      this.#state.ticketSelectorStep.nextStep = this.#state.seatingSelectorStep;
      this.#state.seatingSelectorStep.previousStep = this.#state.ticketSelectorStep;
      this.#state.seatingSelectorStep.nextStep = this.#state.lastSelectorStep;
      this.#state.lastSelectorStep.previousStep = this.#state.seatingSelectorStep;
      return;
    }
    this.#state.ticketSelectorStep.nextStep = this.#state.lastSelectorStep;
    this.#state.lastSelectorStep.previousStep = this.#state.ticketSelectorStep;
    this.#cart.resetScroll();
  }

  /**
   * Tears down a real-time map kept mounted across a date change when nothing is going to replace it:
   * the sessions request of the new date failed, so no free-map load follows and the map would stay
   * inert. Safe because the `delete-order` already went out with the date change.
   */
  tearDownRealTimeMapLeftMounted(): void {
    this.#tearDownRealTimeMapLeftMounted();
  }

  /**
   * Real-time (OneBox) map snapshot, sibling of {@link updateSeatsInCart}. The wrapper reports the
   * whole basket after every change, so the anchor session's entries are replaced, never incremented,
   * and the delta path stays untouched. Every item is attributed to the seated session of the selected
   * timeslot (the session the map was loaded for): the backend rebuilds the lines from the basket and
   * only needs the id to pass the schema. Unnumbered sectors report the same `seatReference` for every
   * entry, so the seats are kept as a list and never keyed by reference. An empty snapshot means the
   * basket is gone (`delete-order`, expiry), so there is nothing left for a `cart-error` to hand back.
   */
  setRealTimeSelection(selection: RealTimeSelection): void {
    if (selection.items.length === 0) {
      this.#basketHandedToCheckout = false;
    }
    this.#withMultiPlanPreservation(() => this.#applyRealTimeSelection(selection));
  }

  /**
   * The widget finished (re-)initialising its session. For a kept real-time map this is the moment the
   * previous session is really gone from the iframe, so the inert wait set by the date or timeslot change
   * ends here, not on the free-map response that merely sent the new `initialize`.
   */
  onRealTimeSessionStarted(): void {
    if (!this.#isRealTimeSessionStartExpected) {
      return;
    }
    this.#liftRealTimeWait();
  }

  /**
   * Drops the anchor session's real-time selection ahead of a date or timeslot change. The OneBox basket
   * belongs to that session and the reload deletes it, so its tickets, seats, token entry and cart line go
   * here while every other session keeps its own (multi-plan). The caller releases the snapshot it took
   * beforehand, which is what sends the `delete-order`. Returns whether the anchor held anything.
   */
  discardRealTimeSelection(): boolean {
    const anchorSession = this.#getSeatedSessionOfSelectedTimeslot();
    if (!anchorSession) {
      return false;
    }
    const sessionId = anchorSession.id.toString();
    if (!this.#state.selectedTicketsBySessionId.has(sessionId) && !this.#state.selectedTicketsSeatsBySessionId.has(sessionId)) {
      return false;
    }
    this.#withMultiPlanPreservation(() => {
      this.#replaceSelectedTickets(sessionId, this.#getSelectedSessionSeatingCategory(anchorSession.id), []);
      this.#replaceRealTimeHoldToken(sessionId, null, false);
      this.#state.hasSeatsSelected = [...this.#state.selectedTicketsSeatsBySessionId].some(([, seatInfos]) => seatInfos.length > 0);
      this.#state.nonConfirmedCart = this.#cart.getCart();
      this.#secondScreen.syncHighlightedSeats();
      this.#refreshCartTotal();
    });
    return true;
  }

  /** Copies a hold token onto every session in the non-confirmed cart. */
  storeHoldTokenForSessions(holdToken: string): void {
    this.#state.nonConfirmedCart?.sessionItemsByDatetime.forEach(sessions => {
      sessions.forEach(session => {
        const sessionId = session.sessionId.toString();
        if (!this.#state.seatingHoldTokensBySessionId.has(sessionId)) {
          this.#state.seatingHoldTokensBySessionId.set(sessionId, holdToken);
        }
      });
    });
  }

  /** Switches between reserved and free-map handling for the current selection. */
  updateFreeMapMode(): void {
    const seatingSelectionSnapshot = this.captureSeatingSelectionSnapshot();
    const isFreeMapSelector = this.#state.sessionSelectorType === SessionSelectorType.BY_FREE_SELECTION_MAP;
    const currentSelectedDatetimeHasSeating = this.#availability.selectedSessionHasSeating();
    const firstSummaryWithSeating = this.#state.regularSessionAvailabilitySummaryByDateList.find(summaryByDate =>
      summaryByDate.sessionAvailabilityByDatetimeList.some(datetimeAvailability =>
        datetimeAvailability.sessionAvailabilityList.some(session => session.seating !== null && session.seating !== undefined),
      ),
    );
    const firstDatetimeWithSeating = this.#state.selectedSession?.sessionAvailabilityByDatetimeList?.find(datetimeAvailability =>
      datetimeAvailability.sessionAvailabilityList.some(session => session.seating !== null && session.seating !== undefined),
    );
    if (
      isFreeMapSelector &&
      (!this.#state.selectedSession || !this.#state.selectedSession.selectedDatetime || !currentSelectedDatetimeHasSeating) &&
      firstSummaryWithSeating
    ) {
      this.#state.selectedSession = firstSummaryWithSeating;
      const firstDatetimeWithSeatingInSummary = firstSummaryWithSeating.sessionAvailabilityByDatetimeList.find(datetimeAvailability =>
        datetimeAvailability.sessionAvailabilityList.some(session => session.seating !== null && session.seating !== undefined),
      );
      if (firstDatetimeWithSeatingInSummary) {
        this.#state.selectedSession.selectedDatetime = firstDatetimeWithSeatingInSummary;
      }
    }
    if (isFreeMapSelector && !currentSelectedDatetimeHasSeating && firstDatetimeWithSeating && this.#state.selectedSession) {
      this.#state.selectedSession.selectedDatetime = firstDatetimeWithSeating;
    }
    const hasSelectedDatetime = !!this.#state.selectedSession?.selectedDatetime;
    const nextManageAsFreeSeatingMap = hasSelectedDatetime && isFreeMapSelector && this.#availability.selectedSessionHasSeating();
    this.#state.manageAsFreeSeatingMap = nextManageAsFreeSeatingMap;

    if (this.#state.manageAsFreeSeatingMap && !this.#state.isPreservingCart) {
      this.#cart.clearCart();
      this.#ticketSelection.clearSelectedTicketsReferences();
    }

    this.releaseDroppedSeatingSelection(seatingSelectionSnapshot);
  }

  /** Derives `seatingProvider` from the map URL and mirrors it onto the map state. */
  updateSeatingProvider(): void {
    if (this.#state.seatingMapUrl?.endsWith('onebox/')) {
      this.#state.seatingProvider = SeatingProviderEnum.ONEBOX;
    } else {
      this.#state.seatingProvider = SeatingProviderEnum.SEATSIO;
    }
    this.#setSeatingProviderOnState();
  }

  /** Applies map-assigned seats onto the cart lines. */
  updateSeats(cart: Cart, seats: Array<string>, fromMap = false, category?: string): void {
    if (!cart || !seats) {
      return;
    }
    this.#state.hasSeatsSelected = false;
    cart.sessionItemsByDatetime.forEach((cartSessions: CartSession[]) => {
      const seatedSession = this.#findSessionOwningSeats(cartSessions, category);
      this.#clearSeatsFromSessionsOtherThan(cartSessions, seatedSession);
      if (!seatedSession) {
        return;
      }
      seatedSession.seats = seats;
      this.#state.hasSeatsSelected = fromMap && seatedSession.units == seats.length;
    });
  }

  // ─────────────────────────────────────────── hold tokens ────────────────────────────────────────

  /**
   * Free-map add/remove.
   *
   * Handles multi-plan line preservation here, delegates the release-payment guard, seat tracking,
   * second-screen sync and cart total to {@link #updateSeatsInCartOss}, which in turn delegates the
   * hold token, selection and non-confirmed cart bookkeeping to {@link #updateSeatsInCartBase}.
   */
  updateSeatsInCart(data: FreeSeatResponse): void {
    this.#withMultiPlanPreservation(() => this.#updateSeatsInCartOss(data));
  }

  /** Reflects a single seat add/remove onto the ticket-count maps. */
  updateSelectedTicket(sessionId: number, adding: boolean, seatInfo: SeatInfo): void {
    const category = this.#getSelectedSessionSeatingCategory(sessionId);
    if (adding) {
      this.#addSelectedTicket(sessionId.toString(), category, seatInfo);
    } else {
      this.#removeSelectedTicket(sessionId.toString(), category, seatInfo);
    }
  }

  #addSelectedTicket(sessionId: string, category: string, seatInfo: SeatInfo): void {
    if (this.#noSelectedTickets()) {
      this.#state.selectedTicketsBySessionId = new Map([[sessionId, 1]]);
      this.#state.selectedTicketsBySessionType = new Map([[category, 1]]);
      this.#state.selectedTicketsSeatsBySessionId = new Map([[sessionId, [seatInfo]]]);
    } else {
      const count = !this.#state.selectedTicketsBySessionId.has(sessionId) ? 1 : this.#state.selectedTicketsBySessionId.get(sessionId)! + 1;
      const currentSeatReferences = !this.#state.selectedTicketsSeatsBySessionId.has(sessionId)
        ? []
        : this.#state.selectedTicketsSeatsBySessionId.get(sessionId)!;
      currentSeatReferences.push(seatInfo);
      this.#state.selectedTicketsBySessionId = new Map(this.#state.selectedTicketsBySessionId).set(sessionId, count);
      this.#state.selectedTicketsBySessionType = new Map(this.#state.selectedTicketsBySessionType).set(category, count);
      this.#state.selectedTicketsSeatsBySessionId.set(sessionId, currentSeatReferences);
    }
    this.#state.hasSeatsSelected = true;
  }

  #applyRealTimeSelection(selection: RealTimeSelection): void {
    if (this.#state.isReadyForSeatReleasePayment) {
      return;
    }
    const anchorSession = this.#getSeatedSessionOfSelectedTimeslot();
    if (!anchorSession) {
      // An empty snapshot with no seated session is what a `delete-order` sent while the POS tears the
      // selection down produces, not an anomaly.
      if (selection.items.length > 0) {
        this.#datadog.logWarn('[POS-SEATING] real-time selection without a seated session', {
          itemCount: selection.items.length,
          planId: this.#state.selectedPlan?.id,
          timeslot: this.#state.selectedSession?.selectedDatetime?.datetime,
        });
      }
      return;
    }

    const sessionId = anchorSession.id.toString();
    // While the kept map waits for its new session the iframe still runs the previous one: a snapshot
    // that arrives now belongs to the previous timeslot and its basket is about to be deleted by the
    // re-initialisation, so booking it on the new anchor would leave a line with a dead token.
    if (this.#state.isRealTimeMapAwaitingSession && selection.items.length > 0) {
      this.#datadog.logWarn('[POS-SEATING] real-time selection dropped while the map awaits its session', {
        itemCount: selection.items.length,
        mapSessionId: this.#state.seatingMapState?.session_id,
        planId: this.#state.selectedPlan?.id,
        timeslot: this.#state.selectedSession?.selectedDatetime?.datetime,
      });
      return;
    }
    // The wrapper reports the empty basket synchronously from `deleteOrder()`, so this runs re-entrantly
    // inside the release paths. The date and timeslot changes and the cart-line release empty the anchor
    // before they reach the map, so the snapshot finds nothing to replace and returns here, as the delta
    // path ignores a removal for a session that holds no tickets. `clearAllCart` (its fallback without the
    // cart detail) and the route leave call the map first, so there the snapshot runs the full path and
    // empties the anchor itself. The release paths reach the map before they drop the anchor's token
    // entry and never touch the global `seatingToken` nor `hasSeatsSelected`, so the basket that just
    // went is forgotten here, without cart work or tracking.
    if (selection.items.length === 0 && !this.#state.selectedTicketsBySessionId.has(sessionId)) {
      this.#replaceRealTimeHoldToken(sessionId, null, false);
      this.#state.hasSeatsSelected = [...this.#state.selectedTicketsSeatsBySessionId].some(
        ([heldSessionId, seatInfos]) => heldSessionId !== sessionId && seatInfos.length > 0,
      );
      return;
    }
    const currency = anchorSession.ticketPrice?.currency ?? this.#state.currency ?? '';
    const seatInfos = this.#toRealTimeSeatInfos(selection.items, currency);
    const previousCount = this.#state.selectedTicketsBySessionId.get(sessionId) ?? 0;
    const newCount = seatInfos.length;
    this.#seatTrackingTrigger$.next({ newCount, previousCount, sessionId: anchorSession.id });

    this.#replaceSelectedTickets(sessionId, this.#getSelectedSessionSeatingCategory(anchorSession.id), seatInfos);
    this.#replaceRealTimeHoldToken(sessionId, selection.holdToken, newCount > 0);
    this.#state.hasSeatsSelected = [...this.#state.selectedTicketsSeatsBySessionId].some(([, held]) => held.length > 0);
    this.#state.nonConfirmedCart = this.#cart.getCart();
    this.#secondScreen.syncHighlightedSeats();
    this.#refreshCartTotal();

    if (selection.reason === 'expired') {
      this.#showModal('common.errorTitle', 'boxOffice.realTimeSeatsExpired', 'realTimeSeatsExpired');
      this.#realTimeBasketExpired$.next();
    }
  }

  get #availability(): PosAvailabilityService {
    return this.#injector.get(PosAvailabilityService);
  }

  /**
   * Cart ↔ seating is mutually recursive (`restoreToBeginning` calls `updateFreeMapMode`, while
   * `updateSeatsInCart` calls `getCart`), so these siblings are resolved on demand instead of in a
   * field initializer: constructor-time `inject()` on both sides would be a DI cycle.
   */
  get #cart(): PosCartService {
    return this.#injector.get(PosCartService);
  }

  // ───────────────────────────────────────── chain internals ──────────────────────────────────────

  #cancelFreeMapLoad(): void {
    this.#freeMapLoad?.unsubscribe();
    this.#freeMapLoad = null;
    this.#forgetRealTimeSessionStart();
  }

  #expectRealTimeSessionStart(): void {
    this.#forgetRealTimeSessionStart();
    this.#isRealTimeSessionStartExpected = true;
    this.#realTimeSessionStartFallback = setTimeout(() => {
      this.#liftRealTimeWait();
      this.#viewUpdate.markForCheck();
    }, realTimeSessionStartFallbackMs);
  }

  #forgetRealTimeSessionStart(): void {
    this.#isRealTimeSessionStartExpected = false;
    if (this.#realTimeSessionStartFallback !== null) {
      clearTimeout(this.#realTimeSessionStartFallback);
      this.#realTimeSessionStartFallback = null;
    }
  }

  #liftRealTimeWait(): void {
    this.#forgetRealTimeSessionStart();
    if (this.#state.isRealTimeSeating) {
      this.#state.isRealTimeMapAwaitingSession = false;
    }
  }

  #checkResponseData<T>(response: BaseResponse<T>): Observable<BaseResponse<T>> {
    return response?.data ? of(response) : throwError(() => response);
  }

  #clearSeatsFromSessionsOtherThan(cartSessions: CartSession[], seatedSession?: CartSession): void {
    cartSessions.forEach(cartSession => {
      if (cartSession !== seatedSession) {
        cartSession.seats = undefined;
        cartSession.seatLabels = undefined;
        cartSession.seatDisplayLabels = undefined;
      }
    });
  }

  #findSessionOwningSeats(cartSessions: CartSession[], category?: string): CartSession | undefined {
    const seatedSessions = cartSessions.filter(cartSession => this.#isSeatedSession(cartSession));
    if (seatedSessions.length === 0) {
      return this.#hasKnownSeatingAvailability(cartSessions) ? undefined : cartSessions[0];
    }
    const sessionOwningCategory =
      category != null
        ? seatedSessions.find(cartSession => this.#getSeatingCategoryForSession(cartSession.sessionId) === category)
        : undefined;
    return sessionOwningCategory ?? (seatedSessions.length === 1 ? seatedSessions[0] : undefined);
  }

  #getCurrentSeatingMapContext(): { datetime: string; poolId: number } | null {
    const datetime = this.#state.selectedSession?.selectedDatetime?.datetime;
    const poolId = this.#state.selectedSession?.selectedDatetime?.sessionAvailabilityList?.find(s => s.seating != null)?.seating?.poolId;
    if (datetime == null || datetime === '' || poolId == null) {
      return null;
    }
    return { datetime, poolId };
  }

  /**
   * Sessions that still hold seats after a selection change: the live selection plus every cart line
   * with seats. A session listed here must keep its provider hold.
   */
  #getSeatingCategoryForSession(sessionId: number): string | undefined {
    return (
      this.#state.selectedSession?.selectedDatetime?.sessionAvailabilityList.find(session => session.id === sessionId)?.seating?.category ??
      undefined
    );
  }

  #getSessionIdsHoldingSeats(): Set<string> {
    const sessionIds = new Set<string>();
    this.#state.selectedTicketsSeatsBySessionId.forEach((seatInfos, sessionId) => {
      if (seatInfos.length > 0) {
        sessionIds.add(sessionId);
      }
    });
    for (const cart of [this.#state.nonConfirmedCart, this.#state.cart]) {
      cart?.sessionItemsByDatetime?.forEach(cartSessions => {
        cartSessions.forEach(cartSession => {
          if ((cartSession.seats?.length ?? 0) > 0) {
            sessionIds.add(cartSession.sessionId.toString());
          }
        });
      });
    }
    return sessionIds;
  }

  /** The session the free-selection map is loaded for: the seated session of the selected timeslot. */
  #getSeatedSessionOfSelectedTimeslot(): SessionAvailability | null {
    return this.#state.selectedSession?.selectedDatetime?.sessionAvailabilityList.find(session => session.seating != null) ?? null;
  }

  #getSelectedSessionSeatingCategory(sessionId: number): string {
    return this.#state.selectedSession!.selectedDatetime!.ticketTypesBySessionId.get(sessionId) ?? '';
  }

  /**
   * Effective `goToNextStep` for the free-map branch — the only branch
   * reachable from this strategy, since {@link generateFreeSeatingMap} runs with
   * `manageAsFreeSeatingMap === true`. The non-free-map branch (price viewer + `goToCheckout`) is
   * the cart/purchase domain's.
   */
  #goToNextStep(): void {
    if (this.#state.currentStep.nextStep) {
      this.#state.currentStep = this.#state.currentStep.nextStep;
      // Mirrored cdr call site.
      this.#viewUpdate.detectChanges();
    }
    // Mirrored cdr call site.
    this.#viewUpdate.markForCheck();
  }

  #hasKnownSeatingAvailability(cartSessions: CartSession[]): boolean {
    const sessionAvailabilityList = this.#state.selectedSession?.selectedDatetime?.sessionAvailabilityList ?? [];
    return cartSessions.some(cartSession => sessionAvailabilityList.some(session => session.id === cartSession.sessionId));
  }

  #hasSeatingInNonConfirmedCart(): boolean {
    return this.#state.nonConfirmedCart?.hasSeating ?? false;
  }

  #isSeatedSession(cartSession: CartSession): boolean {
    return cartSession.hasSeating === true || this.#getSeatingCategoryForSession(cartSession.sessionId) !== undefined;
  }

  #noSelectedTickets(): boolean {
    return this.#state.selectedTicketsBySessionId.size === 0 || this.#state.selectedTicketsBySessionType.size === 0;
  }

  /** Recomputes the displayed cart total from the current `nonConfirmedCart`. */
  #refreshCartTotal(): void {
    if (this.#state.coupon) {
      this.#state.updateCartTotalTrigger$.next();
      this.#secondScreen.updateCart();
      // Mirrored cdr call site.
      this.#viewUpdate.markForCheck();
      return;
    }
    this.#cart.updateCartTotalImmediate();
  }

  #removeSelectedTicket(sessionId: string, category: string, seatInfo: SeatInfo): void {
    if (this.#state.selectedTicketsBySessionId.size === 0) {
      return;
    }
    const count = this.#state.selectedTicketsBySessionId.get(sessionId)! - 1;
    if (count == 0) {
      const nextById = new Map(this.#state.selectedTicketsBySessionId);
      nextById.delete(sessionId);
      this.#state.selectedTicketsBySessionId = nextById;

      const nextByType = new Map(this.#state.selectedTicketsBySessionType);
      nextByType.delete(category);
      this.#state.selectedTicketsBySessionType = nextByType;

      this.#state.selectedTicketsSeatsBySessionId.delete(sessionId);
      if (this.#state.selectedTicketsBySessionType.size === 0) {
        // Preserves custom-tab selections.
        this.#ticketSelection.clearSelectedTicketsReferences();
      }
    } else {
      this.#state.selectedTicketsBySessionId = new Map(this.#state.selectedTicketsBySessionId).set(sessionId, count);
      this.#state.selectedTicketsBySessionType = new Map(this.#state.selectedTicketsBySessionType).set(category, count);
      const sessionSeats = this.#state.selectedTicketsSeatsBySessionId.get(sessionId)!;
      const index = sessionSeats.findIndex(seat => seat.seatReference === seatInfo.seatReference);
      if (index !== -1) {
        sessionSeats.splice(index, 1);
      }
    }
  }

  /**
   * A real-time basket has one token for every seat. With seats held, a token that comes with the
   * snapshot is stored where the delta path stores it and a snapshot without one keeps the previous
   * token (spec 6.2 step 4: "when present"). With no seat left the anchor's basket is gone: its entry
   * goes, and the global `seatingToken` only when no other session still holds a token (multi-plan).
   */
  #replaceRealTimeHoldToken(sessionId: string, holdToken: string | null, hasSeats: boolean): void {
    if (hasSeats) {
      if (!holdToken) {
        return;
      }
      this.#state.seatingToken = holdToken;
      this.#state.seatingHoldTokensBySessionId.set(sessionId, holdToken);
      if (this.#state.seatingMapState) {
        this.#state.seatingMapState.hold_token = holdToken;
        this.#state.seatingMapState.seating_provider = this.#state.seatingProvider;
      }
      return;
    }
    this.#state.seatingHoldTokensBySessionId.delete(sessionId);
    if (this.#state.seatingHoldTokensBySessionId.size === 0) {
      this.#state.seatingToken = null;
    }
    if (this.#state.seatingMapState) {
      this.#state.seatingMapState.hold_token = undefined;
    }
  }

  /**
   * Replaces the anchor session's share of the three selection maps. `selectedTicketsBySessionType` is
   * keyed by category, which another session of the timeslot may share, so only the anchor's previous
   * count is swapped for the new one instead of overwriting the category.
   */
  #replaceSelectedTickets(sessionId: string, category: string, seatInfos: SeatInfo[]): void {
    const newCount = seatInfos.length;
    const previousCount = this.#state.selectedTicketsBySessionId.get(sessionId) ?? 0;
    const nextById = new Map(this.#state.selectedTicketsBySessionId);
    const nextByType = new Map(this.#state.selectedTicketsBySessionType);
    const categoryCount = Math.max(0, (nextByType.get(category) ?? 0) - previousCount + newCount);

    if (newCount > 0) {
      nextById.set(sessionId, newCount);
      this.#state.selectedTicketsSeatsBySessionId.set(sessionId, seatInfos);
    } else {
      nextById.delete(sessionId);
      this.#state.selectedTicketsSeatsBySessionId.delete(sessionId);
    }
    if (categoryCount > 0) {
      nextByType.set(category, categoryCount);
    } else {
      nextByType.delete(category);
    }
    this.#state.selectedTicketsBySessionId = nextById;
    this.#state.selectedTicketsBySessionType = nextByType;
    if (nextByType.size === 0) {
      // Preserves custom-tab selections, as the delta path does when the last seat goes.
      this.#ticketSelection.clearSelectedTicketsReferences();
    }
  }

  #setSeatingProviderOnState(): void {
    if (!this.#state.seatingMapState) {
      return;
    }
    this.#state.seatingMapState.seating_provider = this.#state.seatingProvider;
  }

  /** One quantity-change event per burst of seat picks. */
  #setupSeatTrackingBatch(): void {
    this.#seatTrackingTrigger$
      .pipe(
        groupBy(event => event.sessionId.toString()),
        mergeMap(group$ => group$.pipe(buffer(group$.pipe(debounceTime(seatTrackingBatchMs))))),
        filter(events => events.length > 0),
        takeUntilDestroyed(this.#destroyRef),
      )
      .subscribe(events => {
        const { previousCount, sessionId } = events[0];
        const newCount = events[events.length - 1].newCount;
        if (newCount === previousCount) {
          return;
        }
        // Calls the public `trackPosCartItemQuantityChange`, which
        // `PosTicketSelectionService` owns — single implementation shared across call sites.
        this.#ticketSelection.trackPosCartItemQuantityChange({ newCount, previousCount, sessionId, source: 'from_seating' });
      });
  }

  /** Routed through the UI port instead of `ErrorModalService`. */
  #showModal(title: string, message: string, errorCode?: string | number): void {
    this.#ui
      .request('error', {
        errorCode,
        logError: this.#state.logErrorModal,
        message,
        title,
        ...(this.#state.channel === Channel.Kiosk && { windowClass: 'kiosk-modal' }),
      })
      .pipe(take(1))
      .subscribe();
  }

  #showModalError(errorMessage?: string, titleError?: string): void {
    this.#showModal(titleError ?? 'common.errorTitle', errorMessage ?? 'errors.generic');
  }

  get #ticketSelection(): PosTicketSelectionService {
    return this.#injector.get(PosTicketSelectionService);
  }

  /**
   * A real-time map survives a date change on purpose (`PosAvailabilityService.selectDate`), so the
   * widget can process the `delete-order` and re-initialise with the next session. When the new
   * selection has no free map to load in its place, the stale iframe comes down here.
   */
  #tearDownRealTimeMapLeftMounted(): void {
    this.#cancelFreeMapLoad();
    this.#state.isRealTimeMapAwaitingSession = false;
    if (!this.#state.isRealTimeSeating) {
      return;
    }
    this.#state.seatingMapUrl = null;
    this.#state.seatingMapState = null;
    this.#secondScreen.clearHighlightedSeats();
    // Mirrored cdr call site.
    this.#viewUpdate.markForCheck();
  }

  /**
   * One `SeatInfo` per unit, so `units === seats.length` as on the delta path and the line matches the
   * selector's counter (Σ `itemCount`). `itemPrice` is the final price the map charges for one unit of
   * the item and is display-only: the cart response replaces it.
   */
  #toRealTimeSeatInfos(items: ExternalItem[], currency: string): SeatInfo[] {
    return items.flatMap(item =>
      Array.from(
        { length: Math.max(0, item.itemCount) },
        () => new SeatInfo(item.seatReference, item.seatLabel, item.seatLabel, new Money(item.itemPrice, currency)),
      ),
    );
  }

  #updateSeatsInCartBase(data: FreeSeatResponse): void {
    const selectedSession = this.#state.selectedSession;
    if (selectedSession && selectedSession.selectedDatetime != null) {
      if (data.adding && data.holdToken) {
        this.#state.seatingToken = data.holdToken;
        this.#state.seatingHoldTokensBySessionId.set(data.sessionId.toString(), data.holdToken);
        if (this.#state.seatingMapState) {
          this.#state.seatingMapState.hold_token = data.holdToken;
          this.#state.seatingMapState.seating_provider = this.#state.seatingProvider;
        }
      }
      this.updateSelectedTicket(data.sessionId, data.adding, data.seatInfo);
      this.#state.nonConfirmedCart = this.#cart.getCart();
    }
  }

  #updateSeatsInCartOss(data: FreeSeatResponse): void {
    if (this.#state.isReadyForSeatReleasePayment) {
      return;
    }
    if (!data.adding && !this.#state.selectedTicketsBySessionId.has(data.sessionId.toString())) {
      return;
    }

    const previousCount = this.#state.selectedTicketsBySessionId.get(data.sessionId.toString()) ?? 0;
    const newCount = data.adding ? previousCount + 1 : previousCount - 1;
    this.#seatTrackingTrigger$.next({ newCount, previousCount, sessionId: data.sessionId });

    this.#updateSeatsInCartBase(data);
    this.#secondScreen.syncHighlightedSeats();
    this.#refreshCartTotal();
  }

  /**
   * Runs a seat change and keeps the other plans' cart lines alive around it. Shared by the delta path
   * ({@link updateSeatsInCart}) and the real-time set path ({@link setRealTimeSelection}) so the
   * multi-plan preservation cannot drift between the two.
   */
  #withMultiPlanPreservation(applySeatChange: () => void): void {
    const shouldPreserveMultiPlanSessions = this.#cart.shouldPreserveOtherPlanSessions();
    const previousCartReference = this.#state.nonConfirmedCart;
    const previousNonConfirmedCart =
      shouldPreserveMultiPlanSessions && this.#state.nonConfirmedCart != null
        ? this.#state.nonConfirmedCart.clone()
        : this.#state.nonConfirmedCart;
    const currentPlanId = this.#state.selectedPlan?.id ?? null;

    applySeatChange();

    if (!shouldPreserveMultiPlanSessions) {
      return;
    }
    // Removing the last seat of the plan on screen empties its selection, `generateCart` answers
    // `null` and `#updateSeatsInCartBase` takes every other plan's line down with it. Keep those
    // lines, and with them the seats they hold — B2BO-8391.
    if (
      this.#state.nonConfirmedCart === null &&
      previousNonConfirmedCart !== null &&
      currentPlanId !== null &&
      !this.#state.allowMultiTimeSlotSelection
    ) {
      const otherPlansCart = cartWithOnlyOtherPlanSessions(previousNonConfirmedCart, currentPlanId);
      if (otherPlansCart !== null) {
        this.#state.nonConfirmedCart = otherPlansCart;
        this.#refreshCartTotal();
      }
      return;
    }
    // This block is identical to the equivalent block in the `updateNonConfirmedCart` path (guards
    // included), which `PosCartService.mergeMultiplanCart` owns — see the note on that method. The
    // only difference between the two call sites is where the multiplan gate sits: the seat path
    // gates the whole merge (the `return` above), the `updateNonConfirmedCart` path gates only the
    // clone.
    if (this.#cart.mergeMultiplanCart(previousNonConfirmedCart, previousCartReference, currentPlanId)) {
      // `#updateSeatsInCartOss` priced the cart before the other plans' lines were merged back in, so
      // the header would read "2 items" at one plan's price — B2BO-8391.
      this.#refreshCartTotal();
    }
  }
}
