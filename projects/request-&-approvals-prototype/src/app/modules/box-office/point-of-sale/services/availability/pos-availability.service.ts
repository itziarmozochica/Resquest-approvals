import { DestroyRef, inject, Injectable, Injector, untracked } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { LoadBoxOfficeEvent } from '@fz-original/app/core/tracking/core/events/load-box-office';
import { LoadTicketingData } from '@fz-original/app/core/tracking/core/events/load-ticketing-data';
import { TrackingService } from '@fz-original/app/core/tracking/tracking.service';
import { MemberAccountIdentificationService } from '@fz-original/app/modules/box-office/memberships/services/member-account-identification.service';
import { MembershipsIdentificationService } from '@fz-original/app/modules/box-office/memberships/services/memberships-identification.service';
import { OboSecondScreenDataService } from '@fz-original/app/modules/box-office/obo-second-screen/services/obo-second-screen-data.service';
import { ContactInformationFieldEnum } from '@fz-original/app/modules/box-office/shared/models/onsite-setup';
import { computeEffectiveCacheConfig } from '@fz-original/app/modules/box-office/shared/models/onsite-setup.util';
import {
  ADDONS_INDEPENDENT_FROM_EXPLODE_PIPE_FEATURE,
  filterOutGlobalAddonOnlySessions,
} from '@fz-original/app/shared/components/ticket-selector/addon-explode-pipe.utils';
import { seatingHoldTokensForSeatedCartLines } from '@fz-original/app/shared/components/ticketing/ticketing.utils';
import { Plan } from '@fz-original/app/shared/models/plan/plan.model';
import { DateAvailability } from '@fz-original/app/shared/models/session-availability/date-availability.model';
import { pickNextUpcomingSession } from '@fz-original/app/shared/models/session-availability/next-upcoming-session.util';
import { RegularSessionAvailabilitySummaryByDate } from '@fz-original/app/shared/models/session-availability/regular-session-availability-summary-by-date.model';
import {
  SessionAvailabilitySummaryByDate,
  SessionAvailabilitySummaryByDateType,
} from '@fz-original/app/shared/models/session-availability/session-availability-summary-by-date.model';
import { SessionAvailabilitySummaryByDatetime } from '@fz-original/app/shared/models/session-availability/session-availability-summary-by-datetime.model';
import { SessionAvailabilitySummary } from '@fz-original/app/shared/models/session-availability/session-availability-summary.model';
import { FeatureFlags } from '@fz-original/app/shared/optimizely/feature-flags';
import { OptimizelyService } from '@fz-original/app/shared/optimizely/optimizely.service';
import { SearchFilter } from '@fz-original/app/shared/search-bar/models/search-filter.model';
import { RemovePlanFromCartQuery } from '@fz-original/app/shared/services/cart/remove-plan-from-cart-query';
import { DualScreenStorageService } from '@fz-original/app/shared/services/dual-screen/dual-screen-storage.service';
import { CAPN_ID } from '@fz-original/app/shared/services/partner/partner.service';
import { PriceViewerPrinterServiceManager } from '@fz-original/app/shared/services/price-viewer/price-viewer.service';
import { SessionSelectorType } from '@fz-original/app/shared/services/session-availability/session-selector-type.enum';
import { TicketingContextService } from '@fz-original/app/shared/services/ticketing/ticketing-context.service';
import { CartUtil } from '@fz-original/app/shared/utils/cart.util';
import { OngoingSessionUtil } from '@fz-original/app/shared/utils/ongoing-session.util';
import { ScrollUtils } from '@fz-original/app/shared/utils/scroll.utils';
import { Channel } from '@fz/channel';
import { TranslateService } from '@ngx-translate/core';
import moment from 'moment-timezone';
import { defer, EMPTY, Observable, of, Subject, Subscription } from 'rxjs';
import { concatMap, map, skip, switchMap, take, tap } from 'rxjs/operators';

import { type TimeslotActivationFromCartPayload } from '../../../one-stop-shop/components/oss-cart-detail/oss-cart-detail.component';
import { OssTab } from '../../../one-stop-shop/models';
import { FilterProductSessionsPipe } from '../../../ticketing/filter-product-sessions.pipe';
import {
  type PosAvailabilityDatesResolvedEvent,
  type PosAvailabilityFlowEvent,
  type PosAvailabilityRequest,
  type PosAvailabilitySettledEvent,
  type PosModifyOrderChannels,
} from '../../models/store/pos-availability-store.model';
import { PosTicketingState } from '../../state/pos-ticketing.state';
import { PosAvailabilityStore } from '../../store/pos-availability.store';
import { getModifyOrderOriginalChannel, getModifyOrderOriginalChannelId } from '../../utils/modify-order-original-channel.util';
import { pickRemainingCartTimeslot } from '../../utils/pos-remaining-cart-timeslot.util';
import { PosCartService } from '../cart/pos-cart.service';
import { PosCouponsService } from '../coupons/pos-coupons.service';
import { PosViewUpdateService } from '../pos-view-update/pos-view-update.service';
import { PosPurchaseService } from '../purchase/pos-purchase.service';
import { PosSeatingService } from '../seating/pos-seating.service';
import { PosSecondScreenService } from '../second-screen/pos-second-screen.service';
import { PosSetupService } from '../setup/pos-setup.service';
import { PosTicketSelectionService } from '../ticket-selection/pos-ticket-selection.service';
import { TicketingCoreService } from '../ticketing-core/ticketing-core.service';
import { adaptLegacyDates, adaptLegacySummary, type PosLegacyAvailabilityContext } from './pos-legacy-availability.adapter';

/**
 * Declared locally rather than imported from `BaseTicketingComponent`, so this module has no
 * dependency on that class. `accumulateDates` is the one field legacy had no equivalent for.
 */
export interface GetSessionAvailableParams {
  /** Merge the returned pills into the calendar instead of replacing it (load-more). */
  accumulateDates?: boolean;
  cacheTimeoutInSeconds?: number;
  daysWithActiveSession?: number;
  includeOngoing?: boolean;
  includeSoldOutSessions?: boolean;
  onlyGetSessions?: boolean;
  useCacheEnabled?: boolean;
}

/**
 * Pure-UI callbacks the availability domain needs but must not own: the visually active tab and the
 * mobile date-selector / seating-tab auto-navigation flags all live on `PointOfSaleComponent`. The
 * component registers them once, mirroring the facade's `registerSeatingViewHandlers` pattern.
 */
export interface PosAvailabilityUiHandlers {
  /**
   * Auto-navigates to the seating tab the first time a seated plan resolves. The
   * strategy only calls it when `hasPlanSeating()` holds; the component owns the tab index, the
   * `#seatingTabAutoNavigated` latch and the `activeTab` write.
   */
  activateSeatingTabIfAvailable: () => void;
  /** Index of the visually active tab inside `PosTicketingState.availableTabs()` (`activeTab().tabIndex`). */
  activeTabIndex: () => number;
  /** `showMobileDateSelector.set(false)` — the component decides whether it is on mobile/tablet. */
  hideMobileDateSelector: () => void;
  /** `#seatingTabAutoNavigated = false`. */
  resetSeatingTabAutoNavigation: () => void;
}

export interface PosTimeslotSelectionOptions {
  readonly refreshCart: boolean;
}

const REFRESHING_TIMESLOT_SELECTION: PosTimeslotSelectionOptions = { refreshCart: true };

/** Fallback max purchasable days used when no onsite setup is selected yet. */
const MAX_PURCHASABLE_DAYS_ONE_STEP = 3;

/** Mobile breakpoint used by `#resetScroll`. */
const SCROLL_RESET_DESKTOP_BREAKPOINT = 1200;

/** Bridge between `PosAvailabilityStore` and the legacy POS state — see the availability section of `point-of-sale/AGENTS.md`. */
@Injectable()
export class PosAvailabilityService {
  readonly #core = inject(TicketingCoreService);
  readonly #destroyRef = inject(DestroyRef);
  readonly #dualScreenStorage = inject(DualScreenStorageService);
  readonly #memberAccount = inject(MemberAccountIdentificationService);
  readonly #memberships = inject(MembershipsIdentificationService);
  readonly #injector = inject(Injector);
  readonly #oboSecondScreenData = inject(OboSecondScreenDataService);
  readonly #optimizely = inject(OptimizelyService);
  readonly #priceViewer = inject(PriceViewerPrinterServiceManager);
  readonly #state = inject(PosTicketingState);
  readonly #store = inject(PosAvailabilityStore);
  readonly #ticketingContext = inject(TicketingContextService);
  /**
   * Legacy `TrackingService`, not `FzTrackingService`: `LoadBoxOfficeEvent` only exists in the frozen
   * `core/tracking` tree and parity requires the identical Mixpanel payload.
   */
  readonly #tracking = inject(TrackingService);
  readonly #translate = inject(TranslateService);
  readonly #viewUpdate = inject(PosViewUpdateService);

  #uiHandlers: PosAvailabilityUiHandlers | null = null;

  /** Replaces the deleted `PosTicketingState.getSessionAvailableSubscription`: supersedes the plan-resolution leg. */
  #changePlanSubscription: Subscription | null = null;
  /** Legacy `DateSelectorComponent.newDateSelected`: gates the free-map effect pair on a date-pill change. */
  #hasPendingDateSelectionEffects = false;
  #lastReconciledSelectionKey: string | null = null;

  readonly #activateTimeslot$ = new Subject<TimeslotActivationFromCartPayload>();
  readonly #availabilityFlowEnded$ = new Subject<void>();

  /** Emits each time an availability fetch ends, however it ended: settled, failed or superseded. */
  readonly availabilityFlowEnded$: Observable<void> = this.#availabilityFlowEnded$.asObservable();

  constructor() {
    this.#state.locale = this.#translate.currentLang;
    this.applyAvailabilityFlags();
  }

  // ──────────────────────────────────────── component wiring ──────────────────────────────────────

