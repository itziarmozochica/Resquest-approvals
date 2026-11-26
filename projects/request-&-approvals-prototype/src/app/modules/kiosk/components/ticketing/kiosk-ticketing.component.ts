import { Dialog } from '@angular/cdk/dialog';
import {
  AfterContentChecked,
  ChangeDetectorRef,
  Component,
  computed,
  DestroyRef,
  inject,
  OnDestroy,
  OnInit,
  signal,
  ViewChild,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute } from '@angular/router';

import { DatadogLogLevel } from '@fz-original/app/core/error/datadog/logger/datadog-log.service';
import { KioskPlanDetail } from '@fz-original/app/modules/kiosk/models/kiosk-plan.model';
import { IdleService } from '@fz-original/app/modules/kiosk/services/idle/idle.service';
import { KioskStateService } from '@fz-original/app/modules/kiosk/services/kiosk-state/kiosk-state.service';
import { KioskService } from '@fz-original/app/modules/kiosk/services/kiosk.service';
import { KioskScreensaverService } from '@fz-original/app/modules/kiosk/services/screensaver/kiosk-screensaver.service';
import { getKioskChannelId } from '@fz-original/app/modules/kiosk/utils/kiosk-ch.util';
import { isKioskRealTimePlan } from '@fz-original/app/modules/kiosk/utils/kiosk-plan.util';
import { Partner } from '@fz-original/app/shared/models/partner/partner.model';
import { seatingSelectorStep, Step } from '@fz-original/app/shared/models/step/step.model';
import { Channel } from '@fz-original/app/shared/services/session-availability/channel.enum';
import { UserService } from '@fz-original/app/shared/services/user/user.service';
import { TranslateService } from '@ngx-translate/core';
import {
  catchError,
  concatMap,
  defaultIfEmpty,
  defer,
  delay,
  EMPTY,
  finalize,
  map,
  mergeMap,
  Observable,
  of,
  race,
  shareReplay,
  Subject,
  switchMap,
  take,
  takeUntil,
  tap,
  timer,
} from 'rxjs';

import { CartSessionTypeUpgradeAppliedEvent } from '../../../../core/tracking/core/events/cart-session-type-upgrade-applied';
import { CartSessionTypeUpgradeShownEvent } from '../../../../core/tracking/core/events/cart-session-type-upgrade-shown';
import { CartSessionTypeUpgradeSkippedEvent } from '../../../../core/tracking/core/events/cart-session-type-upgrade-skipped';
import { ClickKioskCheckoutData, ClickKioskCheckoutEvent } from '../../../../core/tracking/core/events/click-kiosk-checkout';
import { LoadKioskEvent } from '../../../../core/tracking/core/events/load-kiosk';
import { TrackingService } from '../../../../core/tracking/tracking.service';
import { BaseTicketingComponent, GetSessionAvailableParams } from '../../../../shared/components/ticketing/base-ticketing.component';
import { BaseResponse } from '../../../../shared/models/base-response';
import { Cart } from '../../../../shared/models/cart/cart.model';
import { SessionAvailabilitySummary } from '../../../../shared/models/session-availability/session-availability-summary.model';
import { SessionAvailability } from '../../../../shared/models/session-availability/session-availability.model';
import { contactInformationSelectorStep } from '../../../../shared/models/step/purchase-steps';
import { TicketType } from '../../../../shared/models/ticket-type/ticket-type.model';
import { FeatureFlags } from '../../../../shared/optimizely/feature-flags';
import { OptimizelyService } from '../../../../shared/optimizely/optimizely.service';
import { SearchFilter } from '../../../../shared/search-bar/models/search-filter.model';
import { SearchBarComponent } from '../../../../shared/search-bar/search-bar.component';
import { SeatInfo } from '../../../../shared/seating-selector/components/seating-selector/__data__/seat-info.model';
import { SeatingSelectorFinalizedResponse } from '../../../../shared/seating-selector/components/seating-selector/__data__/seating-selector-finalized-response.model';
import { ExpireHoldTokenService } from '../../../../shared/seating-selector/services/expire-hold-token/expire-hold-token.service';
import { RealTimeSelection } from '../../../../shared/seating-selector/services/seating-selector-messenger/messages/real-time-selection-change-message';
import { CartService } from '../../../../shared/services/cart/cart.service';
import { CreateCartQuery } from '../../../../shared/services/cart/create-cart-query';
import { DiscardCartQuery } from '../../../../shared/services/cart/discard-cart-query';
import { ErrorModalService } from '../../../../shared/services/error-modal/error-modal.service';
import { PartnerService } from '../../../../shared/services/partner/partner.service';
import { PlanService } from '../../../../shared/services/plan/plan.service';
import { FreeSeatingMapService } from '../../../../shared/services/seating-map/free-seating-map.service';
import { SeatingMapService } from '../../../../shared/services/seating-map/seating-map.service';
import { DatesAvailability } from '../../../../shared/services/session-availability/dates-availability.adapter';
import { GetAvailableSessionQuery } from '../../../../shared/services/session-availability/get-available-session-query';
import { SessionAvailabilityService } from '../../../../shared/services/session-availability/session-availability.service';
import { SessionSelectorType } from '../../../../shared/services/session-availability/session-selector-type.enum';
import { SourceListen, WebviewMessengerService } from '../../../../shared/services/webview-messenger/webview-messenger.service';
import {
  KIOSK_REAL_TIME_RELEASE_CONFIRMATION,
  KioskInactivityResetContext,
  kioskInactivityResetMessage,
  KioskRealTimeLeaveHandler,
  kioskRealTimeReleaseConfigVariableKey,
  kioskRealTimeSeatingLiterals,
  KioskRealTimeTimeslot,
  KioskRealTimeTimeslotMatch,
  realTimeBasketExpiredReason,
  realTimeCartCreationTimedOut,
  realTimeFinishTimedOut,
} from '../../models/kiosk-real-time-seating.model';
import { createKioskSteps, KioskStepId } from '../../models/kiosk-step.model';
import { CartUpgradeTriggerOutcome } from '../../services/cart-upgrades/kiosk-cart-upgrades.models';
import { KioskCartUpgradeTriggerService } from '../../services/kiosk-cart-upgrade-trigger.service';
import { KioskStorageService } from '../../services/kiosk-storage.service';
import { KioskErrorModalComponent } from '../../shared/components/modals/kiosk-error/kiosk-error-modal.component';
import { KioskNavigationService } from '../../shared/kiosk-navigation.service';
import {
  findRealTimeTimeslot,
  isBasketStillHandedToCheckout,
  isKioskCheckoutUrl,
  toRealTimeReleaseMaxWaitMs,
  toRealTimeSeatInfos,
  waitForRealTimeRelease,
  withMapEntry,
} from '../../utils/kiosk-real-time-seating.util';

interface PlanDetailSyncResult {
  planDetail: KioskPlanDetail | null;
  syncFailed: boolean;
}

/**
 * New version of the component changing the look and feel but not the functionality.
 */