  /**
   * Activates the timeslot a cart line belongs to.
   * Parity-locked: ticket counters must be restored *before* the session is selected, so the newly
   * selected session already reflects the cart's counts.
   */
  activatePendingTimeslot(datetime: string): void {
    const sessionSummary = this.#state.regularSessionAvailabilitySummaryByDateList.find(summary =>
      summary.sessionAvailabilityByDatetimeList.some(avail => this.#isMatchingDatetime(avail, datetime)),
    );
    if (!sessionSummary) {
      return;
    }
    const matchingDatetime = sessionSummary.sessionAvailabilityByDatetimeList.find(avail => this.#isMatchingDatetime(avail, datetime));
    if (!matchingDatetime) {
      return;
    }
    this.#ticketSelection().restoreTicketCountsFromCart(datetime);
    sessionSummary.selectedDatetime = matchingDatetime;
    this.selectSession(sessionSummary);
  }

  /**
   * Resolves the setup-less `daysWithActiveSession` default at construction time.
   * The rest arrive later: `includeSoldOutSessions` in the setup strategy's `applyOnsiteSetup()`,
   * and the cache triple plus the performance flags per plan in {@link loadNewSearch}.
   */
  applyAvailabilityFlags(): void {
    this.#state.daysWithActiveSession = this.#getMaxPurchasableDays();
  }

  /**
   * Whether a cart-line timeslot can be activated without refetching availability.
   * Takes the payload's `datetime` only.
   */
  canActivateCartTimeslotWithoutRefetch(datetime: string, shouldApplyPlanConfig: boolean): boolean {
    const state = this.#state;
    if (shouldApplyPlanConfig) {
      return false;
    }

    const selectedCalendarDate = state.selectedDateAvailability?.date;
    if (selectedCalendarDate === undefined) {
      return false;
    }

    const targetCalendarDate = moment(datetime).tz(state.timezone).format('YYYY-MM-DD');
    if (selectedCalendarDate !== targetCalendarDate) {
      return false;
    }

    return state.regularSessionAvailabilitySummaryByDateList.some(summary =>
      summary.sessionAvailabilityByDatetimeList.some(avail => this.#isMatchingDatetime(avail, datetime)),
    );
  }

  canApplyAvailabilityPerformance(): boolean {
    const plan = this.#state.plan;
    const isOngoingCapablePlan = (plan?.isTimeless() ?? false) || (plan?.isGiftCard() ?? false);
    return !isOngoingCapablePlan;
  }

  // ─────────────────────────────────────────────── fetch ──────────────────────────────────────────

  /** Re-resolves the plan before each availability request. */
  changePlan(): Observable<Plan> {
    const state = this.#state;
    if (!state.partner) {
      return EMPTY;
    }
    return this.#core.getPlan(state.partner.id, state.selectedPlan.id).pipe(
      tap(plan => {
        if (state.plan?.id !== plan.id) {
          state.selectedAvailabilityFromDate = null;
          // The store owns the seed, so the reset has to reach it before the request is built.
          this.#store.setAvailabilityFromDate(null);
        }
        state.plan = plan;
      }),
      tap(plan => {
        // The resolved plan decides whether the stored terminal pairing still applies,
        // so the payment configuration is rebuilt first and only then is the stale-Square alert shown.
        // Both bodies are owned elsewhere (setup / purchase); this is their single call site.
        this.#setup().updatePaymentConfigurationFromOnsiteSetup();
        this.#purchase().displaySquareAlertModalIfNeeded();
        // The second screen applies every storage write as its own update: a map still visible when
        // the new plan or cart lands would be requested for the new sessions with the old map context.
        this.#secondScreen().setSeatingMapFullscreen(false);
        this.#secondScreen().updatePlan(plan);
        if (state.nonConfirmedCart) {
          this.#secondScreen().updateCart();
        } else {
          this.#oboSecondScreenData.resetCart();
        }
        this.#secondScreen().clearHighlightedSeats();
        this.#viewUpdate.markForCheck();
      }),
    );
  }

  /**
   * Date-selector intent: re-selects the current timeslot so the mobile selector closes.
   * Legacy equivalent: `DateSelectorComponent.confirmSelection()`.
   */
  confirmTimeslotFromSelector(): void {
    const selectedSession = this.#state.selectedSession;
    if (selectedSession === null || selectedSession.selectedDatetime == null) {
      return;
    }
    this.selectSession(selectedSession);
  }

  /** Default datetime the OBO date selector should land on. */
  defaultDatetimeForOboDateSelector(summary: RegularSessionAvailabilitySummaryByDate): SessionAvailabilitySummaryByDatetime | null {
    const noCounters = new Map<string, number>();
    const maxField = this.#state.maxLimitTicketField;
    const allowMulti = this.#state.allowMultiTimeSlotSelection;
    const isAvailable = (session: SessionAvailabilitySummaryByDatetime): boolean =>
      session.isAvailable(noCounters, maxField, 0, allowMulti);
    const first = (sessions: SessionAvailabilitySummaryByDatetime[]): SessionAvailabilitySummaryByDatetime | null =>
      sessions.find(isAvailable) ?? null;

    if (this.#state.preselectNextUpcomingSession) {
      const nextUpcoming = pickNextUpcomingSession(
        [...summary.morningSessions, ...summary.afternoonSessions, ...summary.eveningSessions, ...summary.nightSessions].filter(
          isAvailable,
        ),
      );
      if (nextUpcoming !== null) {
        return nextUpcoming;
      }
    }

    return (
      first(summary.morningSessions) ?? first(summary.afternoonSessions) ?? first(summary.eveningSessions) ?? first(summary.nightSessions)
    );
  }

  /** Keeps a calendar selection consistent with a multi-timeslot cart. */
  ensureSelectedSessionForCalendarWithMultiTimeslotCart(): void {
    const state = this.#state;
    if (
      !state.allowMultiTimeSlotSelection ||
      state.selectedSession !== null ||
      (state.selectedTicketsBySessionType.size === 0 &&
        (!this.#pickedDateHasOngoingBuckets() || state.selectedTicketsBySessionId.size === 0)) ||
      state.regularSessionAvailabilitySummaryByDateList.length === 0
    ) {
      return;
    }

    const calendarDate = state.selectedDateAvailability?.date;
    const sessionSummaryForDate =
      calendarDate !== undefined
        ? (state.regularSessionAvailabilitySummaryByDateList.find(summary => summary.date === calendarDate) ?? null)
        : null;
    const summary = sessionSummaryForDate ?? state.regularSessionAvailabilitySummaryByDateList[0];
    if (summary.sessionAvailabilityByDatetimeList.length === 0) {
      return;
    }

    const preferredDatetime = this.defaultDatetimeForOboDateSelector(summary);
    summary.selectedDatetime = preferredDatetime;
    if (preferredDatetime === null) {
      summary.selectNextAvailableDatetime(new Map<string, number>(), state.maxLimitTicketField, {
        preferNextUpcoming: state.preselectNextUpcomingSession,
        skipCapacityValidation: state.allowMultiTimeSlotSelection,
      });
    }
    if (summary.selectedDatetime === null) {
      this.#echoSelectionToStore();
      return;
    }
    this.selectSession(summary);
  }

  /**
   * Finds the summary owning `timeStamp` and activates that timeslot on it. Used by the
   * modify-order preselection, which needs the resolved summary back.
   */
  findSessionAndApplySelectionForTimestamp(
    timeStamp: number,
    orderSessionStartsAtRaw?: string | null,
  ): SessionAvailabilitySummaryByDate | undefined {
    const list = this.#state.regularSessionAvailabilitySummaryByDateList ?? [];
    const matchesOrderSlot = (availDatetime: string): boolean => {
      const availMs = new Date(availDatetime).getTime();
      if (orderSessionStartsAtRaw && this.#normalizeOssDatetime(availDatetime) === this.#normalizeOssDatetime(orderSessionStartsAtRaw)) {
        return true;
      }
      return timeStamp === availMs;
    };
    for (const session of list) {
      const dateTime = session.sessionAvailabilityByDatetimeList?.find(sa => matchesOrderSlot(sa.datetime));
      if (dateTime) {
        session.selectedDatetime = dateTime;
        this.#echoSelectionToStore();
        return session;
      }
    }
    return undefined;
  }

  getAvailabilityQueryChannelId(): string {
    const order = this.#state.modifiedOrder();
    if (this.#purchase().isModifyOrderMode() && order != null) {
      return getModifyOrderOriginalChannelId(order);
    }
    return this.#state.channelId;
  }

  getCurrency(): string | null {
    const allSessionsAvailability: Array<SessionAvailabilitySummaryByDate> = [
      ...(this.#state.regularSessionAvailabilitySummaryByDateList ?? []),
    ];
    return allSessionsAvailability[0]?.sessionAvailabilityByDatetimeList[0]?.sessionAvailabilityList[0]?.ticketPrice?.currency ?? null;
  }

  getIncludeOngoing(): boolean {
    return this.#state.includeOngoing;
  }

  getIncludeOngoingForSessionsForDate(): boolean {
    return this.getIncludeOngoing();
  }

  /** Earlier date buckets whose sessions are still ongoing on the selected date. */
  getOngoingMultiDayBuckets(): RegularSessionAvailabilitySummaryByDate[] {
    const state = this.#state;
    const selectedKey = state.selectedSession?.date;
    if (!selectedKey || !state.regularSessionAvailabilitySummaryByDateList?.length) {
      return [];
    }
    return state.regularSessionAvailabilitySummaryByDateList.filter(
      summary =>
        summary.date < selectedKey &&
        summary.sessionAvailabilityByDatetimeList.length > 0 &&
        OngoingSessionUtil.isBucketOngoingOnDate(summary, selectedKey, state.timezone),
    );
  }

  // ────────────────────────────────────────────── selection ────────────────────────────────────────

  /** Entry point for every availability refresh: resolves the plan, then hands the request to the store. */
  getSessionAvailable(params: GetSessionAvailableParams): void {
    const state = this.#state;
    if (!state.partner || !state.selectedPlan || !state.fromDate || !state.timezone) {
      return;
    }
    state.error = false;
    state.errorObject = null;
    state.hasResult = false;

    this.#cancelInFlightAvailabilityRequest();
    this.#changePlanSubscription = this.changePlan()
      .pipe(takeUntilDestroyed(this.#destroyRef))
      .subscribe({
        error: (error: unknown) => {
          this.#applyFetchFailure(error);
          this.onGetSessionAvailableEnd();
        },
        next: () => {
          const onlyGetSessions = params.onlyGetSessions ?? true;
          if (!onlyGetSessions) {
            state.regularSessionAvailabilitySummaryByDateList = [];
          }
          state.isLoadingDateSessions = true;
          this.#store.fetchAvailability(this.#buildAvailabilityRequest(params, onlyGetSessions));
        },
      });
  }

  handleDisplayedSessionTypeChange(selectedSessionType: SessionAvailabilitySummaryByDateType): void {
    const state = this.#state;
    state.displayedSessionType = selectedSessionType;

    const newProductTypes = state.sessionAvailabilitySummary?.getProductTypes() ?? [];
    newProductTypes.forEach(newProductType => {
      if (!state.productTypes.some(existingProductType => existingProductType.sessionId === newProductType.sessionId)) {
        state.productTypes.push(newProductType);
      }
    });

    state.ticketTypes = state.sessionAvailabilitySummary?.getTicketTypes() ?? [];

    // The single implementation of `#restoreMissingTypesToSelection` lives on
    // `PosTicketSelectionService`, which owns the selection maps it rewrites.
    this.#ticketSelection().restoreMissingTypesToSelection();

    this.#ticketSelection().updateTicketTypeFields();
  }

  handleShowAvailabilityFromDateChange(selectedDateString: string): void {
    const selectedDate = new Date(selectedDateString);
    this.#state.selectedAvailabilityFromDate = selectedDateString;
    this.#store.setAvailabilityFromDate(selectedDateString);
    this.loadNewSearch(this.#state.filters, selectedDate);
  }

  hasPlanSeating(): boolean {
    return this.#state.regularSessionAvailabilitySummaryByDateList.some(summaryByDate =>
      summaryByDate.sessionAvailabilityByDatetimeList.some(datetimeAvailability =>
        datetimeAvailability.sessionAvailabilityList.some(session => session.seating !== null),
      ),
    );
  }

  /**
   * Owns everything except the modify-order half, which `PosPurchaseService.initialise()` owns. The
   * free map is (re)loaded synchronously unless the `?modified_order_id=` order is still in flight,
   * which would build the map for the wrong timeslot; the tab bookkeeping runs in `setTimeout(…, 0)`
   * so `manageAsFreeSeatingMap` and the fresh ticket types are visible to `updateAvailableTabs`.
   */
  initializeSessionAvailableEvents(): void {
    this.#state.sessionAvailableReady.pipe(takeUntilDestroyed(this.#destroyRef)).subscribe(() => {
      if (!this.#purchase().isWaitingForOrderFromUrl()) {
        this.#seating().loadOneStepFreeSeatingMap();
      }
      setTimeout(() => {
        this.#state.isDateChangeInProgress = false;
        this.#setup().updateAvailableTabs();
        if (this.hasPlanSeating()) {
          this.#uiHandlers?.activateSeatingTabIfAvailable();
        }
      }, 0);
    });
  }

  /**
   * A cart line asks for its own timeslot to become the active one, which may require switching
   * plan/venue and refetching availability first.
   *
   * Uses `switchMap` so a second request supersedes an in-flight one.
   */
  initializeTimeslotActivationListener(): void {
    this.#activateTimeslot$
      .pipe(
        switchMap((payload: TimeslotActivationFromCartPayload) => {
          this.#state.isPreservingCart = true;
          const plan = this.#setup().availablePlansById().get(payload.planId);
          const targetConfig = plan ? this.#setup().buildPlanConfigFromPlan(plan, payload.venueId) : null;
          if (targetConfig === null) {
            return EMPTY;
          }
          const current = this.#state.activeOssPlanConfig();
          const shouldApplyPlanConfig = current === null || current.id !== targetConfig.id || current.placeId !== targetConfig.placeId;
          const afterPlanReady$ = shouldApplyPlanConfig
            ? defer(() => {
                this.#setup().handlePlanSelected(targetConfig);
                return this.#state.sessionAvailableReady.pipe(skip(1), take(1));
              })
            : of(void 0);
          return afterPlanReady$.pipe(
            concatMap(() => {
              if (this.canActivateCartTimeslotWithoutRefetch(payload.datetime, shouldApplyPlanConfig)) {
                return of(payload.datetime);
              }

              const targetDate = moment(payload.datetime).tz(this.#state.timezone);
              this.selectDate(new DateAvailability(targetDate.format('YYYY-MM-DD'), true));
              return this.#state.sessionAvailableReady.pipe(
                skip(1),
                take(1),
                map(() => payload.datetime),
              );
            }),
          );
        }),
        takeUntilDestroyed(this.#destroyRef),
      )
      .subscribe((datetime: string) => {
        this.activatePendingTimeslot(datetime);
      });
  }

  /** Called once by `PointOfSaleTicketing.initialise()`: the store publishes its flow through this handler. */
  installStoreFlowHandler(): void {
    this.#store.registerFlowHandler((event: PosAvailabilityFlowEvent) => {
      this.#handleFlowEvent(event);
    });
  }

  loadMoreDays(daysWithActiveSession: number = this.#state.daysWithActiveSession): void {
    const state = this.#state;
    if (state.isLoadingSessions || state.isLoadingDates) {
      return;
    }
    const summary = state.sessionAvailabilitySummary;
    if (!summary || summary.regularSessionAvailabilitySummaryByDates.length === 0) {
      return;
    }
    if (!summary.nextAvailableDate || summary.nextAvailableDate.length === 0) {
      return;
    }
    state.isLoadingDates = true;
    const nextDate = moment(summary.nextAvailableDate).tz(state.timezone).toDate();
    state.fromDate = new Date(Date.UTC(nextDate.getFullYear(), nextDate.getMonth(), nextDate.getDate()));
    this.#requestDatesAndSessionsAvailability({ accumulateDates: true, daysWithActiveSession, includeOngoing: false });
  }

  loadNewSearch(filters: SearchFilter, date?: Date): void {
    const state = this.#state;
    const isSameVenue =
      state.selectedPlan?.id === filters.selectedPlan?.id &&
      state.selectedPlace?.id === filters.selectedPlace?.id &&
      state.selectedCity?.id === filters.selectedCity?.id;
    const dateChanged = date && (!state.fromDate || state.fromDate.getTime() !== date.getTime());
    const hasPlanOrPlaceChanged =
      state.selectedPlan?.id !== filters.selectedPlan?.id || state.selectedPlace?.id !== filters.selectedPlace?.id;
    if (state.manageAsFreeSeatingMap && hasPlanOrPlaceChanged) {
      state.seatingMapUrl = null;
      state.seatingMapState = null;
      this.#seating().clearLastSeatingMapLoadContext();
      state.seatingToken = '';
      // The map is gone, but a preserved multiplan cart still holds the other plans' seats under
      // their own hold tokens: keep those, or their lines go out stamped with the new plan's token
      // and the backend rejects the order — B2BO-8391.
      state.seatingHoldTokensBySessionId = state.multiPlanCartEnabled
        ? seatingHoldTokensForSeatedCartLines(state.seatingHoldTokensBySessionId, [state.nonConfirmedCart, state.cart])
        : new Map();
      state.selectedTicketsSeatsBySessionId = new Map();
    }
    if (isSameVenue && !dateChanged && (state.cart || state.nonConfirmedCart)) {
      state.filters = filters;
      if (filters.selectedPlan != null) state.selectedPlan = filters.selectedPlan;
      if (filters.selectedPlace != null) state.selectedPlace = filters.selectedPlace;
      if (filters.selectedCity != null) state.selectedCity = filters.selectedCity;
      state.timezone = filters.timezone;
      if (this.#isActiveTabDateDependant()) {
        this.#getSessionsForSelectedDate();
      } else if (this.#activeTab() === OssTab.CUSTOM_TABS) {
        this.#preserveCartStateForCustomTabs();
      }
      return;
    }
    this.#uiHandlers?.resetSeatingTabAutoNavigation();

    state.filters = filters;
    state.date = date;
    this.#priceViewer.clear(state.onsiteSetupSelected);
    this.#viewUpdate.markForCheck();

    if (filters?.selectedPlan) {
      const userAttributes = {
        plan_id: filters.selectedPlan.id.toString(),
      };
      if (state.selectedPlan?.id != null && state.selectedPlan.id !== filters.selectedPlan.id) {
        this.#store.clearAvailabilityCaches();
      }
      const cacheConfig = computeEffectiveCacheConfig({
        onsiteSetup: state.onsiteSetupSelected,
        planId: filters.selectedPlan.id,
      });
      state.useCacheEnabled = cacheConfig.useCacheEnabled;
      state.useCacheSwrEnabled = cacheConfig.useCacheSwrEnabled;
      state.cacheTimeoutInSeconds = cacheConfig.cacheTimeoutInSeconds;
      state.cashModalMandatory = this.#optimizely.isFeatureEnabled('obo_cash_modal_mandatory', userAttributes) ?? false;
      state.daysWithActiveSession = this.#getMaxPurchasableDays();
      state.showPhoneNumberContactInformation = this.#shouldShowPhoneNumber();
      state.showEmailContactInformation = this.#shouldShowEmail();
      state.allowMultiTimeSlotSelection =
        this.#purchase().isModifyOrderMode() ||
        this.#purchase().isReservationSettlementActive() ||
        (this.#optimizely.isFeatureEnabled(FeatureFlags.MULTI_TIME_SLOT_SELECTION, userAttributes) ?? false);
      state.preselectNextUpcomingSession =
        this.#optimizely.isFeatureEnabled(FeatureFlags.BOX_OFFICE_PRESELECT_NEXT_UPCOMING_SESSION, userAttributes) ?? false;
      this.#viewUpdate.markForCheck();
    }

    if (state.onsiteSetupSelected && filters) {
      const shouldResetCart =
        !this.#purchase().isModifyOrderMode() &&
        !this.#purchase().isReservationSettlementActive() &&
        this.#shouldResetCartForNewSearch(filters, date);

      if (shouldResetCart) {
        // Also clears the store's availability + selection slices, so the bridge must not reset them again.
        this.#store.resetForNewSearch();
        // The reset also wipes the from-date seed, but legacy never cleared the operator's pick on
        // a cart-resetting search — echo the surviving state value back before the mirrors read it.
        this.#store.setAvailabilityFromDate(state.selectedAvailabilityFromDate);
        state.isPreservingCart = false;
        state.cart = null;
        state.nonConfirmedCart = null;
        state.seatingMapUrl = null;
        state.seatingMapState = null;
        this.#seating().clearLastSeatingMapLoadContext();
        state.seatingToken = null;
        state.seatingHoldTokensBySessionId = new Map();
        this.#ticketSelection().clearSelectedTickets();
        this.#secondScreen().clearHighlightedSeats();
        this.#coupons().clearCoupon();
        // The cart is going away for a new search — the member's perks belonged to the old one.
        this.#memberships.clear();
        this.#memberAccount.clear();
      }

      state.partner = filters.partner;
      state.selectedCity = filters.selectedCity!;
      state.selectedPlan = filters.selectedPlan!;
      state.selectedPlace = filters.selectedPlace!;
      state.timezone = filters.timezone;
      state.isDefaultFilter = filters.isDefaultFilter;
      state.filtersSelected = Boolean(filters.selectedCity && filters.selectedPlan && filters.selectedPlace);
      const today = new Date();
      state.fromDate = date ? date : new Date(Date.UTC(today.getFullYear(), today.getMonth(), today.getDate()));
      state.regularSessionAvailabilitySummaryByDateList = [];
      state.ticketTypes = [];
      state.datesAvailability = [];
      state.selectedSession = null;
      this.#lastReconciledSelectionKey = null;
      this.#echoSelectionToStore();
      state.isLoadingSessions = true;
      this.resetIncludeOngoing();
      if (state.filtersSelected) {
        this.#requestDatesAndSessionsAvailability();
      } else {
        this.#cancelInFlightAvailabilityRequest();
        state.isLoadingSessions = false;
      }
      this.#purchase().updatePaymentMethodsAvailable();
      this.#viewUpdate.markForCheck();
    }

    this.#secondScreen().updatePlace(filters?.selectedPlace?.id);
  }

  /** `#modalPreferredSessionSummary` — the summary the date-selector modal shows. */
  modalPreferredSessionSummary(): RegularSessionAvailabilitySummaryByDate | null {
    const list = this.#state.regularSessionAvailabilitySummaryByDateList;
    if (!list?.length) {
      return null;
    }
    const key = this.#state.selectedDateAvailability?.date;
    if (key) {
      return list.find(summary => summary.date === key) ?? list[0];
    }
    return list[0];
  }

  /**
   * Expiry-clock twin of `selectTimeslotFromSelector` (B2BO-9014, POS only): lands on the next available
   * slot of the selected day and refreshes the free seating map, but skips `selectSession`'s
   * `hideMobileDateSelector` so a timer never closes an overlay the cashier has open.
   */
  moveSelectionOffExpiredTimeslot(): void {
    const state = this.#state;
    const selectedSummary = state.selectedSession;
    if (!(selectedSummary instanceof RegularSessionAvailabilitySummaryByDate)) {
      return;
    }

    const ongoingTicketTypeNames = new Set(this.#ticketSelection().getOngoingMultiDaySelectedTicketTypeNames());
    const firstAvailableTimeslot = this.#firstAvailableTimeslot(
      selectedSummary,
      this.#dateSelectorTicketCounters(),
      ongoingTicketTypeNames,
    );
    // The presence fallback of `#firstAvailableTimeslot` can return an expired slot; landing there would reload the map on every tick.
    const nextTimeslot = firstAvailableTimeslot !== null && isLegacyTimeslotExpired(firstAvailableTimeslot) ? null : firstAvailableTimeslot;
    selectedSummary.selectedDatetime = nextTimeslot;
    this.#lastReconciledSelectionKey = nextTimeslot === null ? null : `${selectedSummary.date}|${nextTimeslot.datetime}`;
    this.#echoSelectionToStore();
    if (nextTimeslot === null) {
      // `updateFreeMapMode` would put a free-map plan back on its first seated slot, which can be the expired one.
      state.manageAsFreeSeatingMap = false;
    } else {
      this.#seating().updateFreeMapMode();
      this.#seating().loadOneStepFreeSeatingMap();
    }
    this.#ticketSelection().updateTicketTypeFields();
    this.#cart().updateNonConfirmedCart();
    this.#ticketSelection().updateCapacityLimit();
  }

  /** Disables multi-timeslot when the plan has seating; clears the cart when the search found nothing; emits `availabilityFlowEnded$`. */
  onGetSessionAvailableEnd(): void {
    const state = this.#state;
    if (this.hasPlanSeating() && !this.#purchase().isReservationSettlementActive()) {
      state.allowMultiTimeSlotSelection = false;
    }
    const hasItemsInCart = (state.nonConfirmedCart?.sessionItemsByDatetime?.size ?? 0) > 0;
    const noAvailability = !state.hasResult && state.regularSessionAvailabilitySummaryByDateList.length === 0;

    if (noAvailability && !this.#purchase().isReservationSettlementActive() && (!state.multiPlanCartEnabled || !hasItemsInCart)) {
      this.#cart().clearCart();
      this.#ticketSelection().clearSelectedTickets();
    }
    this.#availabilityFlowEnded$.next();
  }

  /** `onTimeslotActivatedFromCart` — the cart-detail output, bound by the template. */
  onTimeslotActivatedFromCart(payload: TimeslotActivationFromCartPayload): void {
    this.#activateTimeslot$.next(payload);
  }

  /** Read by `PointOfSaleComponent` to seed the shared date-selector modal (GAME-1552). */
  get preselectNextUpcomingSession(): boolean {
    return this.#state.preselectNextUpcomingSession;
  }

  /** Called once by `PointOfSaleComponent`; see {@link PosAvailabilityUiHandlers}. */
  registerUiHandlers(handlers: PosAvailabilityUiHandlers): void {
    this.#uiHandlers = handlers;
  }

  // ────────────────────────────────────────── derived reads ───────────────────────────────────────

  /**
   * Port of the legacy selector's `ngOnChanges` + `updateSelectedHour` auto-correction: keeps the
   * selection valid for the current ticket counters. See `point-of-sale/AGENTS.md`.
   */
  reconcileSelectionWithCounters(isSettleTrigger: boolean = false): void {
    const state = this.#state;
    const summaries = state.regularSessionAvailabilitySummaryByDateList;
    if (summaries.length === 0) {
      this.#lastReconciledSelectionKey = null;
      return;
    }

    const counters = this.#dateSelectorTicketCounters();
    const ongoingTicketTypeNames = new Set(this.#ticketSelection().getOngoingMultiDaySelectedTicketTypeNames());
    const selectedSummary = this.#resolveSummaryToSelect(summaries, counters, ongoingTicketTypeNames, isSettleTrigger);
    if (selectedSummary === null) {
      this.#lastReconciledSelectionKey = null;
      return;
    }

    const currentDatetime = selectedSummary.selectedDatetime;
    const isCurrentDatetimeSelectable =
      currentDatetime != null &&
      currentDatetime.isAvailable(counters, state.maxLimitTicketField, 0, state.allowMultiTimeSlotSelection, ongoingTicketTypeNames);
    if (!isCurrentDatetimeSelectable) {
      selectedSummary.selectedDatetime = this.#firstAvailableTimeslot(selectedSummary, counters, ongoingTicketTypeNames);
    }

    if (selectedSummary.selectedDatetime == null) {
      this.#lastReconciledSelectionKey = null;
      if (state.selectedSession === selectedSummary) {
        // The store mirror must drop the timeslot this reconcile just cleared.
        this.#store.selectDatetime(null);
      }
      // Legacy `updateSelectedHour` emitted the free-map pair even when no hour was selectable —
      // only a missing selected session skipped it.
      this.#emitPendingDateSelectionEffects();
      return;
    }

    const selectionKey = `${selectedSummary.date}|${selectedSummary.selectedDatetime.datetime}`;
    if (selectionKey === this.#lastReconciledSelectionKey) {
      return;
    }
    this.#lastReconciledSelectionKey = selectionKey;
    this.selectSession(selectedSummary);
    this.#emitPendingDateSelectionEffects();
  }

  reselectCartTimeslotAfterLineRemoval(): void {
    const state = this.#state;
    const selectedDatetime = state.selectedSession?.selectedDatetime?.datetime;
    if (!state.allowMultiTimeSlotSelection || selectedDatetime == null) {
      return;
    }

    const nextDatetime = pickRemainingCartTimeslot({
      cartDatetimes: this.#getCartTimeslotsWithItems(),
      selectedDatetime,
      timezone: state.timezone,
    });
    if (nextDatetime !== null) {
      this.activatePendingTimeslot(nextDatetime);
    }
  }

  resetIncludeOngoing(): void {
    this.#state.includeOngoing = true;
  }

  selectDate(dateAvailability: DateAvailability): void {
    const state = this.#state;
    state.isDateChangeInProgress = true;
    this.#hasPendingDateSelectionEffects = true;
    this.#lastReconciledSelectionKey = null;

    if (state.manageAsFreeSeatingMap) {
      const seatingSelectionSnapshot = this.#seating().captureSeatingSelectionSnapshot();
      // A real-time (OneBox) basket belongs to one session and the widget deletes it when the reload
      // re-initialises the iframe with another `session_id`, so the multi-plan flow cannot carry those seats
      // across a date change: keeping them would leave a line whose seats nobody holds. Only the anchor's
      // selection goes; the other sessions keep theirs and the snapshot release below sends the delete-order.
      if (state.isRealTimeSeating) {
        this.#seating().discardRealTimeSelection();
      }
      const shouldClearSelection = !state.multiPlanCartEnabled || !this.#hasMultiplanSeatingFlowContext();
      if (shouldClearSelection) {
        this.#cart().onClearSelectionRequested();
      }
      this.#seating().releaseDroppedSeatingSelection(seatingSelectionSnapshot);
      // A real-time (OneBox) map stays mounted: tearing the iframe down here kills it before it can
      // process the `delete-order` just sent, and the basket would live on for ten minutes. The next
      // free-map load re-initialises the same iframe with the new session, which makes the widget
      // delete the stale basket itself; `PosSeatingService.loadOneStepFreeSeatingMap` tears the map
      // down when the new date has nothing to replace it with — GIT-1269.
      if (state.isRealTimeSeating) {
        state.isRealTimeMapAwaitingSession = true;
      } else {
        state.seatingMapUrl = null;
        state.seatingMapState = null;
      }
      this.#seating().clearLastSeatingMapLoadContext();
    }

    const prevDatetime = state.selectedSession?.selectedDatetime?.datetime;
    if (
      state.allowMultiTimeSlotSelection &&
      prevDatetime != null &&
      prevDatetime !== '' &&
      this.#cartDatetimeMatchesCalendarDate(prevDatetime, dateAvailability.date)
    ) {
      state.preferredCartDatetimeAfterDateChange = this.#normalizeOssDatetime(prevDatetime);
    } else {
      state.preferredCartDatetimeAfterDateChange = null;
    }

    state.selectedDateAvailability = dateAvailability;
    state.selectedSession = null;
    this.#store.selectDate(dateAvailability.date);
    // The pick clears `selectedSession`, so the previous day's timeslot must not outlive it here.
    this.#store.selectDatetime(null);
    const nextDate = moment(dateAvailability.date).tz(state.timezone).toDate();
    state.fromDate = new Date(Date.UTC(nextDate.getFullYear(), nextDate.getMonth(), nextDate.getDate()));
    state.regularSessionAvailabilitySummaryByDateList = [];
    this.#getSessionsForSelectedDate({ daysWithActiveSession: 1 });
  }

  /** Date-selector intent: resolves the legacy pill from the mirror before the existing `selectDate` path. */
  selectDateFromSelector(dateIso: string): void {
    const dateAvailability = this.#state.datesAvailability.find(date => date.date === dateIso);
    this.selectDate(dateAvailability ?? new DateAvailability(dateIso, true));
  }

  /** Auto-selects the session the flow should land on. */
  selectDefaultSessionForAdvancedFlow(): void {
    const state = this.#state;
    const cartTimeslots = this.#getCartTimeslotsWithItems();
    const preferredCartDatetime = state.preferredCartDatetimeAfterDateChange;
    state.preferredCartDatetimeAfterDateChange = null;
    const shouldSelectCartMatchingSession = state.allowMultiTimeSlotSelection && cartTimeslots.length > 0;
    if (!shouldSelectCartMatchingSession) {
      this.#reseedTicketCountsAfterDateChange();
      this.#selectDefaultSessionForAdvancedFlowSuper();
      this.ensureSelectedSessionForCalendarWithMultiTimeslotCart();
      return;
    }
    const calendarDate = state.selectedDateAvailability?.date;
    const cartTimeslotsOrdered = this.#orderCartTimeslotsForCalendar(cartTimeslots, calendarDate, preferredCartDatetime);
    if (state.regularSessionAvailabilitySummaryByDateList.length > 0) {
      for (const cartDatetime of cartTimeslotsOrdered) {
        if (calendarDate !== undefined && !this.#cartDatetimeMatchesCalendarDate(cartDatetime, calendarDate)) {
          continue;
        }
        const normalizedCartDatetime = this.#normalizeOssDatetime(cartDatetime);
        const hasMatchingSession = state.regularSessionAvailabilitySummaryByDateList.some(summary =>
          summary.sessionAvailabilityByDatetimeList.some(avail => this.#isMatchingDatetime(avail, normalizedCartDatetime)),
        );
        if (hasMatchingSession) {
          this.activatePendingTimeslot(cartDatetime);
          return;
        }
      }
    }
    this.#reseedTicketCountsAfterDateChange();
    this.#selectDefaultSessionForAdvancedFlowSuper();
    this.ensureSelectedSessionForCalendarWithMultiTimeslotCart();
  }

  /**
   * The ongoing-driven paths must stay inert while include_ongoing is off, and they run before a
   * session is picked, so this reads the date the operator chose rather than the selected session.
   */
  #pickedDateHasOngoingBuckets(): boolean {
    const state = this.#state;
    const pickedDate = state.selectedDateAvailability?.date;
    if (pickedDate === undefined) {
      return false;
    }

    return state.regularSessionAvailabilitySummaryByDateList.some(
      summary =>
        summary.date < pickedDate &&
        summary.sessionAvailabilityByDatetimeList.length > 0 &&
        OngoingSessionUtil.isBucketOngoingOnDate(summary, pickedDate, state.timezone),
    );
  }

  #reseedTicketCountsAfterDateChange(): void {
    const state = this.#state;
    if (!state.isDateChangeInProgress || !state.allowMultiTimeSlotSelection || !this.#pickedDateHasOngoingBuckets()) {
      return;
    }
    const productCounts = this.#shopProductCounts();
    if (state.nonConfirmedCart?.sessionItemsByDatetime?.size) {
      this.#ticketSelection().restoreTicketCountsFromCart(null);
    } else {
      state.selectedTicketsBySessionId = new Map();
      state.selectedTicketsBySessionType = new Map();
    }
    productCounts.bySessionId.forEach((units, sessionId) => state.selectedTicketsBySessionId.set(sessionId, units));
    productCounts.bySessionType.forEach((units, name) => state.selectedTicketsBySessionType.set(name, units));
  }

  #shopProductCounts(): { bySessionId: Map<string, number>; bySessionType: Map<string, number> } {
    const state = this.#state;
    const bySessionId = new Map<string, number>();
    const bySessionType = new Map<string, number>();
    state.productTypes.forEach(productType => {
      const sessionIdStr = productType.sessionId + '';
      const units = state.selectedTicketsBySessionId.get(sessionIdStr);
      if (units !== undefined) {
        bySessionId.set(sessionIdStr, units);
      }
      const unitsByName = state.selectedTicketsBySessionType.get(productType.name);
      if (unitsByName !== undefined) {
        bySessionType.set(productType.name, unitsByName);
      }
    });

    return { bySessionId, bySessionType };
  }

  selectedSessionHasSeating(): boolean {
    return (
      this.#state.selectedSession?.selectedDatetime?.sessionAvailabilityList.some(
        session => session.seating !== null && session.seating !== undefined,
      ) ?? false
    );
  }

  // ─────────────────────────────────────── sibling strategies ─────────────────────────────────────

  selectSession(
    selectedSession: SessionAvailabilitySummaryByDate,
    options: PosTimeslotSelectionOptions = REFRESHING_TIMESLOT_SELECTION,
  ): void {
    const state = this.#state;
    state.selectedSession = selectedSession;
    this.#echoSelectionToStore();
    this.#ticketSelection().updateTicketTypeFields();
    if (options.refreshCart) {
      this.#cart().updateNonConfirmedCart();
    }
    if (!state.isDateChangeInProgress) {
      this.#uiHandlers?.hideMobileDateSelector();
    }
    this.#ticketSelection().updateCapacityLimit();
  }

  /**
   * Date-selector intent: resolves the legacy timeslot from the mirror, then runs the legacy
   * `selectHour` chain (free-map refresh, then the selection itself).
   */
  selectTimeslotFromSelector(datetimeIso: string, options: PosTimeslotSelectionOptions = REFRESHING_TIMESLOT_SELECTION): void {
    const state = this.#state;
    const summary = this.#findSummaryOwningDatetime(datetimeIso);
    if (summary === null) {
      return;
    }
    const timeslot = summary.sessionAvailabilityByDatetimeList.find(availability => this.#isMatchingDatetime(availability, datetimeIso));
    if (timeslot === undefined || summary.selectedDatetime === timeslot) {
      return;
    }
    // Same reason as in `selectDate`: a real-time basket belongs to the previous timeslot's session, so it is
    // released here (the reload would delete it anyway), and the map stays mounted but inert until the reload
    // re-initialises it, or a click lands on the previous session under the new timeslot.
    if (state.isRealTimeSeating) {
      const seatingSelectionSnapshot = this.#seating().captureSeatingSelectionSnapshot();
      if (this.#seating().discardRealTimeSelection()) {
        this.#seating().releaseDroppedSeatingSelection(seatingSelectionSnapshot);
      }
      state.isRealTimeMapAwaitingSession = true;
    }
    summary.selectedDatetime = timeslot;
    this.#seating().updateFreeMapMode();
    this.#seating().loadOneStepFreeSeatingMap();
    this.selectSession(summary, options);
    if (!options.refreshCart) {
      // The caller's counter write ends in a reconcile; without the key it would re-select this
      // timeslot and refresh the draft cart a second time (spec rule S1).
      this.#lastReconciledSelectionKey = `${summary.date}|${timeslot.datetime}`;
    }
  }

  /** Contract-setter entry point: the store owns this field after a settle, so both must be written. */
  setSelectedAvailabilityFromDate(value: string | null): void {
    this.#state.selectedAvailabilityFromDate = value;
    this.#store.setAvailabilityFromDate(value);
  }

  /** Visually active tab, derived from the component's tab index (one-stop-shop `activeTab()`). */
  #activeTab(): OssTab {
    const tabs = this.#state.availableTabs();
    return tabs[this.#activeTabIndex()] ?? OssTab.TICKETS_AND_ADDONS;
  }

  #activeTabIndex(): number {
    return this.#uiHandlers?.activeTabIndex() ?? 0;
  }

  /**
   * Cross-domain calls are resolved **lazily**: availability both triggers and is triggered by the
   * other domains (setup → `loadNewSearch`, cart → timeslot activation), so eager field-level
   * `inject()` on both sides of such a pair would be a DI construction cycle (NG0200). Resolving on
   * first use keeps the graph acyclic at construction time while still routing every behaviour to its
   * single owner.
   */
  #cart(): PosCartService {
    return this.#injector.get(PosCartService);
  }

  #cartDatetimeMatchesCalendarDate(cartDatetime: string, calendarDate: string): boolean {
    return moment(cartDatetime).tz(this.#state.timezone).format('YYYY-MM-DD') === calendarDate;
  }

  #compareCartTimeslotsForDefaultSession(a: string, b: string, calendarDate: string, preferredCartDatetime: string | null): number {
    const onSelectedDay = (dt: string): number => (this.#cartDatetimeMatchesCalendarDate(dt, calendarDate) ? 0 : 1);
    const dayRank = onSelectedDay(a) - onSelectedDay(b);
    if (dayRank !== 0) {
      return dayRank;
    }
    if (preferredCartDatetime !== null) {
      const preferredFirst = (dt: string): number => (this.#normalizeOssDatetime(dt) === preferredCartDatetime ? 0 : 1);
      const prefRank = preferredFirst(a) - preferredFirst(b);
      if (prefRank !== 0) {
        return prefRank;
      }
    }
    return a.localeCompare(b);
  }

  #coupons(): PosCouponsService {
    return this.#injector.get(PosCouponsService);
  }

  // ─────────────────────────────────────────── internals ──────────────────────────────────────────

  /** Dates overload only — the `TicketType` overload belongs to the ticket-selection domain. */
  #filterOutWhenOnlyGlobalAddons(dates: RegularSessionAvailabilitySummaryByDate[]): RegularSessionAvailabilitySummaryByDate[] {
    if (!(this.#optimizely.isFeatureEnabled(ADDONS_INDEPENDENT_FROM_EXPLODE_PIPE_FEATURE) ?? false)) {
      return dates;
    }

    if (dates.length === 0) {
      return dates;
    }

    return filterOutGlobalAddonOnlySessions(dates);
  }

  #getCartTimeslotsWithItems(): string[] {
    const cartDatetimes = this.#state.nonConfirmedCart?.sessionItemsByDatetime;
    if (!cartDatetimes?.size) {
      return [];
    }

    return [...cartDatetimes.keys()].filter(key => {
      if (key === 'products') return false;
      const sessions = cartDatetimes.get(key);
      return sessions && sessions.length > 0;
    });
  }

  /** Dates + sessions for the current from-date. Mirrors `BaseTicketingComponent.requestDatesAndSessionsAvailability`. */
  #requestDatesAndSessionsAvailability(params: GetSessionAvailableParams = {}): void {
    this.getSessionAvailable({ ...params, onlyGetSessions: false });
  }

  /** Sessions for the already-selected calendar date. Mirrors `BaseTicketingComponent.getSessionsForSelectedDate`. */
  #getSessionsForSelectedDate(params: GetSessionAvailableParams = {}): void {
    this.getSessionAvailable({ ...params, onlyGetSessions: true });
  }

  /**
   * Legacy wrapped the whole request in one subscription whose `finalize` also fired when the
   * unsubscribe caught it still resolving the plan; the store's `superseded` event only covers a
   * fetch that was already dispatched, so that early window runs `onGetSessionAvailableEnd` here.
   */
  #cancelInFlightAvailabilityRequest(): void {
    const isPlanResolutionInFlight = this.#changePlanSubscription?.closed === false;
    this.#changePlanSubscription?.unsubscribe();
    // The previous store fetch would otherwise keep running for the whole plan round-trip,
    // and a late `settled` would replay its side effects onto the new selection.
    this.#store.fetchAvailability({ kind: 'cancel' });
    if (isPlanResolutionInFlight) {
      this.onGetSessionAvailableEnd();
    }
  }

  /** The legacy error writes of the old `getSessionAvailable` error handler. */
  #applyFetchFailure(error: unknown): void {
    const state = this.#state;
    state.isLoadingSessions = false;
    state.isLoadingDates = false;
    state.error = true;
    state.errorObject = error;
    // No free-map load will follow, so a real-time map kept mounted by `selectDate` would stay inert.
    this.#seating().tearDownRealTimeMapLeftMounted();
    this.#viewUpdate.detectChanges();
    this.#resetPreservingCartAfterRender();
  }

  /** Translates one legacy invocation into the store request. */
  #buildAvailabilityRequest(params: GetSessionAvailableParams, onlyGetSessions: boolean): PosAvailabilityRequest {
    const state = this.#state;
    const isModifyOrderEntry = this.#purchase().isModifyOrderEntry();
    const useCacheEnabled = isModifyOrderEntry ? false : (params.useCacheEnabled ?? state.useCacheEnabled);
    const rescheduleOrderId = this.#getRescheduleOrderId();

    return {
      accumulateDates: params.accumulateDates ?? false,
      businessId: state.businessId,
      cache: {
        ttlSeconds: params.cacheTimeoutInSeconds ?? state.cacheTimeoutInSeconds,
        useCache: useCacheEnabled,
        useSwr: state.useCacheSwrEnabled,
      },
      // Legacy read the *state* window here, never the per-call override.
      capnSingleDayGuard: state.daysWithActiveSession === 1 && state.partner?.id === CAPN_ID && state.channel === Channel.BoxOffice,
      channel: this.#getAvailabilityQueryChannel(),
      channelId: this.getAvailabilityQueryChannelId(),
      contentLanguage: this.#translate.currentLang,
      dataConsistency: this.canApplyAvailabilityPerformance() ? 'materialized' : 'real_time',
      daysWithActiveSession: params.daysWithActiveSession ?? state.daysWithActiveSession,
      // Wall clock, never an instant: the library mappers reject a `Z` suffix. See the model type.
      fromDate: toRequestWallClock(state.fromDate),
      includeOngoing: params.includeOngoing ?? this.getIncludeOngoing(),
      includeOngoingForSessions: this.getIncludeOngoingForSessionsForDate(),
      includeOverrideCapacity: state.includeOverrideCapacity ? true : undefined,
      includeShopProducts: state.includeShopProducts,
      includeSoldOutSessions: isModifyOrderEntry ? true : (params.includeSoldOutSessions ?? state.includeSoldOutSessions),
      includeTimeSlotCapacity: state.includeTimeSlotCapacity ? true : undefined,
      isHidden: state.isHidden,
      modifyOrderChannels: this.#getModifyOrderChannels(),
      modifyOrderSessionStartsAt: this.#getModifyOrderSessionStartsAt(),
      needsAvailabilityFromDateSeed: !state.selectedAvailabilityFromDate && state.showDateSelectorFrom,
      onlyGetSessions,
      partnerId: state.partner!.id.toString(), // Non-null: `getSessionAvailable` returns before dispatching without a partner.
      placeId: state.selectedPlace.id.toString(),
      planId: state.selectedPlan.id.toString(),
      rescheduleOrderId: rescheduleOrderId === undefined ? undefined : rescheduleOrderId.toString(),
      sessionTypeIds: state.sessionTypeIds?.map(sessionTypeId => sessionTypeId.toString()),
      timezone: state.timezone,
    };
  }

  /** The counters the date selector sees: cart counts minus retail product rows. */
  #dateSelectorTicketCounters(): Map<string, number> {
    return new FilterProductSessionsPipe().transform(this.#state.selectedTicketsBySessionType, this.#state.productSessions);
  }

  /** `selectedDatetime` is left `undefined` by some legacy writers while the store models it as `null`. */
  #echoSelectionToStore(): void {
    const selectedSession = this.#state.selectedSession;
    this.#store.selectDate(selectedSession?.date ?? null);
    this.#store.selectDatetime(selectedSession?.selectedDatetime?.datetime ?? null);
  }

  /** Legacy emitted the free-map pair only for a selection that followed a date-pill change. */
  #emitPendingDateSelectionEffects(): void {
    if (!this.#hasPendingDateSelectionEffects) {
      return;
    }
    this.#hasPendingDateSelectionEffects = false;
    this.#seating().updateFreeMapMode();
    this.#seating().loadOneStepFreeSeatingMap();
  }

  #findSummaryOwningDatetime(datetime: string): RegularSessionAvailabilitySummaryByDate | null {
    return (
      this.#state.regularSessionAvailabilitySummaryByDateList.find(summary =>
        summary.sessionAvailabilityByDatetimeList.some(availability => this.#isMatchingDatetime(availability, datetime)),
      ) ?? null
    );
  }

  /** Port of `getFirstAvailableHourForRegularSession`: day parts in order, then the presence fallback. */
  #firstAvailableTimeslot(
    summary: RegularSessionAvailabilitySummaryByDate,
    counters: Map<string, number>,
    ongoingTicketTypeNames: ReadonlySet<string>,
  ): SessionAvailabilitySummaryByDatetime | null {
    const state = this.#state;
    const isAvailable = (timeslot: SessionAvailabilitySummaryByDatetime): boolean =>
      timeslot.isAvailable(counters, state.maxLimitTicketField, 0, state.allowMultiTimeSlotSelection, ongoingTicketTypeNames);
    const firstAvailable = (timeslots: SessionAvailabilitySummaryByDatetime[]): SessionAvailabilitySummaryByDatetime | null =>
      timeslots.find(isAvailable) ?? null;

    if (state.preselectNextUpcomingSession) {
      const nextUpcoming = pickNextUpcomingSession(
        [...summary.morningSessions, ...summary.afternoonSessions, ...summary.eveningSessions, ...summary.nightSessions].filter(
          isAvailable,
        ),
      );
      if (nextUpcoming !== null) {
        return nextUpcoming;
      }
    }

    const availableTimeslot =
      firstAvailable(summary.morningSessions) ??
      firstAvailable(summary.afternoonSessions) ??
      firstAvailable(summary.eveningSessions) ??
      firstAvailable(summary.nightSessions);
    if (availableTimeslot !== null) {
      return availableTimeslot;
    }

    if (counters.size === 0) {
      return null;
    }
    const presentTimeslots = summary.sessionAvailabilityByDatetimeList.filter(timeslot =>
      timeslot.isTicketTypePresentInAvailabilitySummary(counters),
    );

    return presentTimeslots.length === 0 ? (summary.sessionAvailabilityByDatetimeList[0] ?? null) : null;
  }

  #handleFlowEvent(event: PosAvailabilityFlowEvent): void {
    switch (event.kind) {
      case 'datesResolved':
        this.#mirrorDatesResolved(event);
        break;
      case 'settled':
        this.#mirrorSettled(event);
        break;
      case 'failed':
        this.#state.isLoadingDateSessions = true;
        this.#applyFetchFailure(event.error);
        break;
      case 'superseded':
        this.onGetSessionAvailableEnd();
        break;
    }
  }

  /** Values the library models do not carry. */
  #legacyAdapterContext(): PosLegacyAvailabilityContext {
    const state = this.#state;

    return {
      canOverrideCapacity: state.includeOverrideCapacity === true,
      channel: this.#getAvailabilityQueryChannel(),
      groupingMode: 'operatingDay',
      minutesBeforeToExpire: state.minutesBeforeToExpire ?? undefined,
      overrideMaximumTickets: state.overrideMaximumTickets ?? undefined,
      placeId: state.selectedPlace?.id,
    };
  }

  #mirrorDatesResolved(event: PosAvailabilityDatesResolvedEvent): void {
    const state = this.#state;
    const legacyDates = [...adaptLegacyDates(event.dates, event.nextAvailableDate).dates.values()];

    state.nextAvailableDate = event.nextAvailableDate ?? '';
    state.datesAvailability = event.accumulateDates ? state.datesAvailability.concat(legacyDates) : legacyDates;
    state.selectedAvailabilityFromDate = event.selectedAvailabilityFromDate;
    if (event.selectedDate !== null && legacyDates.length > 0) {
      state.selectedDateAvailability = legacyDates[0];
      // `fromDateIso` is a wall clock, so it must be read back as UTC midnight explicitly.
      state.fromDate = new Date(`${event.fromDateIso.slice(0, 10)}T00:00:00.000Z`);
    }
    // `isLoadingDates` stays latched: legacy cleared it only in the final subscribe handlers, and
    // dropping it here reopens the `loadMoreDays` guard while the sessions leg is still in flight.
  }

  /** The legacy `getSessionAvailable` next-handler chain, in order. Runs per emission (twice under SWR). */
  #mirrorSettled(event: PosAvailabilitySettledEvent): void {
    const state = this.#state;
    const refreshesSettledDay = event.refreshesSettledDay === true;
    state.isLoadingSessions = false;
    state.isLoadingDates = false;
    state.isLoadingDateSessions = false;
    // The seed-only path emits no `datesResolved`, so the store signal is the only source here.
    // Untracked: a cache hit runs this handler synchronously inside whoever dispatched the fetch.
    state.selectedAvailabilityFromDate = untracked(this.#store.selectedAvailabilityFromDate);

    // The zero-dates settle carries store defaults ('' timezone after a reset); legacy built that
    // synthetic response from the component's own fields, so these must stay identity writes below.
    const summary: SessionAvailabilitySummary = event.isEmptyDatesResult
      ? new SessionAvailabilitySummary(
          state.timezone,
          state.allowMultiSessionPurchase,
          state.hasExplodePipe,
          [],
          state.nextAvailableDate,
          state.sessionSelectorType,
        )
      : adaptLegacySummary(event.summary, event.orderedDaySummaries, this.#legacyAdapterContext());
    state.hasResult = summary.regularSessionAvailabilitySummaryByDates.length > 0;
    if (!refreshesSettledDay) {
      this.#sendLoadTicketingEvent(state.hasResult);
    }
    const availabilityDates = this.#filterOutWhenOnlyGlobalAddons(summary.regularSessionAvailabilitySummaryByDates);
    state.hasResult = availabilityDates.length > 0;
    state.regularSessionAvailabilitySummaryByDateList = availabilityDates;
    summary.productSessions?.forEach(newProductSession => {
      if (!state.productSessions.some(existingProductSession => existingProductSession.id === newProductSession.id)) {
        state.productSessions.push(newProductSession);
      }
    });
    summary.getProductTypes()?.forEach(newProductType => {
      if (!state.productTypes.some(existingProductType => existingProductType.sessionId === newProductType.sessionId)) {
        state.productTypes.push(newProductType);
      }
    });
    state.allowMultiSessionPurchase = summary.allowMultiSessionPurchase;
    state.hasExplodePipe = summary.hasExplodePipe;
    state.timezone = summary.timezone;
    if (!refreshesSettledDay) {
      this.#resetScroll();
    }
    this.selectDefaultSessionForAdvancedFlow();
    this.#ticketSelection().updateTicketTypeFields();
    state.currency = this.getCurrency();
    state.sessionSelectorType = summary.sessionSelectorType as SessionSelectorType;
    this.#seating().updateFreeMapMode();
    this.#purchase().applyModifyOrderSharedAvailabilityRules();
    state.sessionAvailableReady.next();
    this.#viewUpdate.markForCheck();
    // Legacy ran this from the selector's `ngOnChanges`, i.e. right after the handler returned.
    this.reconcileSelectionWithCounters(true);
    this.#resetPreservingCartAfterRender();
  }

  /** Port of the legacy `#preferredSessionAmong`. */
  #preferredSummaryAmong(candidates: RegularSessionAvailabilitySummaryByDate[]): RegularSessionAvailabilitySummaryByDate | null {
    if (candidates.length === 0) {
      return null;
    }
    const selectedKey = this.#state.selectedDateAvailability?.date;

    return (selectedKey ? candidates.find(candidate => candidate.date === selectedKey) : undefined) ?? candidates[0];
  }

  /** The selected summary, or the one the legacy selector would have auto-selected. */
  #resolveSummaryToSelect(
    summaries: RegularSessionAvailabilitySummaryByDate[],
    counters: Map<string, number>,
    ongoingTicketTypeNames: ReadonlySet<string>,
    isSettleTrigger: boolean,
  ): RegularSessionAvailabilitySummaryByDate | null {
    const state = this.#state;
    const selectedSession = state.selectedSession;
    if (selectedSession instanceof RegularSessionAvailabilitySummaryByDate) {
      return selectedSession;
    }

    if (isSettleTrigger) {
      // The legacy settle-time auto-select picked from the RAW list, gated on calendar pills:
      // counters must not move the selection off the operator's picked date.
      return state.datesAvailability.length > 0 ? this.#preferredSummaryAmong(summaries) : null;
    }

    const availableSummaries = summaries.filter(summary =>
      summary.isAvailable(counters, state.maxLimitTicketField, 0, state.allowMultiTimeSlotSelection, ongoingTicketTypeNames),
    );
    if (availableSummaries.length > 0) {
      return this.#preferredSummaryAmong(availableSummaries);
    }

    // Legacy fell back to the raw list only once the calendar had pills.
    return state.datesAvailability.length > 0 ? this.#preferredSummaryAmong(summaries) : null;
  }

  /** Same body, so `daysWithActiveSession` stays consistent across both call sites. */
  #getMaxPurchasableDays(): number {
    const onsiteSetup = this.#state.onsiteSetupSelected;
    if (!onsiteSetup) {
      return MAX_PURCHASABLE_DAYS_ONE_STEP;
    }
    if (onsiteSetup.max_purchasable_days > MAX_PURCHASABLE_DAYS_ONE_STEP) {
      return MAX_PURCHASABLE_DAYS_ONE_STEP;
    }
    return onsiteSetup.max_purchasable_days;
  }

  /**
   * The availability query runs on the original order's channel while a `modify_order`
   * modification is active, so the operator sees the same catalogue the buyer bought from.
   */
  #getAvailabilityQueryChannel(): Channel {
    const order = this.#state.modifiedOrder();
    if (this.#purchase().isModifyOrderMode() && order != null) {
      return getModifyOrderOriginalChannel(order);
    }
    return this.#state.channel;
  }

  #getModifyOrderChannels(): PosModifyOrderChannels | undefined {
    const order = this.#state.modifiedOrder();
    if (!this.#purchase().isModifyOrderMode() || order == null) {
      return undefined;
    }
    return {
      onsiteSetupChannelId: this.#state.channelId,
      original: getModifyOrderOriginalChannelId(order),
    };
  }

  /** The session the modify-order preselection lands on, so the sessions_for_date window of its day asks for it alone. */
  #getModifyOrderSessionStartsAt(): string | undefined {
    if (!this.#purchase().isModifyOrderMode()) {
      return undefined;
    }
    return this.#purchase().getModifyOrderFirstSessionStartsAt() ?? undefined;
  }

  /**
   * Composed with `#isUpgradeSeatingMode()`.
   *
   * The predicate itself lives on `PosPurchaseService` (`getModifyOrderMode`), which additionally
   * requires the loaded order to be the one `?modified_order_id=` names — a stale `history.state.order`
   * must not turn a normal sale into a reschedule. A `modify_order` entry falls back to the URL id
   * while the order fetch is still in flight.
   */
  #getRescheduleOrderId(): number | undefined {
    if (this.#purchase().isUpgradeSeatingMode()) {
      return this.#state.modifiedOrder()?.id;
    }
    if (!this.#purchase().isModifyOrderEntry()) {
      return undefined;
    }
    return this.#state.modifiedOrder()?.id ?? this.#purchase().getModifiedOrderIdFromUrl();
  }

  /** `hasMultiplanSeatingFlowContext` getter. */
  #hasMultiplanSeatingFlowContext(): boolean {
    const state = this.#state;
    return this.#ticketingContext.hasMultiplanSeatingFlowContext({
      cart: state.cart,
      nonConfirmedCart: state.nonConfirmedCart,
      sessionSummaries: state.regularSessionAvailabilitySummaryByDateList,
      userAttributes: state.selectedPlan ? { plan_id: state.selectedPlan.id.toString() } : undefined,
    });
  }

  #isActiveTabDateDependant(): boolean {
    return this.#setup().isTabDateDependant(this.#activeTabIndex());
  }

  #isMatchingDatetime(datetimeAvailability: { datetime: string }, datetime: string): boolean {
    return this.#normalizeOssDatetime(datetimeAvailability.datetime) === this.#normalizeOssDatetime(datetime);
  }

  #normalizeOssDatetime(isoOrDateString: string): string {
    return new Date(isoOrDateString).toISOString().replace(/\.\d+Z$/, 'Z');
  }

  #orderCartTimeslotsForCalendar(
    cartTimeslots: string[],
    calendarDate: string | undefined,
    preferredCartDatetime: string | null,
  ): string[] {
    if (calendarDate === undefined || cartTimeslots.length < 2) {
      return cartTimeslots;
    }
    return [...cartTimeslots].sort((a, b) => this.#compareCartTimeslotsForDefaultSession(a, b, calendarDate, preferredCartDatetime));
  }

  /** Same-venue fast path keeps the custom-tile counters in sync with the cart. */
  #preserveCartStateForCustomTabs(): void {
    const state = this.#state;
    if (!state.customTabSignals().length || (!state.cart && !state.nonConfirmedCart)) {
      return;
    }
    const cartToCheck = state.nonConfirmedCart || state.cart;
    cartToCheck?.sessionItemsByDatetime?.forEach(sessions => {
      sessions.forEach(cartSession => {
        if (cartSession.units > 0) {
          this.#setup().updateCustomTilesAvailability(cartSession.sessionId, cartSession.units);
        }
      });
    });
  }

  #purchase(): PosPurchaseService {
    return this.#injector.get(PosPurchaseService);
  }

  /**
   * Keeps the sessions the operator still has selected. Called from both `getSessionAvailable`
   * handlers.
   */
  #resetPreservingCartAfterRender(): void {
    queueMicrotask(() => {
      const state = this.#state;
      if (this.#hasMultiplanSeatingFlowContext()) {
        const currentPlanId = state.selectedPlan?.id ?? 0;
        if (currentPlanId > 0) {
          if (state.nonConfirmedCart) {
            const activeSessionIds = new Set(
              [...state.selectedTicketsBySessionId.keys()].map(id => parseInt(id, 10)).filter((id): id is number => !Number.isNaN(id)),
            );
            state.nonConfirmedCart = CartUtil.removeSessionsByMainPlanId(
              state.nonConfirmedCart,
              currentPlanId,
              activeSessionIds.size > 0 ? activeSessionIds : undefined,
            );
          }
          if (state.cart?.id && state.partner) {
            const removeQuery: RemovePlanFromCartQuery = {
              cart: state.cart,
              cartId: state.cart.id,
              mainPlanId: currentPlanId,
              partnerId: state.partner.id,
              useSessionItemLines: true,
            };
            state.lastCartWrite = null;
            this.#core
              .removePlanFromCart(removeQuery)
              .pipe(takeUntilDestroyed(this.#destroyRef))
              .subscribe(cart => {
                state.cart = cart ?? null;
                if (state.cart) {
                  this.#core.publishCart(state.cart);
                } else {
                  this.#core.clearCart();
                }
                this.#viewUpdate.markForCheck();
              });
          }
        }
        state.isPreservingCart = true;
      } else {
        state.isPreservingCart = false;
      }
    });
  }

  /** Composed with `#scrollToBoxOfficeContent`. */
  #resetScroll(): void {
    if (this.#state.channel === Channel.Kiosk) {
      return;
    }
    if (this.#dualScreenStorage.containsData()) {
      ScrollUtils.scrollToTop();
    } else if (window.innerWidth < SCROLL_RESET_DESKTOP_BREAKPOINT) {
      this.#scrollToBoxOfficeContent();
    }
  }

  #scrollToBoxOfficeContent(): void {
    setTimeout(() => {
      const boxOfficeContent =
        document.getElementsByClassName('box-office-content__content-card')?.[0] ||
        document.getElementsByClassName('box-office-content')?.[0];
      const boxOfficeContentPosition = boxOfficeContent?.getBoundingClientRect().top || 0;
      window.scrollTo({
        behavior: 'smooth',
        top: boxOfficeContentPosition - document.body.getBoundingClientRect().top - 100,
      });
    });
  }

  #seating(): PosSeatingService {
    return this.#injector.get(PosSeatingService);
  }

  #secondScreen(): PosSecondScreenService {
    return this.#injector.get(PosSecondScreenService);
  }

  /** Fallback default-session selection used by `selectDefaultSessionForAdvancedFlow`. */
  #selectDefaultSessionForAdvancedFlowSuper(): void {
    const state = this.#state;
    const hasOnlyShopProductsSelected = this.#selectedTicketsContainOnlyShopProducts();
    const hasAvailableSessions = state.regularSessionAvailabilitySummaryByDateList.length > 0;

    if (hasOnlyShopProductsSelected && !state.selectedSession && hasAvailableSessions) {
      const list = state.regularSessionAvailabilitySummaryByDateList;
      const firstAvailableSession =
        state.selectedDateAvailability?.date != null
          ? (list.find(s => s.date === state.selectedDateAvailability.date) ?? list[0])
          : list[0];
      state.selectedSession = firstAvailableSession;

      if (firstAvailableSession.sessionAvailabilityByDatetimeList.length > 0) {
        state.selectedSession.selectedDatetime = firstAvailableSession.sessionAvailabilityByDatetimeList[0];
      }
      this.#echoSelectionToStore();

      return;
    }

    if (state.selectedTicketsBySessionType.size === 0 && !state.selectedSession) {
      this.#selectFirstAvailableSessionForSelectedTickets(state.regularSessionAvailabilitySummaryByDateList);
      const session = state.selectedSession as SessionAvailabilitySummaryByDate | null;
      if (session) {
        session.selectNextAvailableDatetime(state.selectedTicketsBySessionType, state.maxLimitTicketField, {
          preferNextUpcoming: state.preselectNextUpcomingSession,
        });
      }
      this.#echoSelectionToStore();
    }
  }

  #selectedTicketsContainOnlyShopProducts(): boolean {
    const state = this.#state;
    if (state.selectedTicketsBySessionId.size === 0) {
      return false;
    }

    let hasAnyProductWithUnits = false;

    for (const [sessionId] of state.selectedTicketsBySessionId.entries()) {
      const sessionIdNum = parseInt(sessionId);
      const isShopProduct = state.productTypes.some(pt => pt.sessionId === sessionIdNum && pt.isShopProduct === true);
      if (!isShopProduct) {
        return false;
      }
      hasAnyProductWithUnits = true;
    }

    return hasAnyProductWithUnits;
  }

  /** Prefers the calendar-selected date, then the first summary that fits the selection. */
  #selectFirstAvailableSessionForSelectedTickets(sessions: SessionAvailabilitySummaryByDate[]): void {
    const state = this.#state;
    const selectedKey = state.selectedDateAvailability?.date;
    const orderedSessions =
      selectedKey && sessions.length > 1
        ? [...sessions.filter(s => s.date === selectedKey), ...sessions.filter(s => s.date !== selectedKey)]
        : sessions;
    const ongoingNames = new Set(this.#ticketSelection().getOngoingMultiDaySelectedTicketTypeNames());
    for (const sessionDate of orderedSessions) {
      if (sessionDate.isAvailable(state.selectedTicketsBySessionType, undefined, undefined, undefined, ongoingNames)) {
        state.selectedSession = sessionDate;
        break;
      }
    }
  }

  #sendLoadTicketingEvent(hasResult: boolean): void {
    const state = this.#state;
    const ticketingData: LoadTicketingData = {
      city_id: state.selectedCity.id,
      city_name: state.selectedCity.title,
      default_filter: state.isDefaultFilter,
      has_results: hasResult,
      obo_flow_type: state.onsiteSetupSelected?.obo_flow_type,
      place_id: state.selectedPlace.id,
      place_name: state.selectedPlace.title,
      plan_id: state.selectedPlan.id,
      plan_name: state.selectedPlan.title,
      time: new Date().toISOString(),
    };
    this.#tracking.track(new LoadBoxOfficeEvent(ticketingData));
    this.#viewUpdate.markForCheck();
  }

  #setup(): PosSetupService {
    return this.#injector.get(PosSetupService);
  }

  #shouldResetCartForNewSearch(newFilters: SearchFilter, date?: Date): boolean {
    const state = this.#state;
    if (!state.multiPlanCartEnabled && state.selectedCity?.id !== newFilters.selectedCity?.id) {
      return true;
    }
    if (
      state.manageAsFreeSeatingMap &&
      date != null &&
      state.fromDate != null &&
      state.fromDate.getTime() !== date.getTime() &&
      (!state.multiPlanCartEnabled || !this.#hasMultiplanSeatingFlowContext())
    ) {
      return true;
    }
    return false;
  }

  #shouldShowEmail(): boolean {
    const fields = this.#state.onsiteSetupSelected?.contact_information_setup?.fields || [];
    return fields.includes(ContactInformationFieldEnum.EMAIL);
  }

  #shouldShowPhoneNumber(): boolean {
    const fields = this.#state.onsiteSetupSelected?.contact_information_setup?.fields || [];
    return fields.includes(ContactInformationFieldEnum.PHONE);
  }

  #ticketSelection(): PosTicketSelectionService {
    return this.#injector.get(PosTicketSelectionService);
  }
}

/**
 * The UTC wall clock of a `Date.UTC(y, m, d)` value, which is what the legacy `from_date`
 * serialisation fed into the venue-timezone conversion. Verified byte-identical to both legacy
 * legs in `point-of-sale/AGENTS.md`.
 */
function toRequestWallClock(fromDate: Date): string {
  return fromDate.toISOString().slice(0, 19);
}

/** Legacy-model twin of `isTimeslotExpired` in `@fz/ticketing-ui`: every session is past `purchasable_until_date`. */
function isLegacyTimeslotExpired(timeslot: SessionAvailabilitySummaryByDatetime): boolean {
  return timeslot.sessionAvailabilityList.length > 0 && timeslot.sessionAvailabilityList.every(session => session.isSessionAboutToExpire());
}