@Component({
  selector: 'app-kiosk-ticketing',
  standalone: false,
  styleUrls: ['../../../../../theme/general/_box-office.scss', './kiosk-ticketing.component.scss'],
  templateUrl: './kiosk-ticketing.component.html',
})
export class KioskTicketingComponent
  extends BaseTicketingComponent
  implements OnInit, OnDestroy, AfterContentChecked, KioskRealTimeLeaveHandler
{
  /** Longest a leave waits for the real-time cart being created: local creations took 4 to 6 seconds. */
  static readonly realTimeCartCreationMaxWaitMs = 10000;
  readonly #destroyRef = inject(DestroyRef);
  readonly #getSessionAvailableRequests$ = new Subject<GetSessionAvailableParams>();
  readonly #cartUpgradeTrigger = inject(KioskCartUpgradeTriggerService);
  readonly #expireHoldTokenService = inject(ExpireHoldTokenService);
  readonly #kioskScreensaverService = inject(KioskScreensaverService);
  readonly #kioskService = inject(KioskService);
  readonly #kioskStateService = inject(KioskStateService);
  /**
   * Whether the real-time map answered `finalized` since the last `cart-error`. The OneBox widget forgets its basket
   * token when it answers `request-finish` and only restores it on `cart-error`, writing back the token it saved on
   * the last finish, so one `cart-error` is owed per `finalized` and none once the basket is gone or the map
   * started a new session.
   */
  readonly #isBasketHandedToCheckout = signal(false);
  /**
   * Whether Continue already asked the real-time map to finish. Until its `finalized` is handled, a second tap would
   * send another `request-finish` and create a second cart over the same basket, so Continue stays disabled.
   */
  readonly #isRealTimeFinishRequested = signal(false);
  /** Whether the seat map is releasing its real-time basket: it stays mounted, behind a loading indicator, until then. */
  readonly #isReleasingRealTimeBasket = signal(false);
  protected readonly isReleasingRealTimeBasket = this.#isReleasingRealTimeBasket.asReadonly();
  /** Whether the real-time cart is being created: the basket left the map, so a leave must wait for the cart. */
  readonly #isCreatingRealTimeCart = signal(false);
  /** Whether a leave is waiting for the cart being created and then for its discard or the basket's release. */
  readonly #isLeavingAfterCartCreation = signal(false);
  /**
   * Home and Back stay disabled while the basket is released, while Continue waits for the map's `finalized`, while the
   * basket is turned into a cart, and while a leave settles it.
   */
  protected readonly isRealTimeExitBlocked = computed(
    () =>
      this.#isReleasingRealTimeBasket() ||
      this.#isRealTimeFinishRequested() ||
      this.#isCreatingRealTimeCart() ||
      this.#isLeavingAfterCartCreation(),
  );
  #realTimeCartCreation$: Observable<BaseResponse<Cart | null> | null> | null = null;
  /** Emits each real-time cart creation as it starts, for a leave that arrived while Continue waited for `finalized`. */
  readonly #realTimeCartCreationStarted$ = new Subject<Observable<BaseResponse<Cart | null> | null>>();
  #leaveAfterCartCreation$: Observable<boolean> | null = null;
  /** Set once a leave claims the cart being created, so its answer never moves the kiosk on to checkout. */
  #isRealTimeCartClaimedByLeave = false;
  /** The timeslot checkout or payment asked to reopen with an empty seat map, consumed by the first availability. */
  #pendingRealTimeTimeslot: KioskRealTimeTimeslot | null = inject(KioskNavigationService).getRealTimeSeatMapTimeslot();
  #realTimeRelease$: Observable<void> | null = null;
  readonly #releaseConfirmation$: Observable<unknown> = inject(KIOSK_REAL_TIME_RELEASE_CONFIRMATION);
  protected readonly uiRefreshEnabled: boolean = this.#kioskScreensaverService.isScreensaverEnabled() === true;
  readonly #userService = inject(UserService);
  readonly #oneDayWithActiveSession = 1;
  channel: Channel = Channel.Kiosk;
  override channelId = '';
  hideDatesAndHours = false;

  includeOngoing = false;
  isHidden = false;
  isPlanTimeless = false;
  #isKioskStepperFlowEnabled = false;
  protected readonly steps = createKioskSteps();
  lastSelectorStep = contactInformationSelectorStep;
  protected readonly KioskStepId = KioskStepId;
  minutesBeforeToExpire = 0.5;
  useCacheEnabled = true;
  cacheTimeoutInSeconds = 600;
  @ViewChild('searchBarComponent') searchBarComponent: SearchBarComponent;
  showCartDetails = false;
  title = '';

  constructor(
    protected sessionAvailabilityService: SessionAvailabilityService,
    protected planService: PlanService,
    protected trackingService: TrackingService,
    protected translate: TranslateService,
    protected changeDetectorRef: ChangeDetectorRef,
    protected seatingSelectorService: SeatingMapService,
    protected freeSeatingSelectorService: FreeSeatingMapService,
    protected cartService: CartService,
    protected errorModalService: ErrorModalService,
    protected optimizelyService: OptimizelyService,
    private kioskNavigationService: KioskNavigationService,
    private kioskStorageService: KioskStorageService,
    private route: ActivatedRoute,
    private webviewMessenger: WebviewMessengerService,
    private changeDetector: ChangeDetectorRef,
    private idleService: IdleService,
    private partnerService: PartnerService,
    private dialog: Dialog,
  ) {
    super(
      sessionAvailabilityService,
      planService,
      trackingService,
      translate,
      changeDetectorRef,
      undefined,
      seatingSelectorService,
      freeSeatingSelectorService,
      cartService,
      errorModalService,
      optimizelyService,
    );
    this.channelId = this.kioskStorageService.getChannelId();
  }

  ngOnInit(): void {
    // B2BO-7917: reset the carried hide decision at the start of each ticketing flow.
    this.#kioskStateService.updateStateProp('hideSingleSessionStartTime', false);
    this.isPlanTimeless = this.route.snapshot.queryParams.timeless === 'true';
    this.includeOngoing = this.#shouldIncludeOngoingForTimeless();
    this.webviewMessenger.setUpPage(SourceListen.ticketing);
    this.partner = this.partnerService.getPartner();
    this.#isKioskStepperFlowEnabled = this.optimizelyService?.isFeatureEnabled(FeatureFlags.KIOSK_STEPPER_FLOW) ?? false;
    this.kioskStorageService
      .observeSetup()
      .pipe(takeUntilDestroyed(this.#destroyRef))
      .subscribe(setup => {
        this.daysWithActiveSession = setup?.max_purchasable_days ?? this.#oneDayWithActiveSession;
        if (setup?.print_tickets_combined == false) {
          this.overrideMaximumTickets = 20;
        }
      });

    this.idleService
      .get()
      .pipe(takeUntilDestroyed(this.#destroyRef))
      .subscribe(() => {
        this.#logInactivityReset();
        this.#cartUpgradeTrigger.cancel();
        this.dialog.closeAll();
        if (this.cart) {
          this.#discardCartAndNavigate();
        } else {
          this.kioskNavigationService.navigateHome();
        }
      });

    this.translate.onLangChange.pipe(takeUntilDestroyed(this.#destroyRef)).subscribe(event => {
      this.locale = event.lang;
      this.searchBarComponent.clickOnSearchButton(); // refresh
      if (this.plan === null) {
        throw new Error('Plan detail cannot be retrieved if plan is null');
      }
      this.#kioskService
        .getKioskPlanDetail(this.plan.id.toString(), this.locale, this.channelId || null)
        .pipe(takeUntilDestroyed(this.#destroyRef))
        .subscribe((plan: KioskPlanDetail) => {
          this.title = plan.name;
        });
      if (this.currentStep.id === KioskStepId.FreeSeatingMap) {
        this.#refreshSeatingMapWhileKeepingSeats();
      }
    });

    this.sessionAvailableReady.pipe(takeUntilDestroyed(this.#destroyRef)).subscribe(() => {
      this.hideDatesAndHours = this.sessionSelectorType === SessionSelectorType.BY_TIMELESS_SESSION;
      if (this.#isKioskStepperFlowEnabled && this.currentStep === this.ticketSelectorStep) {
        this.currentStep = this.steps.datetimeStep;
      }
      this.#reopenRealTimeSeatMap();
    });

    this.title = this.kioskStorageService.getPlan()?.name ?? '';

    if (isKioskRealTimePlan(this.kioskStorageService.getPlan())) {
      this.useCacheEnabled = false;
    }

    this.#getSessionAvailableRequests$
      .pipe(
        switchMap(params => this.#syncSelectedPlanDetailIfNeeded().pipe(map(sync => ({ params, sync })))),
        takeUntilDestroyed(this.#destroyRef),
      )
      .subscribe(({ params, sync }) => {
        this.#runGetSessionAvailable(params, sync);
      });
  }

  protected override getSessionAvailable(params: GetSessionAvailableParams): void {
    // Both statements belong to the click, not to the request that the plan-detail sync will start
    // later: callers such as `selectDate()` empty the sessions list synchronously, so a request
    // still in flight would otherwise land its own date's data and clear the flag mid-wait, and the
    // empty-state message would render until the new request finally reaches the network.
    this.getSessionAvailableSubscription?.unsubscribe();
    this.isLoadingDateSessions = true;
    this.#getSessionAvailableRequests$.next(params);
  }

  // The kiosk channel (sub-channel when set, else the generic one) is a plain
  // string, so it travels in channelId.
  protected override getAvailabilityQueryChannelId(): string {
    return getKioskChannelId(this.channelId) ?? Channel.Kiosk;
  }

  #syncSelectedPlanDetailIfNeeded(): Observable<PlanDetailSyncResult> {
    const selectedPlanId = this.selectedPlan?.id;

    if (selectedPlanId === undefined) {
      return of({ planDetail: this.kioskStorageService.getPlan(), syncFailed: false });
    }

    return this.#kioskService.getKioskPlanDetail(selectedPlanId.toString(), this.locale, this.channelId || null, { fresh: true }).pipe(
      tap(planDetail => {
        this.title = planDetail.name;
        this.useCacheEnabled = !isKioskRealTimePlan(planDetail, selectedPlanId);
      }),
      map(planDetail => ({ planDetail, syncFailed: false })),
      catchError(() => of({ planDetail: this.kioskStorageService.getPlan(), syncFailed: true })),
    );
  }

  #runGetSessionAvailable(params: GetSessionAvailableParams, { planDetail, syncFailed }: PlanDetailSyncResult): void {
    if (!this.filtersSelected) {
      this.isLoadingDateSessions = false;
      return;
    }

    // When the fresh plan-detail sync fails we cannot confirm whether the selected plan is
    // real-time (stored plan may be stale, mismatched, or missing is_real_time), so fail safe
    // by skipping the client cache to avoid showing stale inventory for OneBox real-time plans.
    const isRealTimeAvailability =
      syncFailed || isKioskRealTimePlan(planDetail ?? this.kioskStorageService.getPlan(), this.selectedPlan?.id);

    this.#requestSessionAvailable(isRealTimeAvailability ? { ...params, useCacheEnabled: false } : params, isRealTimeAvailability);
  }

  /**
   * Kiosk-owned copy of `BaseTicketingComponent.getSessionAvailable()`, part of decoupling the kiosk
   * from that class. Deliberate difference: the base reports the end of the request from `finalize`,
   * which also runs on teardown, so a superseded or abandoned request reported itself as a finished,
   * empty result. Here only a request that settles reports.
   */
  #requestSessionAvailable(params: GetSessionAvailableParams, isRealTimeAvailability: boolean): void {
    if (!this.partner || !this.selectedPlan || !this.fromDate || !this.timezone) {
      this.isLoadingDateSessions = false;
      return;
    }
    this.error = false;
    this.errorObject = null;
    this.hasResult = false;
    const query: GetAvailableSessionQuery = {
      cacheTimeoutInSeconds: params.cacheTimeoutInSeconds ?? this.cacheTimeoutInSeconds,
      channel: this.channel,
      channelId: this.getAvailabilityQueryChannelId(),
      contentLanguage: this.translate.currentLang,
      daysWithActiveSession: params.daysWithActiveSession ?? this.daysWithActiveSession,
      fromDate: this.fromDate,
      includeOngoing: params.includeOngoing ?? this.getIncludeOngoing(),
      includeShopProducts: false,
      isHidden: this.isHidden,
      partnerId: this.partner.id,
      placeId: this.selectedPlace.id,
      planId: this.selectedPlan.id,
      timezone: this.timezone,
    };

    this.getSessionAvailableSubscription?.unsubscribe();
    this.getSessionAvailableSubscription = this.changePlan()
      .pipe(
        mergeMap(() =>
          this.getDatesAndSessionsAvailability(query, params.useCacheEnabled ?? this.useCacheEnabled, params.onlyGetSessions ?? true),
        ),
        takeUntilDestroyed(this.#destroyRef),
      )
      .subscribe({
        next: response => {
          this.#applySessionAvailableResponse(response);
          this.changeDetectorRef.markForCheck();
          this.resetPreservingCartAfterRender();
          this.reportEmptyAvailability(isRealTimeAvailability);
        },
        error: (error: unknown) => {
          this.isLoadingSessions = false;
          this.isLoadingDates = false;
          this.isLoadingDateSessions = false;
          this.error = true;
          this.errorObject = error;
          this.changeDetectorRef.detectChanges();
          this.resetPreservingCartAfterRender();
          this.reportEmptyAvailability(isRealTimeAvailability);
        },
      });
  }

  #applySessionAvailableResponse(response: BaseResponse<SessionAvailabilitySummary>): void {
    this.isLoadingSessions = false;
    this.isLoadingDates = false;
    if (!response?.data) {
      this.error = true;
      this.errorObject = response?.error;
      return;
    }
    this.sendLoadTicketingEvent(response.data.regularSessionAvailabilitySummaryByDates.length > 0);
    const availabilityDates = this.filterOutWhenOnlyGlobalAddons(response.data.regularSessionAvailabilitySummaryByDates);
    this.hasResult = availabilityDates.length > 0;
    this.regularSessionAvailabilitySummaryByDateList = availabilityDates;
    this.allowMultiSessionPurchase = response.data.allowMultiSessionPurchase;
    this.hasExplodePipe = response.data.hasExplodePipe;
    this.timezone = response.data.timezone;
    this.resetScroll();
    this.resetSelectedTickets();
    this.currency = this.getCurrency();
    this.sessionSelectorType = response.data.sessionSelectorType as SessionSelectorType;
    this.updateFreeMapMode();
    this.sessionAvailableReady.next();
  }

  #refreshSeatingMapWhileKeepingSeats(): void {
    const preservedHoldToken = this.seatingToken;
    this.seatingMapUrl = null;
    this.seatingMapState = null;
    this.seatingToken = null;

    this.selectedTicketsBySessionId = new Map();
    this.selectedTicketsBySessionType = new Map();
    this.selectedTicketsSeatsBySessionId = new Map();
    this.hasSeatsSelected = false;

    this.loadFreeSeatingMap()
      .pipe(takeUntilDestroyed(this.#destroyRef))
      .subscribe({
        error: response => this.#handleSeatingMapError(response?.error?.message),
        next: () => {
          if (preservedHoldToken && this.seatingMapState) {
            this.seatingMapState = { ...this.seatingMapState, hold_token: preservedHoldToken };
            this.seatingToken = preservedHoldToken;
          }
        },
      });
  }

  override loadNewSearch(filters: SearchFilter, date?: Date): void {
    if (!this.#isKioskStepperFlowEnabled) {
      super.loadNewSearch(filters, date);

      const cartId = this.route.snapshot.queryParams.cartId;
      if (cartId) {
        this.cartService
          .getCart(this.partner.id, cartId)
          .pipe(takeUntilDestroyed(this.#destroyRef))
          .subscribe((cart: BaseResponse<Cart>) => {
            this.setPreviousAndNextSteps(cart.data.hasSeating);
            this.createOrUpdateCartResponse(cart, cart.data.hasSeating);
          });
      }
      return;
    }

    this.isPreservingCart = true;
    this.partner = filters.partner as Partner;
    this.selectedCity = filters.selectedCity!;
    this.selectedPlan = filters.selectedPlan!;
    this.selectedPlace = filters.selectedPlace!;
    this.timezone = filters.timezone;
    this.isDefaultFilter = filters.isDefaultFilter;
    this.filtersSelected = Boolean(filters.selectedCity && filters.selectedPlan && filters.selectedPlace);
    const today = new Date();
    this.fromDate = date ? date : new Date(Date.UTC(today.getFullYear(), today.getMonth(), today.getDate()));
    this.regularSessionAvailabilitySummaryByDateList = [];
    this.productSessions = [];
    this.productTypes = [];
    this.ticketTypes = [];
    this.datesAvailability = [];
    if (this.currentStep.id === KioskStepId.Datetime) {
      this.selectedSession = null;
    }
    this.isLoadingSessions = true;
    if (this.filtersSelected) {
      this.requestDatesAndSessionsAvailability();
    } else {
      this.getSessionAvailableSubscription?.unsubscribe();
      this.isLoadingSessions = false;
      this.selectedSession = null;
    }
  }

  protected override createOrUpdateCartResponse(response: BaseResponse<Cart>, hasSeating: boolean): void {
    if (this.#isKioskStepperFlowEnabled) {
      this.cart = response.data;
      if (this.cart) {
        this.cartDetailService?.setCart(this.cart);
        this.cart.hasSeating = hasSeating;
      }

      this.sendClickAddToCartEvent();
      this.goToNextStep();

      return;
    }
    super.createOrUpdateCartResponse(response, hasSeating);
  }

  isLoading(): boolean {
    const loading = this.isLoadingCart || this.isLoadingSessions || this.isLoadingDates;
    this.idleService.reset();
    return loading;
  }

  isHideSingleItemExplodePipeLevelsEnabled(): boolean {
    return (
      this.optimizelyService.isFeatureEnabled({
        optimizelyFeatureKey: FeatureFlags.KIOSK_HIDE_SINGLE_ITEM_EXPLODE_PIPE_LEVELS,
        team: 'parks',
      }) ?? false
    );
  }

  ngAfterContentChecked(): void {
    this.changeDetector.detectChanges();
  }

  selectTicketCounter(ticketTypeCounter: { bySessionId: Map<string, number>; bySessionType: Map<string, number> }): void {
    if (!this.#isKioskStepperFlowEnabled) {
      super.selectTicketCounter(ticketTypeCounter);
      this.checkCartSessionsIsAboutToExpire(this.nonConfirmedCart);
      return;
    }
    const mergedBySessionId = new Map(this.selectedTicketsBySessionId);
    ticketTypeCounter.bySessionId.forEach((value, key) => mergedBySessionId.set(key, value));
    const mergedBySessionType = new Map(this.selectedTicketsBySessionType);
    ticketTypeCounter.bySessionType.forEach((value, key) => mergedBySessionType.set(key, value));
    super.selectTicketCounter({ bySessionId: mergedBySessionId, bySessionType: mergedBySessionType });
    this.checkCartSessionsIsAboutToExpire(this.nonConfirmedCart);
  }

  addSessionsToCart(): void {
    if (this.#isKioskStepperFlowEnabled) {
      this.#addSessionsToCartStepperFlow();
      return;
    }
    if (this.currentStep === seatingSelectorStep) {
      super.finishSeating();
      return;
    }
    this.checkCartSessionsIsAboutToExpire(this.nonConfirmedCart);
    super.addSessionsToCart();
  }

  #addSessionsToCartStepperFlow(): void {
    if (this.addSessionsToCartIsDisabled()) {
      return;
    }
    switch (this.currentStep.id) {
      case KioskStepId.Datetime:
        this.#setStepsForKioskStepperFlow();
        if (this.currentStep.nextStep.id === KioskStepId.FreeSeatingMap) {
          this.generateFreeSeatingMap();
          return;
        }
        this.#advanceOrCheckout();
        return;
      case KioskStepId.FreeSeatingMap:
        if (this.#isRealTimeSeating()) {
          this.#isRealTimeFinishRequested.set(true);
        }
        super.finishSeating();
        return;
      case KioskStepId.RegularNonSeated:
      case KioskStepId.AddOns:
        this.#advanceOrCheckout();
        return;
      default:
        this.goToNextStep();
    }
  }

  #advanceOrCheckout(): void {
    this.setPreviousAndNextSteps();
    if (this.currentStep.nextStep === this.lastSelectorStep) {
      super.addSessionsToCart();
      return;
    }
    this.goToNextStep();
  }

  override confirmSeating(data?: SeatingSelectorFinalizedResponse): void {
    if (!this.#isKioskStepperFlowEnabled || this.currentStep.id !== KioskStepId.FreeSeatingMap) {
      super.confirmSeating(data);
      return;
    }
    if (this.#isRealTimeSeating() && this.isLoadingCart) {
      return;
    }
    this.seatingToken = data?.holdToken ?? null;
    if (data?.holdToken) {
      this.#storeHoldTokenForSessions(data.holdToken);
    }
    if (this.#isRealTimeSeating()) {
      this.#createRealTimeCart(Boolean(data?.holdToken));
      return;
    }
    this.confirmSeatingMap$.next();
    this.#advanceOrCheckout();
  }

  protected onRealTimeSelectionChange(selection: RealTimeSelection): void {
    this.#isBasketHandedToCheckout.set(isBasketStillHandedToCheckout(this.#isBasketHandedToCheckout(), selection));
    if (selection.items.length === 0) {
      this.#isRealTimeFinishRequested.set(false);
    }
    if (!this.#isRealTimeSeating()) {
      return;
    }
    const anchorSession: SessionAvailability | undefined = this.selectedSession?.selectedDatetime?.sessionAvailabilityList.find(
      (session: SessionAvailability) => session.seating != null,
    );
    if (anchorSession === undefined) {
      return;
    }
    const currency: string = anchorSession.ticketPrice?.currency ?? this.currency ?? '';
    const category: string = this.selectedSession?.selectedDatetime?.ticketTypesBySessionId.get(anchorSession.id) ?? '';
    this.#replaceRealTimeSeats(anchorSession.id.toString(), category, toRealTimeSeatInfos(selection.items, currency), selection.holdToken);
    if (selection.reason === realTimeBasketExpiredReason) {
      this.showModal(kioskRealTimeSeatingLiterals.expiredTitle, kioskRealTimeSeatingLiterals.expiredMessage);
    }
  }

  protected onRealTimeSessionStarted(): void {
    this.#isBasketHandedToCheckout.set(false);
    this.#isRealTimeFinishRequested.set(false);
  }

  #isRealTimeSeating(): boolean {
    return this.#isKioskStepperFlowEnabled && this.seatingMapState?.is_real_time === true;
  }

  /**
   * The widget reports the whole basket after every change, so the anchor session's seats are replaced, never
   * added to. Every entry sits on the timeslot's first seated session, the one the map was loaded for: fever2
   * rebuilds the cart lines from the OneBox basket, so that line never reaches the checkout.
   */
  #replaceRealTimeSeats(sessionId: string, category: string, seatInfos: SeatInfo[], holdToken: string | null): void {
    const count = seatInfos.length;
    const isHeld = count > 0;
    this.selectedTicketsBySessionId = withMapEntry(this.selectedTicketsBySessionId, sessionId, isHeld ? count : null);
    this.selectedTicketsBySessionType = withMapEntry(this.selectedTicketsBySessionType, category, isHeld ? count : null);
    this.selectedTicketsSeatsBySessionId = withMapEntry(this.selectedTicketsSeatsBySessionId, sessionId, isHeld ? seatInfos : null);
    this.seatingHoldTokensBySessionId = withMapEntry(this.seatingHoldTokensBySessionId, sessionId, isHeld ? holdToken : null);
    this.seatingToken = isHeld ? holdToken : null;
    this.hasSeatsSelected = isHeld;
    this.nonConfirmedCart = this.getCart();
  }

  /**
   * Real-time carts are created once, here, and never updated nor discarded before checkout: either empties the
   * OneBox basket. On a failure the map is still mounted, so the basket is handed back to it before the error.
   */
  #createRealTimeCart(isHandedToCheckout: boolean): void {
    if (isHandedToCheckout) {
      this.#isBasketHandedToCheckout.set(true);
    }
    this.#makeSeatingMapLastSelectionStep();
    const cart: Cart | null = this.nonConfirmedCart;
    if (cart === null || this.partner === null) {
      this.#handleRealTimeCartFailure();
      return;
    }
    const query: CreateCartQuery = {
      channel: this.channel,
      channelId: this.channelId,
      isRealTimeSeating: true,
      locale: cart.locale,
      partnerId: this.partner.id,
      seatingHoldTokensBySessionId: this.seatingHoldTokensBySessionId,
      seatingToken: this.seatingToken,
      sessionItemsByDatetime: cart.sessionItemsByDatetime,
    };
    this.isLoadingCart = true;
    this.#isCreatingRealTimeCart.set(true);
    const creation$: Observable<BaseResponse<Cart | null> | null> = this.cartService.createCart(query).pipe(
      catchError(() => of(null)),
      defaultIfEmpty(null),
      finalize(() => {
        this.isLoadingCart = false;
        this.#isCreatingRealTimeCart.set(false);
        if (this.#realTimeCartCreation$ === creation$) {
          this.#realTimeCartCreation$ = null;
        }
      }),
      shareReplay({ bufferSize: 1, refCount: false }),
    );
    this.#realTimeCartCreation$ = creation$;
    this.#isRealTimeCartClaimedByLeave = this.#leaveAfterCartCreation$ !== null;
    this.#runToCompletion(creation$)
      .pipe(takeUntilDestroyed(this.#destroyRef))
      .subscribe((response: BaseResponse<Cart | null> | null) => this.#onRealTimeCartCreated(response));
    this.#realTimeCartCreationStarted$.next(creation$);
  }

  #handleRealTimeCartFailure(isLeaving = false): void {
    if (this.#isBasketHandedToCheckout()) {
      this.seatingSelectorRef?.sendCartError();
    }
    this.#isBasketHandedToCheckout.set(false);
    this.#isRealTimeFinishRequested.set(false);
    if (!isLeaving) {
      this.showModal(kioskRealTimeSeatingLiterals.cartErrorTitle, kioskRealTimeSeatingLiterals.cartErrorMessage);
    }
  }

  /**
   * In real time the seat map is the last selection step: a later non-seated or add-on step would need an
   * `updateCart`, which empties the OneBox basket. Those ticket types are not offered (known limitation, GIT-1569).
   */
  #makeSeatingMapLastSelectionStep(): void {
    const { freeSeatingMapStep } = this.steps;
    if (freeSeatingMapStep.nextStep === this.lastSelectorStep) {
      return;
    }
    this.#kioskService.logTrace('Kiosk real-time seat map skips the non-seated steps of the timeslot', DatadogLogLevel.Warn, {
      planId: this.selectedPlan?.id,
      skippedStepId: freeSeatingMapStep.nextStep?.id,
      timeslot: this.selectedSession?.selectedDatetime?.datetime,
    });
    freeSeatingMapStep.nextStep = this.lastSelectorStep;
    this.lastSelectorStep.previousStep = freeSeatingMapStep;
  }

  #storeHoldTokenForSessions(holdToken: string): void {
    this.nonConfirmedCart?.sessionItemsByDatetime.forEach(sessions => {
      sessions.forEach(session => {
        const sessionId = session.sessionId.toString();
        if (!this.seatingHoldTokensBySessionId.has(sessionId)) {
          this.seatingHoldTokensBySessionId.set(sessionId, holdToken);
        }
      });
    });
  }

  clickOnCancel(): void {
    if (this.cart) {
      this.#discardCartAndNavigate();
    } else {
      this.kioskNavigationService.navigateHome();
    }
  }

  clickOnBack(): void {
    if (this.isRealTimeExitBlocked()) {
      return;
    }
    if (this.currentStep.id === KioskStepId.FreeSeatingMap && this.#isRealTimeBasketLive()) {
      this.#releaseRealTimeBasket()
        .pipe(takeUntilDestroyed(this.#destroyRef))
        .subscribe(() => this.#goBack());
      return;
    }
    this.#goBack();
  }

  /**
   * Lets the kiosk leave ticketing once nothing of the real-time purchase is left behind: the seat map releases a
   * basket it still holds, and a cart created here is discarded unless the navigation hands it to its checkout.
   */
  releaseBeforeLeave(targetUrl: string): Observable<boolean> {
    if (this.#realTimeRelease$ !== null) {
      return this.#realTimeRelease$.pipe(map((): boolean => true));
    }
    if (this.#leaveAfterCartCreation$ !== null) {
      return this.#leaveAfterCartCreation$;
    }
    if (!this.#isRealTimeSeating()) {
      return of(true);
    }
    if (this.cart !== null) {
      return isKioskCheckoutUrl(targetUrl, this.cart.id) ? of(true) : this.#discardCartBeforeLeave(this.cart);
    }
    if (this.#realTimeCartCreation$ !== null) {
      return this.#leaveAfterCartCreation(this.#realTimeCartCreation$, targetUrl);
    }
    if (this.#isRealTimeFinishRequested()) {
      return this.#leaveAfterFinalized(targetUrl);
    }
    if (this.#isRealTimeBasketLive()) {
      return this.#releaseRealTimeBasket().pipe(map((): boolean => true));
    }
    return of(true);
  }

  #discardCartBeforeLeave(cart: Cart): Observable<boolean> {
    this.cart = null;
    const partnerId: number | undefined = this.partner?.id;
    if (partnerId === undefined || cart.id === undefined) {
      return of(true);
    }
    return this.#runToCompletion(
      this.cartService.discardCart({ cartId: cart.id, partnerId }).pipe(
        map((): boolean => true),
        catchError(() => of(true)),
        defaultIfEmpty(true),
        shareReplay({ bufferSize: 1, refCount: false }),
      ),
    );
  }

  /**
   * Fire-and-forget on purpose: ticketing is destroyed once the leave completes, and a cart created after it would
   * keep a live OneBox basket. It touches no component state and navigates nowhere.
   */
  #discardLateRealTimeCart(creation$: Observable<BaseResponse<Cart | null> | null>, partnerId: number | undefined): void {
    creation$
      .pipe(
        switchMap((response: BaseResponse<Cart | null> | null) => {
          const cartId: string | undefined = response?.data?.id;
          return cartId === undefined || partnerId === undefined ? EMPTY : this.cartService.discardCart({ cartId, partnerId });
        }),
        catchError(() => EMPTY),
      )
      .subscribe();
  }

  #getRealTimeReleaseMaxWaitMs(): number {
    return toRealTimeReleaseMaxWaitMs(
      this.optimizelyService?.getFeatureVariableJSON(FeatureFlags.KIOSK_REAL_TIME_RELEASE_WAIT, kioskRealTimeReleaseConfigVariableKey),
    );
  }

  #goBack(): void {
    if (this.currentStep.id === KioskStepId.FreeSeatingMap) {
      this.#releaseSeatingSelections();
    } else if (this.currentStep.previousStep?.id === KioskStepId.FreeSeatingMap) {
      this.#refreshSeatingMapWhileKeepingSeats();
    }
    if (this.currentStep.previousStep) {
      this.currentStep = this.currentStep.previousStep;
      if (this.currentStep.id === KioskStepId.Datetime) {
        this.selectedSession = null;
      }
      return;
    }
    this.clickOnCancel();
  }

  #isRealTimeBasketLive(): boolean {
    const isHoldingSeats: boolean = (this.seatingSelectorRef?.seatsCounter ?? 0) > 0 || this.hasSeatsSelected;
    return this.#isRealTimeSeating() && this.seatingSelectorRef !== undefined && isHoldingSeats && !this.#isBasketHandedToCheckout();
  }

  /**
   * The basket already left the map for the cart being created: the kiosk leaves once that cart is discarded, or once
   * the basket handed back after a failed creation is released. A second leave meanwhile waits for the same outcome.
   */
  #leaveAfterCartCreation(creation$: Observable<BaseResponse<Cart | null> | null>, targetUrl: string): Observable<boolean> {
    return this.#claimRealTimeCartForLeave(this.#settleCartCreationBeforeLeave(creation$, targetUrl));
  }

  /**
   * Continue asked the map to finish and its `finalized` has not arrived: the widget forgets its token once it
   * answers, so a `delete-order` now would be ignored and the cart it starts would move the kiosk on to checkout.
   * The leave claims that cart and settles it like one already being created. A map that does not answer within the
   * release wait, the same budget as any other answer of the map, still holds the basket, so it is released.
   */
  #leaveAfterFinalized(targetUrl: string): Observable<boolean> {
    const finishWait$: Observable<typeof realTimeFinishTimedOut> = timer(this.#getRealTimeReleaseMaxWaitMs()).pipe(
      map((): typeof realTimeFinishTimedOut => realTimeFinishTimedOut),
    );
    return this.#claimRealTimeCartForLeave(
      race(this.#realTimeCartCreationStarted$, finishWait$).pipe(
        take(1),
        switchMap((started: Observable<BaseResponse<Cart | null> | null> | typeof realTimeFinishTimedOut) =>
          started === realTimeFinishTimedOut
            ? this.#releaseBasketAfterUnansweredFinish()
            : this.#settleCartCreationBeforeLeave(started, targetUrl),
        ),
      ),
    );
  }

  /**
   * A `finalized` that answers during the release still starts a cart, and the `delete-order` did nothing because the
   * widget forgot its token when it answered, so that cart is discarded on its own. Only a creation that starts while
   * ticketing is alive and within the creation's maximum wait is watched: a later one belongs to a new Continue.
   */
  #releaseBasketAfterUnansweredFinish(): Observable<boolean> {
    const partnerId: number | undefined = this.partner?.id;
    this.#realTimeCartCreationStarted$
      .pipe(take(1), takeUntil(timer(KioskTicketingComponent.realTimeCartCreationMaxWaitMs)), takeUntilDestroyed(this.#destroyRef))
      .subscribe((creation$: Observable<BaseResponse<Cart | null> | null>) => this.#discardLateRealTimeCart(creation$, partnerId));
    return this.#releaseBasketBeforeLeave();
  }

  #claimRealTimeCartForLeave(settle$: Observable<boolean>): Observable<boolean> {
    this.#isRealTimeCartClaimedByLeave = true;
    this.#isLeavingAfterCartCreation.set(true);
    const leave$: Observable<boolean> = settle$.pipe(
      finalize(() => {
        if (this.#leaveAfterCartCreation$ === leave$) {
          this.#leaveAfterCartCreation$ = null;
          this.#isLeavingAfterCartCreation.set(false);
        }
      }),
      shareReplay({ bufferSize: 1, refCount: false }),
    );
    this.#leaveAfterCartCreation$ = leave$;
    return this.#runToCompletion(leave$);
  }

  #releaseBasketBeforeLeave(): Observable<boolean> {
    return this.#isRealTimeBasketLive() ? this.#releaseRealTimeBasket().pipe(map((): boolean => true)) : of(true);
  }

  /**
   * A creation that has not answered within the maximum wait no longer holds the kiosk: it leaves, and a cart that
   * answers later is discarded on its own.
   */
  #settleCartCreationBeforeLeave(creation$: Observable<BaseResponse<Cart | null> | null>, targetUrl: string): Observable<boolean> {
    const partnerId: number | undefined = this.partner?.id;
    const maxWait$: Observable<typeof realTimeCartCreationTimedOut> = timer(KioskTicketingComponent.realTimeCartCreationMaxWaitMs).pipe(
      map((): typeof realTimeCartCreationTimedOut => realTimeCartCreationTimedOut),
    );
    return race(creation$, maxWait$).pipe(
      take(1),
      switchMap((outcome: BaseResponse<Cart | null> | null | typeof realTimeCartCreationTimedOut) => {
        if (outcome === realTimeCartCreationTimedOut) {
          this.#discardLateRealTimeCart(creation$, partnerId);
          return of(true);
        }
        const createdCart: Cart | null = outcome?.data ?? null;
        if (createdCart !== null) {
          return isKioskCheckoutUrl(targetUrl, createdCart.id) ? of(true) : this.#discardCartBeforeLeave(createdCart);
        }
        return this.#releaseBasketBeforeLeave();
      }),
    );
  }

  #logInactivityReset(): void {
    const context: KioskInactivityResetContext = {
      cartId: this.cart?.id,
      hasLiveRealTimeBasket: this.#isRealTimeBasketLive() || (this.#isRealTimeSeating() && this.cart !== null),
      planId: this.selectedPlan?.id ?? this.plan?.id,
      screen: 'ticketing',
      step: this.currentStep.id,
    };
    this.#kioskService.logTrace(kioskInactivityResetMessage, DatadogLogLevel.Info, context);
  }

  /** A leave requested meanwhile owns the cart: the guard discards it, so the kiosk does not move on to checkout. */
  #onRealTimeCartCreated(response: BaseResponse<Cart | null> | null): void {
    const createdCart: Cart | null = response?.data ?? null;
    const isLeaving: boolean = this.#isRealTimeCartClaimedByLeave;
    if (createdCart === null) {
      this.#handleRealTimeCartFailure(isLeaving);
      return;
    }
    if (isLeaving) {
      return;
    }
    this.confirmSeatingMap$.next();
    this.createOrUpdateCartResponse(new BaseResponse<Cart>(createdCart, response?.error ?? null), true);
  }

  /** One `delete-order` per basket: a second leave or Back while it is released waits for the same release. */
  #releaseRealTimeBasket(): Observable<void> {
    if (this.#realTimeRelease$ !== null) {
      return this.#realTimeRelease$;
    }
    this.#isReleasingRealTimeBasket.set(true);
    this.seatingSelectorRef?.deleteOrder();
    const release$: Observable<void> = waitForRealTimeRelease(this.#releaseConfirmation$, this.#getRealTimeReleaseMaxWaitMs()).pipe(
      finalize(() => {
        this.#isReleasingRealTimeBasket.set(false);
        if (this.#realTimeRelease$ === release$) {
          this.#realTimeRelease$ = null;
        }
      }),
      shareReplay({ bufferSize: 1, refCount: false }),
    );
    this.#realTimeRelease$ = release$;
    return this.#runToCompletion(release$);
  }

  #releaseSeatingSelections(): void {
    this.#isRealTimeFinishRequested.set(false);
    if ((this.seatingSelectorRef?.seatsCounter ?? 0) > 0) {
      this.seatingSelectorRef?.clearSelection({ expireHoldToken: true });
    } else {
      const token = this.seatingToken;
      const partnerId = this.partnerService.getPartner()?.id;
      if (token && this.seatingMapState?.seating_provider && partnerId) {
        this.#expireHoldTokenService.expireHoldToken(partnerId, {
          hold_token: token,
          seating_provider: this.seatingMapState.seating_provider,
          provider_public_key: this.seatingMapState.provider_public_key,
        });
      }
    }
    this.clearSelectedTicketsReferences();
    this.seatingToken = null;
    this.seatingHoldTokensBySessionId = new Map();
  }

  #reopenRealTimeSeatMap(): void {
    const timeslot: KioskRealTimeTimeslot | null = this.#pendingRealTimeTimeslot;
    this.#pendingRealTimeTimeslot = null;
    if (timeslot === null || !this.#isKioskStepperFlowEnabled || this.currentStep.id !== KioskStepId.Datetime) {
      return;
    }
    const match: KioskRealTimeTimeslotMatch | null = findRealTimeTimeslot(this.regularSessionAvailabilitySummaryByDateList, timeslot);
    if (match === null) {
      this.#kioskService.logTrace('Kiosk real-time timeslot to reopen is no longer available', DatadogLogLevel.Info, {
        planId: this.selectedPlan?.id,
        timeslot: timeslot.datetime,
      });
      return;
    }
    match.summary.selectedDatetime = match.datetime;
    this.selectSession(match.summary);
    this.#setStepsForKioskStepperFlow();
    if (this.currentStep.nextStep?.id === KioskStepId.FreeSeatingMap) {
      this.generateFreeSeatingMap();
    }
  }

  /**
   * A cancelled navigation unsubscribes from its guard: the replaying `shared$` is subscribed here as well, so it
   * finishes and replays its result to the next leave attempt instead of being cut halfway.
   */
  #runToCompletion<T>(shared$: Observable<T>): Observable<T> {
    shared$.pipe(takeUntilDestroyed(this.#destroyRef)).subscribe();
    return shared$;
  }

  onIframeInteraction(): void {
    this.idleService.reset();
  }

  protected continueRestore() {
    super.continueRestore();
    this.idleService.reset();
  }

  protected resetIncludeOngoing(): void {
    this.includeOngoing = this.#shouldIncludeOngoingForTimeless();
  }

  protected override getIncludeOngoingForSessionsForDate(): boolean {
    if (!this.#isKioskTimelessOngoingEnabled()) {
      return super.getIncludeOngoingForSessionsForDate();
    }
    return this.isPlanTimeless;
  }

  #shouldIncludeOngoingForTimeless(): boolean {
    return this.#isKioskTimelessOngoingEnabled() && this.isPlanTimeless;
  }

  #isKioskTimelessOngoingEnabled(): boolean {
    return (
      this.optimizelyService?.isFeatureEnabled({
        optimizelyFeatureKey: FeatureFlags.KIOSK_TIMELESS_INCLUDE_ONGOING,
        team: 'b2b-onsite',
      }) ?? false
    );
  }

  protected sendLoadTicketingEvent(hasResult: boolean): void {
    this.trackingService.track(new LoadKioskEvent(this.getLoadTicketingData(hasResult)));
  }

  protected goToNextStep(): void {
    if (this.currentStep.nextStep) {
      if (this.currentStep.nextStep === this.lastSelectorStep) {
        this.trackingService.track(new ClickKioskCheckoutEvent(this.#createCheckoutEventData()));
        this.#triggerUpgradeAndNavigate();
        return;
      }
      this.currentStep = this.currentStep.nextStep;
    }
  }

  #triggerUpgradeAndNavigate(): void {
    const cart = this.cart;
    if (!cart) {
      return;
    }
    // A session-type upgrade rewrites the cart, which on a real-time map would empty the OneBox basket.
    if (!this.partner || this.#isRealTimeSeating()) {
      this.kioskNavigationService.navigateCheckout(cart);
      return;
    }

    const cartSessions = [...cart.sessionItemsByDatetime.values()].flatMap(items =>
      items.map(s => ({ sessionId: s.sessionId, units: s.units })),
    );

    const partnerId = this.partner.id;

    this.#cartUpgradeTrigger
      .open({
        partnerId,
        cartId: cart.id!,
        cartSessions,
        locale: this.locale,
      })
      .pipe(
        concatMap(outcome => this.#trackCartUpgradeOutcome(outcome).pipe(map(() => outcome))),
        switchMap(outcome => {
          const updatedCart = outcome.kind === 'add-applied' ? outcome.cart : cart;
          const targetPlanId = outcome.kind === 'add-applied' ? outcome.targetMainPlanId : null;
          if (targetPlanId !== null && targetPlanId !== this.plan?.id) {
            return this.#kioskService.getKioskPlanDetail(targetPlanId.toString(), this.locale, this.channelId || null).pipe(
              tap(planDetail => this.kioskStorageService.setPlan(planDetail)),
              catchError(() => of(null)),
              map(planDetail => ({ cart: updatedCart, planDetail })),
            );
          }
          return of({ cart: updatedCart, planDetail: null });
        }),
        takeUntilDestroyed(this.#destroyRef),
      )
      .subscribe({
        error: () => {
          this.kioskNavigationService.navigateCheckout(cart);
        },
        next: ({ cart: updatedCart, planDetail }) => {
          this.kioskNavigationService.navigateCheckout(updatedCart, undefined, planDetail ?? undefined);
        },
      });
  }

  #trackCartUpgradeOutcome(outcome: CartUpgradeTriggerOutcome): Observable<void> {
    if (outcome.kind === 'not-shown') {
      return of(undefined);
    }

    return defer(() => {
      const { tracking } = outcome;
      this.trackingService.track(new CartSessionTypeUpgradeShownEvent(tracking));

      switch (outcome.kind) {
        case 'add-applied':
          this.trackingService.track(
            new CartSessionTypeUpgradeAppliedEvent({
              ...tracking,
              apply_requests_count: outcome.apply_requests_count,
            }),
          );
          break;
        case 'skip':
          this.trackingService.track(new CartSessionTypeUpgradeSkippedEvent({ ...tracking, dismiss_method: 'skip_button' }));
          break;
        case 'close':
          this.trackingService.track(new CartSessionTypeUpgradeSkippedEvent({ ...tracking, dismiss_method: 'close_button' }));
          break;
        case 'add-failed':
          this.trackingService.track(new CartSessionTypeUpgradeSkippedEvent({ ...tracking, dismiss_method: 'add_button' }));
          break;
      }

      return of(undefined);
    }).pipe(delay(0));
  }

  #createCheckoutEventData(): ClickKioskCheckoutData {
    return {
      cartId: this.cart.id,
    };
  }

  protected getDatesAvailability(dates: DatesAvailability): DatesAvailability {
    const requestOneDay = this.daysWithActiveSession === 1;
    const hasDatesResults = dates?.size > 0;

    if (requestOneDay && hasDatesResults) {
      const dateAvailability = new Date(Array.from(dates.keys())[0]);
      return dateAvailability.toISOString() === this.fromDate.toISOString() ? dates : null;
    }
    return dates;
  }

  #discardCartAndNavigate(): void {
    const query: DiscardCartQuery = {
      partnerId: this.partner.id,
      cartId: this.cart.id,
    };
    this.cart = null;

    this.cartService.discardCart(query).pipe().subscribe();
    this.kioskNavigationService.navigateHome();
  }

  // TODO move to base ticketing
  private checkCartSessionsIsAboutToExpire(cart: Cart) {
    if (!cart) {
      return;
    }

    const allSessionsAvailability = this.getAllSessionsAvailability();
    const allSessionsIds = this.getAllSessionsIds(cart);

    const isSomeSessionAboutToExpire = allSessionsIds.some(sessionId => {
      const sessionAvailability = allSessionsAvailability.find(availability => availability.id === sessionId);

      return sessionAvailability?.purchasableUntilDate && sessionAvailability.isDisabled();
    });

    if (isSomeSessionAboutToExpire) {
      this.clearCounters();
      this.clearCart();
      this.updateTicketTypeFields();

      this.dialog.open(KioskErrorModalComponent, {
        data: {
          title: this.translate.instant('common.errorTitle'),
          messages: [this.translate.instant('boxOffice.ticketExpireSoon')],
        },
      });
    }
  }

  override showModal(title: string, message: string): void {
    this.dialog.open(KioskErrorModalComponent, {
      data: {
        title: this.translate.instant(title),
        messages: [this.translate.instant(message)],
      },
    });
  }

  private clearCounters() {
    const emptyValues: Array<[string, number]> = Array.from(this.selectedTicketsBySessionType.keys()).map(key => [key, 0]);
    this.selectedTicketsBySessionType = new Map(emptyValues);
  }

  private flatArray<T>(arr: Array<Array<T>>): Array<T> {
    return arr.reduce((prev, curr) => [...prev, ...curr], []);
  }

  private getAllSessionsIds(cart: Cart): Array<number> {
    return this.flatArray(Array.from(cart?.sessionItemsByDatetime.values() || [])).map(session => session.sessionId);
  }

  private getAllSessionsAvailability() {
    const sessionAvailabilityByDateTime = this.flatArray(
      [...this.regularSessionAvailabilitySummaryByDateList].map(availability => availability.sessionAvailabilityByDatetimeList),
    );
    return this.flatArray(sessionAvailabilityByDateTime.map(session => session.sessionAvailabilityList));
  }

  #isKioskEmulatedInFZ(): boolean {
    return !this.#userService.isKioskUser();
  }

  /** Reports how the finished request was issued, not a re-read of the stored plan. */
  protected reportEmptyAvailability(isRealTimeAvailability: boolean): void {
    const isShowingTickets = this.hasResult && !this.error;
    if (isShowingTickets || this.#isKioskEmulatedInFZ()) {
      return;
    }
    const planId = this.selectedPlan?.id;
    const fromDate = this.fromDate.toISOString();
    const kioskSerial = this.kioskStorageService.getConfiguration()?.serial;
    const cityId = this.selectedCity?.id ?? this.plan?.places?.[0]?.city?.id;
    const placeId = this.selectedPlace?.id ?? this.plan?.places?.[0]?.id;
    const message = `Kiosk (${kioskSerial}) is not displaying any tickets in plan ${planId} at ${fromDate}`;
    const level = this.error ? DatadogLogLevel.Warn : DatadogLogLevel.Info;
    this.#kioskService.logTrace(message, level, {
      has_error: this.error,
      planId,
      cityId,
      placeId,
      fromDate,
      channelId: this.channelId,
      availabilityType: isRealTimeAvailability ? 'real_time' : 'materialized',
    });
  }

  #handleSeatingMapError(rawError?: string): void {
    this.#kioskService.logTrace(rawError ?? 'Unknown seating map error', DatadogLogLevel.Error);
    this.showModalError();
  }

  get isKioskStepperFlowEnabled(): boolean {
    return this.#isKioskStepperFlowEnabled;
  }

  protected override get shouldUseSeatingHoldTokensBySession(): boolean {
    return this.#isKioskStepperFlowEnabled && this.manageAsFreeSeatingMap;
  }

  protected override get hasMultiplanSeatingFlowContext(): boolean {
    if (this.#isKioskStepperFlowEnabled) {
      return false;
    }
    return super.hasMultiplanSeatingFlowContext;
  }

  protected override setPreviousAndNextSteps(hasSeating?: boolean): void {
    if (this.#isKioskStepperFlowEnabled) {
      return;
    }
    super.setPreviousAndNextSteps(hasSeating);
  }

  #setStepsForKioskStepperFlow(): void {
    const { datetimeStep, freeSeatingMapStep, regularNonSeatedStep, addOnsStep } = this.steps;

    datetimeStep.previousStep = undefined;
    datetimeStep.nextStep = undefined;
    freeSeatingMapStep.previousStep = undefined;
    freeSeatingMapStep.nextStep = undefined;
    regularNonSeatedStep.previousStep = undefined;
    regularNonSeatedStep.nextStep = undefined;
    addOnsStep.previousStep = undefined;
    addOnsStep.nextStep = undefined;

    let tail: Step = datetimeStep;

    if (this.sessionSelectorType === SessionSelectorType.BY_FREE_SELECTION_MAP && this.selectedSessionHasSeating()) {
      tail.nextStep = freeSeatingMapStep;
      freeSeatingMapStep.previousStep = tail;
      tail = freeSeatingMapStep;
    }

    if (this.#hasNonSeatedRegular()) {
      tail.nextStep = regularNonSeatedStep;
      regularNonSeatedStep.previousStep = tail;
      tail = regularNonSeatedStep;
    }

    if (this.#hasNonSeatedAddOns()) {
      tail.nextStep = addOnsStep;
      addOnsStep.previousStep = tail;
      tail = addOnsStep;
    }

    tail.nextStep = this.lastSelectorStep;
    this.lastSelectorStep.previousStep = tail;
  }

  #hasNonSeatedAddOns(): boolean {
    return this.addonNonSeatedTicketTypes.length > 0;
  }

  #hasNonSeatedRegular(): boolean {
    return this.regularNonSeatedTicketTypes.length > 0;
  }

  #isNonSeatedSessionAtSelectedDatetime(ticketType: TicketType): boolean {
    if (ticketType.sessionId === undefined) {
      return false;
    }
    const session = this.selectedSession?.selectedDatetime?.sessionAvailabilityList?.find(s => s.id === ticketType.sessionId);
    return session != null && session.seating == null;
  }

  protected get regularNonSeatedTicketTypes(): TicketType[] {
    return this.ticketTypes.filter(t => !t.isAddon && this.#isNonSeatedSessionAtSelectedDatetime(t));
  }

  protected get addonNonSeatedTicketTypes(): TicketType[] {
    return [...this.ticketTypes, ...this.productTypes].filter(t => t.isAddon === true && this.#isNonSeatedSessionAtSelectedDatetime(t));
  }

  override generateFreeSeatingMap(): void {
    if (this.#isKioskStepperFlowEnabled) {
      this.#releaseSeatingSelections();
      this.seatingMapState = null;
      this.seatingMapUrl = null;
      this.loadFreeSeatingMap()
        .pipe(takeUntilDestroyed(this.#destroyRef))
        .subscribe({
          next: () => {
            if (this.#isRealTimeSeating()) {
              this.#makeSeatingMapLastSelectionStep();
            }
            this.goToNextStep();
          },
          error: response => this.#handleSeatingMapError(response?.error?.message),
        });
      return;
    } else {
      super.generateFreeSeatingMap();
    }
  }

  override addSessionsToCartIsDisabled(): boolean {
    if (!this.#isKioskStepperFlowEnabled) {
      return super.addSessionsToCartIsDisabled();
    }
    if (this.isLoadingCart || this.#isRealTimeFinishRequested() || this.#isReleasingRealTimeBasket()) {
      return true;
    }
    switch (this.currentStep.id) {
      case KioskStepId.Datetime:
        return !this.selectedSession?.selectedDatetime;
      case KioskStepId.RegularNonSeated:
      case KioskStepId.AddOns:
        return false;
      default:
        return super.addSessionsToCartIsDisabled();
    }
  }

  protected override restoreToBeginning(): void {
    if (this.#isKioskStepperFlowEnabled) {
      this.shouldRestoreToBeginning = false;
      this.clearCart();
      this.clearSelectedTickets();
      this.seatingMapUrl = null;
      this.seatingMapState = null;
      this.seatingToken = null;
      this.seatingHoldTokensBySessionId = new Map();
      this.currentStep = this.steps.datetimeStep;
      this.selectDefaultSessionForAdvancedFlow();
      this.updateTicketTypeFields();
      this.updateFreeMapMode();
      this.changeDetectorRef.detectChanges();
      return;
    }
    super.restoreToBeginning();
  }
}
