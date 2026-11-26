import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectorRef, Component, DestroyRef, inject, OnDestroy, signal, ViewChild, WritableSignal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { SessionAvailability } from '@fz-original/app/shared/models/session-availability/session-availability.model';
import { AlertSentiment } from '@ignite/legacy/components/ignt-alert/ignt-alert.component';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { TranslateService } from '@ngx-translate/core';
import { UserAttributes } from '@optimizely/optimizely-sdk';
import moment from 'moment-timezone';
import { EMPTY, Observable, ObservableInput, of, ReplaySubject, Subject, Subscription, throwError } from 'rxjs';
import { catchError, finalize, map, mergeMap, switchMap, takeUntil, tap } from 'rxjs/operators';

import { DatadogLogService } from '../../../core/error/datadog/logger/datadog-log.service';
import { ClickAddToCartEvent } from '../../../core/tracking/core/events/click-add-to-cart';
import { ClickClearAllCartData, ClickClearAllCartEvent } from '../../../core/tracking/core/events/click-clear-all-cart';
import { LoadTicketingData } from '../../../core/tracking/core/events/load-ticketing-data';
import { ScreenTypeaheadInput } from '../../../core/tracking/core/events/select-option-typeahead';
import { TrackingService } from '../../../core/tracking/tracking.service';
import { CART_DETAIL_SERVICE, CartDetailService } from '../../cart/services/cart-detail.service';
import { SelectDropdownCityOption } from '../../dropdown/select-dropdown-city-option';
import { SelectOption } from '../../layout/filters/select/select.interface';
import { BaseResponse } from '../../models/base-response';
import { CartSession } from '../../models/cart/cart-session.model';
import { Cart } from '../../models/cart/cart.model';
import { Partner } from '../../models/partner/partner.model';
import { Plan } from '../../models/plan/plan.model';
import { FreeSeatingMapQuery } from '../../models/seating-map/free-seating-map-query';
import { FreeSeatingMap } from '../../models/seating-map/free-seating-map.model';
import { SeatingMap, SeatingMapState } from '../../models/seating-map/seating-map.model';
import { DateAvailability } from '../../models/session-availability/date-availability.model';
import { RegularSessionAvailabilitySummaryByDate } from '../../models/session-availability/regular-session-availability-summary-by-date.model';
import { Seat } from '../../models/session-availability/seat.model';
import {
  SessionAvailabilitySummaryByDate,
  SessionAvailabilitySummaryByDateType,
} from '../../models/session-availability/session-availability-summary-by-date.model';
import { SessionAvailabilitySummary } from '../../models/session-availability/session-availability-summary.model';
import { seatingSelectorStep, Step, ticketSelectorStep } from '../../models/step/step.model';
import { MaxLimitTicketFieldEnum } from '../../models/ticket-type/max-limit-ticket-field.enum';
import { OngoingMultiDayTicketGroup } from '../../models/ticket-type/ongoing-multi-day-ticket-group.model';
import { TicketType } from '../../models/ticket-type/ticket-type.model';
import { FeatureFlags } from '../../optimizely/feature-flags';
import { OptimizelyService } from '../../optimizely/optimizely.service';
import { SearchFilter } from '../../search-bar/models/search-filter.model';
import { FreeSeatResponse } from '../../seating-selector/components/seating-selector/__data__/free-seat-response.model';
import { SeatInfo } from '../../seating-selector/components/seating-selector/__data__/seat-info.model';
import { SeatingProviderEnum } from '../../seating-selector/components/seating-selector/__data__/seating-provider.enum';
import { SeatingSelectorFinalizedResponse } from '../../seating-selector/components/seating-selector/__data__/seating-selector-finalized-response.model';
import { SeatingSelectorComponent } from '../../seating-selector/components/seating-selector/seating-selector.component';
import { CartService } from '../../services/cart/cart.service';
import { CartLinesQueryOptions, CreateCartQuery } from '../../services/cart/create-cart-query';
import { DiscardCartQuery } from '../../services/cart/discard-cart-query';
import { RemovePlanFromCartQuery } from '../../services/cart/remove-plan-from-cart-query';
import { UpdateCartQuery } from '../../services/cart/update-cart-query';
import { DualScreenStorageService } from '../../services/dual-screen/dual-screen-storage.service';
import { ErrorModalOptions, ErrorModalService } from '../../services/error-modal/error-modal.service';
import { CAPN_ID } from '../../services/partner/partner.service';
import { PlanService } from '../../services/plan/plan.service';
import { FreeSeatingMapService } from '../../services/seating-map/free-seating-map.service';
import { SeatingMapService } from '../../services/seating-map/seating-map.service';
import { Channel } from '../../services/session-availability/channel.enum';
import { DatesAvailability, DatesAvailabilityResponse } from '../../services/session-availability/dates-availability.adapter';
import { GetAvailableSessionQuery } from '../../services/session-availability/get-available-session-query';
import { SessionAvailabilityService } from '../../services/session-availability/session-availability.service';
import { SessionSelectorType } from '../../services/session-availability/session-selector-type.enum';
import { TicketingContextService } from '../../services/ticketing/ticketing-context.service';
import { ToastService } from '../../services/toast/toast.service';
import { CartUtil } from '../../utils/cart.util';
import { OngoingSessionUtil } from '../../utils/ongoing-session.util';
import { ScrollUtils } from '../../utils/scroll.utils';
import { MessageModalComponent } from '../message-modal/message-modal.component';
import {
  ADDONS_INDEPENDENT_FROM_EXPLODE_PIPE_FEATURE,
  filterOutGlobalAddonOnlySessions,
} from '../ticket-selector/addon-explode-pipe.utils';
import {
  areGroupLimitsEqual,
  buildGroupLimitsBySessionId,
  SharedAvailabilityGroupLimits,
  SharedAvailabilityGroupLimitsScope,
} from './shared-availability-group-limits.util';
import { buildSessionCartContextMap, generateCart, SessionCartContext } from './ticketing.utils';

export interface GetSessionAvailableParams {
  cacheTimeoutInSeconds?: number;
  daysWithActiveSession?: number;
  includeOngoing?: boolean;
  includeSoldOutSessions?: boolean;
  onlyGetSessions?: boolean;
  useCacheEnabled?: boolean;
}

// TODO: The usage of changeDetectorRef.detectChanges() is not scalable, and error prune. This component needs to use
// an OnPush strategy instead.
@Component({
  providers: [
    CartDetailService,
    {
      provide: CART_DETAIL_SERVICE,
      useExisting: CartDetailService,
    },
  ],
  standalone: false,
  template: '',
})
export abstract class BaseTicketingComponent implements OnDestroy {
  protected cartDetailService = inject(CART_DETAIL_SERVICE, { optional: true });
  #datadogLogService = inject(DatadogLogService);
  #destroyRef = inject(DestroyRef);
  protected ticketingContextService = inject(TicketingContextService);
  protected toastService = inject(ToastService, { optional: true });

  @ViewChild('seatingSelector', { read: SeatingSelectorComponent, static: false })
  seatingSelectorRef?: SeatingSelectorComponent;

  filters!: Omit<SearchFilter, 'selectedDateRange'>;
  screen = ScreenTypeaheadInput;
  filtersSelected = false;
  sessionAvailabilitySummary: SessionAvailabilitySummary | null = null;
  displayedSessionType: SessionAvailabilitySummaryByDateType = SessionAvailabilitySummaryByDateType.Regular;
  regularSessionAvailabilitySummaryByDateList: RegularSessionAvailabilitySummaryByDate[] = [];
  productSessions: SessionAvailability[] = []; // TODO rename to productSessionAvailabilities
  productTypes: TicketType[] = [];
  ticketTypes: TicketType[] = [];
  ongoingMultiDayTicketGroups: OngoingMultiDayTicketGroup[] = [];
  isLoadingSessions = true;
  isLoadingDates = false;
  isLoadingDateSessions = false;
  error = false;
  errorObject: unknown | null = null;
  locale: string;
  plan: Plan | null = null;
  allowMultiSessionPurchase = false;
  allowMultiTimeSlotSelection = false;
  hasExplodePipe = false;
  nextAvailableDate!: string;
  selectedTicketsBySessionId = new Map<string, number>();
  selectedTicketsBySessionType = new Map<string, number>();
  selectedTicketsSeatsBySessionId = new Map<string, SeatInfo[]>();
  seatingHoldTokensBySessionId = new Map<string, string>();
  sessionSelectorType: SessionSelectorType = SessionSelectorType.BY_DATE_AND_TIME;
  shouldRestoreToBeginning = false;
  shouldGoBack = false;

  selectedSession: SessionAvailabilitySummaryByDate | null = null;
  overrideMaximumTickets?: number | null = null;
  minutesBeforeToExpire?: number | null = null;

  currency: string | null = null;
  maxLimitTicketField = MaxLimitTicketFieldEnum.MAXIMUM;

  channel!: Channel;
  channelId!: string;

  protected getAvailabilityQueryChannel(): Channel | undefined {
    return this.channel;
  }

  protected getAvailabilityQueryChannelId(): string {
    return this.channelId;
  }

  protected getRescheduleOrderId(): number | undefined {
    return undefined;
  }

  logErrorModal!: boolean;
  cart: Cart | null = null;
  nonConfirmedCart: Cart | null = null;
  isLoadingCart = false;
  showCartDetails = false;
  seatingToken: string | null = null;

  seatingMapUrl!: string | null;
  seatingMapState!: SeatingMapState | null;
  hasSeatsSelected = false;

  ticketSelectorStep: Step = ticketSelectorStep;
  seatingSelectorStep: Step = seatingSelectorStep;
  lastSelectorStep!: Step;
  currentStep: Step = this.ticketSelectorStep;
  selectedCity!: SelectDropdownCityOption;
  selectedPlace!: SelectOption;
  selectedPlan!: SelectOption;
  manageAsFreeSeatingMap = false;
  seatingProvider: SeatingProviderEnum = SeatingProviderEnum.SEATSIO;

  selectedAvailabilityFromDate!: string | null;
  showDateSelectorFrom = false;
  hasResult = false;

  protected destroy$ = new Subject<void>();
  protected ticketCounterHasErrors = false;
  readonly #partner: WritableSignal<Partner | null> = signal<Partner | null>(null);
  protected get partner(): Partner | null {
    return this.#partner();
  }
  protected set partner(value: Partner | null) {
    this.#partner.set(value);
  }
  protected isDefaultFilter!: boolean;
  protected timezone!: string;
  protected daysWithActiveSession = 8;
  protected includeSoldOutSessions!: boolean;
  protected availabilityInUtc = false;
  protected cacheTimeoutInSeconds = 0;
  protected useCacheEnabled = false;
  protected fromDate!: Date;
  protected includeOngoing = true;
  /**
   * Off for every child of this base: only the Box Office pages assign it, from
   * {@link resolveNextUpcomingSessionFlag}. `this.channel` cannot gate it, because reschedule derives
   * the channel from the order being rescheduled, so a box-office-sold order would switch the rule on
   * there too (GAME-1552).
   */
  protected preselectNextUpcomingSession = false;
  protected isHidden!: boolean;
  protected includeTimeSlotCapacity!: boolean;
  protected sessionTypeIds!: Array<number>;
  protected sessionAvailableReady = new ReplaySubject<void>(1);
  protected confirmSeatingMap$ = new ReplaySubject<void>(1);
  protected datesAvailability: Array<DateAvailability> = [];
  protected selectedDateAvailability!: DateAvailability;
  protected includeShopProducts = false;
  protected getSessionAvailableSubscription!: Subscription;
  protected isPreservingCart = false;
  protected sharedAvailabilityGroupLimitsBySessionId = new Map<number, SharedAvailabilityGroupLimits>();
  protected businessId: string | undefined;

  constructor(
    protected sessionAvailabilityService: SessionAvailabilityService,
    protected planService: PlanService,
    protected trackingService: TrackingService,
    protected translate: TranslateService,
    protected changeDetectorRef: ChangeDetectorRef,
    protected modalService: NgbModal,
    protected seatingSelectorService: SeatingMapService,
    protected freeSeatingSelectorService: FreeSeatingMapService,
    protected cartService?: CartService,
    protected errorModalService?: ErrorModalService,
    protected optimizelyService?: OptimizelyService,
    private dualScreenStorageService?: DualScreenStorageService,
  ) {
    this.locale = this.translate.currentLang;
  }

  private readonly INVALID_CART_STATUS_ERROR_CODE = 937;

  protected abstract sendLoadTicketingEvent(hasResult: boolean): void;

  addSessionsToCart(cancelRequest: Observable<void> = this.destroy$.asObservable()): void {
    if (this.addSessionsToCartIsDisabled()) {
      return;
    }
    this.setPreviousAndNextSteps(this.#hasSeatingInNonConfirmedCart());
    if (
      this.cart !== null &&
      this.cart.hasSameContent(this.nonConfirmedCart) &&
      !this.#hasSeatingInNonConfirmedCart() &&
      this.currentStep.nextStep
    ) {
      this.currentStep = this.currentStep.nextStep;
      return;
    }
    this.#addSessionsToCartSetProps();
    this.#addSessionsToCartLoadSeatingMap(cancelRequest).subscribe();
  }

  addSessionsToCartIsDisabled(): boolean {
    const emptyCart = this.nonConfirmedCart === null || this.nonConfirmedCart?.getNumberOfTicketCounts() === 0;
    return (
      emptyCart ||
      this.isLoadingCart ||
      !this.selectedSession ||
      (this.gatesAddToCartOnGroupRuleViolations() && this.hasGroupRuleViolations())
    );
  }

  protected appliesCartWideSharedAvailability(): boolean {
    return false;
  }

  protected gatesAddToCartOnGroupRuleViolations(): boolean {
    return true;
  }

  hasGroupRuleViolations(): boolean {
    const options = { includesCartWideKeys: this.appliesCartWideSharedAvailability() };
    return (this.nonConfirmedCart?.getTimeslotsViolatingGroupRules(options).length ?? 0) > 0;
  }

  clearAll(): void {
    this.shouldRestoreToBeginning = true;
    if (this.hasMultiplanSeatingFlowContext && this.cartService && this.partner) {
      this.nonConfirmedCart = null;
      if (this.cart?.id) {
        this.cartService
          .discardCart({ cartId: this.cart.id, partnerId: this.partner.id })
          .pipe(
            takeUntilDestroyed(this.#destroyRef),
            finalize(() => this.restoreToBeginning()),
          )
          .subscribe();
      } else {
        this.restoreToBeginning();
      }
      return;
    }
    if (this.nonConfirmedCart !== null && this.nonConfirmedCart.hasSeating && this.currentStep == seatingSelectorStep) {
      this.clearSeats();
      return;
    }
    this.continueRestore();
  }

  closeError(): void {
    this.error = false;
    this.errorObject = null;
  }

  confirmSeating(data?: SeatingSelectorFinalizedResponse): void {
    this.isLoadingCart = true;
    this.seatingToken = data?.holdToken ?? null;
    if (data?.holdToken) {
      this.#storeHoldTokenForSessions(data.holdToken);
    }
    this.createOrUpdateCart()
      .pipe(
        mergeMap(response => this.checkResponseData(response)),
        takeUntilDestroyed(this.#destroyRef),
        finalize(() => (this.isLoadingCart = false)),
      )
      .subscribe(
        response => {
          this.createOrUpdateCartResponse(response, this.#hasSeatingInNonConfirmedCart());
          this.confirmSeatingMap$.next();
        },
        response => this.showModalError(response?.error?.message),
      );
  }

  createCart(cart: Cart): Observable<BaseResponse<Cart>> {
    if (!this.partner) {
      return EMPTY;
    }
    const query: CreateCartQuery = {
      channel: this.channel,
      channelId: this.channelId,
      locale: cart.locale,
      partnerId: this.partner.id,
      seatingHoldTokensBySessionId: this.shouldUseSeatingHoldTokensBySession ? this.seatingHoldTokensBySessionId : undefined,
      seatingToken: this.seatingToken,
      sessionItemsByDatetime: cart.sessionItemsByDatetime,
      ...this.getCartLinesQueryOptions(),
    };
    return this.cartService!.createCart(query) as Observable<BaseResponse<Cart>>;
  }

  createOrUpdateCart(): Observable<BaseResponse<Cart>> {
    if (!this.cart && this.nonConfirmedCart !== null) {
      return this.createCart(this.nonConfirmedCart);
    }
    const updatedCart = this.currentStep == this.seatingSelectorStep ? this.cart : this.nonConfirmedCart;
    if (!updatedCart) {
      return of();
    }
    return this.updateCartWithSessionItems(updatedCart);
  }

  discardCartBeforeNavigation(): Observable<void> {
    const cartId = this.cart?.id ?? this.nonConfirmedCart?.id;
    this.clearSelectedTicketsReferences();
    this.seatingHoldTokensBySessionId = new Map();
    this.nonConfirmedCart = null;
    this.seatingToken = null;
    this.cart = null;
    this.cartDetailService?.clearCart();
    if ((this.seatingSelectorRef?.seatsCounter ?? 0) > 0) {
      this.seatingSelectorRef?.clearSelection({ expireHoldToken: true });
    }
    if (!this.cartService || !this.partner || !cartId) {
      return of(void 0);
    }
    const query: DiscardCartQuery = {
      cartId,
      partnerId: this.partner.id,
    };
    return this.cartService.discardCart(query).pipe(
      takeUntilDestroyed(this.#destroyRef),
      map((): undefined => void 0),
      catchError(() => of(void 0)),
    );
  }

  getUnloadDiscardCartQuery(): DiscardCartQuery | null {
    const cartId = this.cart?.id ?? this.nonConfirmedCart?.id;
    if (!cartId || !this.cartService || !this.partner) {
      return null;
    }
    return { cartId, partnerId: this.partner.id };
  }

  finishSeating(): void {
    if (!this.seatingSelectorRef) {
      this.#datadogLogService.logWarn('[BaseTicketing] finishSeating called with undefined seatingSelectorRef');
      return;
    }
    this.seatingSelectorRef.finishSeatingSelection();
  }

  generateFreeSeatingMap(): void {
    this.setPreviousAndNextSteps(this.manageAsFreeSeatingMap);
    this.seatingMapState = null;
    this.seatingMapUrl = null;
    this.seatingToken = null;
    this.loadFreeSeatingMap().subscribe({
      error: response => this.showModalError(response?.error?.message),
      next: () => {
        this.goToNextStep();
      },
    });
  }

  goBack(): void {
    if (this.manageAsFreeSeatingMap) {
      this.clearAll();
      return;
    }
    if (this.currentStep == this.seatingSelectorStep) {
      this.shouldGoBack = true;
      this.clearSeats();
      return;
    }

    if (this.currentStep.previousStep) {
      this.currentStep = this.currentStep.previousStep;
    } else {
      this.restoreToBeginning();
    }
    this.changeDetectorRef.detectChanges();
    this.resetScroll();
  }

  handleDisplayedSessionTypeChange(selectedSessionType: SessionAvailabilitySummaryByDateType): void {
    this.displayedSessionType = selectedSessionType;

    this.productTypes = this.sessionAvailabilitySummary!.getProductTypes();
    this.ticketTypes = this.sessionAvailabilitySummary!.getTicketTypes();

    if (this.selectedTicketsBySessionType.size !== 0) {
      this.selectedTicketsBySessionType = new Map([...this.ticketTypes].map(ticketType => [ticketType.name, 0]));
      this.selectedTicketsBySessionId = new Map([...this.ticketTypes].map(ticketType => [ticketType.sessionId!.toString(), 0]));
    }

    this.updateTicketTypeFields();
  }

  loadMoreDays(daysWithActiveSession = this.daysWithActiveSession): void {
    if (this.isLoadingSessions || this.isLoadingDates) {
      return;
    }
    if (this.sessionAvailabilitySummary!.regularSessionAvailabilitySummaryByDates.length === 0) {
      return;
    }
    if (!this.sessionAvailabilitySummary!.nextAvailableDate || this.sessionAvailabilitySummary!.nextAvailableDate.length == 0) {
      return;
    }
    this.isLoadingDates = true;
    const nextDate = moment(this.sessionAvailabilitySummary!.nextAvailableDate).tz(this.timezone).toDate();
    this.fromDate = new Date(Date.UTC(nextDate.getFullYear(), nextDate.getMonth(), nextDate.getDate()));
    this.requestDatesAndSessionsAvailability({ daysWithActiveSession, includeOngoing: false });
  }

  loadNewSearch(filters: Omit<SearchFilter, 'selectedDateRange'>, date?: Date, preserveCart = false): void {
    this.isPreservingCart = preserveCart;
    if (!preserveCart) {
      this.cart = null;
      this.nonConfirmedCart = null;
      this.seatingHoldTokensBySessionId = new Map();
    }
    this.seatingMapUrl = null;
    this.seatingMapState = null;
    this.seatingToken = null;
    this.currentStep = ticketSelectorStep;
    this.partner = filters.partner as Partner;
    this.selectedCity = filters.selectedCity!;
    this.selectedPlan = filters.selectedPlan!;
    this.selectedPlace = filters.selectedPlace!;
    this.timezone = filters.timezone;
    this.isDefaultFilter = filters.isDefaultFilter;
    this.filtersSelected = Boolean(filters.selectedCity && filters.selectedPlan && filters.selectedPlace);
    this.clearSelectedTickets();
    const today = new Date();
    this.fromDate = date ? date : new Date(Date.UTC(today.getFullYear(), today.getMonth(), today.getDate()));
    this.regularSessionAvailabilitySummaryByDateList = [];
    this.productSessions = [];
    this.productTypes = [];
    this.ticketTypes = [];
    this.datesAvailability = [];
    this.isLoadingSessions = true;
    this.resetIncludeOngoing();
    if (this.filtersSelected) {
      this.requestDatesAndSessionsAvailability();
    } else {
      this.getSessionAvailableSubscription?.unsubscribe();
      this.isLoadingSessions = false;
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
  }

  onClearSelectionRequested(): void {
    const cartId = this.cart?.id ?? this.nonConfirmedCart?.id;
    this.clearSelectedTicketsReferences();
    this.seatingHoldTokensBySessionId = new Map();
    this.nonConfirmedCart = null;
    this.seatingToken = null;
    this.cart = null;
    this.cartDetailService?.clearCart();
    this.applySharedAvailabilityGroupLimits();
    if (!cartId || !this.cartService || !this.partner) {
      return;
    }
    const query: DiscardCartQuery = {
      cartId,
      partnerId: this.partner.id,
    };
    this.cartService.discardCart(query).pipe(takeUntilDestroyed(this.#destroyRef)).subscribe();
  }

  selectDate(dateAvailability: DateAvailability): void {
    this.selectedDateAvailability = dateAvailability;
    this.selectedSession = null;
    const nextDate = moment(dateAvailability.date).tz(this.timezone).toDate();
    this.fromDate = new Date(Date.UTC(nextDate.getFullYear(), nextDate.getMonth(), nextDate.getDate()));
    this.regularSessionAvailabilitySummaryByDateList = [];
    this.getSessionsForSelectedDate({ daysWithActiveSession: 1 });
  }

  selectedSessionHasSeating(): boolean {
    return (
      this.selectedSession?.selectedDatetime?.sessionAvailabilityList.some(
        session => session.seating !== null && session.seating !== undefined,
      ) ?? false
    );
  }

  selectSeats(seating: Seat): void {
    this.updateSeats(this.cart!, seating ? seating.seats : [], true, seating?.category);
  }

  selectSession(selectedSession: SessionAvailabilitySummaryByDate): void {
    this.selectedSession = selectedSession;
    this.updateTicketTypeFields();
    this.updateNonConfirmedCart();
  }

  selectTicketCounter(ticketTypeCounter: { bySessionId: Map<string, number>; bySessionType: Map<string, number> }): void {
    this.selectedTicketsBySessionType = new Map(ticketTypeCounter.bySessionType);
    this.selectedTicketsBySessionId = new Map(ticketTypeCounter.bySessionId);
    this.updateNonConfirmedCart();
    this.changeDetectorRef.detectChanges();
  }

  setTicketCounterHasErrors(hasErrors: boolean): void {
    this.ticketCounterHasErrors = hasErrors;
    this.updateNonConfirmedCart();
  }

  updateFreeMapMode(): void {
    const isFreeMapSelector = this.sessionSelectorType === SessionSelectorType.BY_FREE_SELECTION_MAP;
    const currentSelectedDatetimeHasSeating = this.selectedSessionHasSeating();
    const firstSummaryWithSeating = this.regularSessionAvailabilitySummaryByDateList.find(summaryByDate =>
      summaryByDate.sessionAvailabilityByDatetimeList.some(datetimeAvailability =>
        datetimeAvailability.sessionAvailabilityList.some(session => session.seating !== null && session.seating !== undefined),
      ),
    );
    const firstDatetimeWithSeating = this.selectedSession?.sessionAvailabilityByDatetimeList?.find(datetimeAvailability =>
      datetimeAvailability.sessionAvailabilityList.some(session => session.seating !== null && session.seating !== undefined),
    );
    if (
      isFreeMapSelector &&
      (!this.selectedSession || !this.selectedSession.selectedDatetime || !currentSelectedDatetimeHasSeating) &&
      firstSummaryWithSeating
    ) {
      this.selectedSession = firstSummaryWithSeating;
      const firstDatetimeWithSeatingInSummary = firstSummaryWithSeating.sessionAvailabilityByDatetimeList.find(datetimeAvailability =>
        datetimeAvailability.sessionAvailabilityList.some(session => session.seating !== null && session.seating !== undefined),
      );
      if (firstDatetimeWithSeatingInSummary) {
        this.selectedSession.selectedDatetime = firstDatetimeWithSeatingInSummary;
      }
    }
    if (isFreeMapSelector && !currentSelectedDatetimeHasSeating && firstDatetimeWithSeating && this.selectedSession) {
      this.selectedSession.selectedDatetime = firstDatetimeWithSeating;
    }
    const hasSelectedDatetime = !!this.selectedSession?.selectedDatetime;
    const nextManageAsFreeSeatingMap = hasSelectedDatetime && isFreeMapSelector && this.selectedSessionHasSeating();
    this.manageAsFreeSeatingMap = nextManageAsFreeSeatingMap;

    if (this.manageAsFreeSeatingMap && !this.isPreservingCart) {
      this.clearCart();
      this.clearSelectedTicketsReferences();
    }
  }

  updateSeatsInCart(data: FreeSeatResponse): void {
    if (this.selectedSession && this.selectedSession.selectedDatetime != null) {
      if (data.adding && data.holdToken) {
        this.seatingToken = data.holdToken;
        this.seatingHoldTokensBySessionId.set(data.sessionId.toString(), data.holdToken);
        if (this.seatingMapState) {
          this.seatingMapState.hold_token = data.holdToken;
          this.seatingMapState.seating_provider = this.seatingProvider;
        }
      }
      this.updateSelectedTicket(data.sessionId, data.adding, data.seatInfo);
      this.nonConfirmedCart = this.getCart();
    }
  }

  updateSelectedTicket(sessionId: number, adding: boolean, seatInfo: SeatInfo): void {
    const category = this.getSelectedSessionSeatingCategory(sessionId);
    if (adding) {
      this.addSelectedTicket(sessionId.toString(), category, seatInfo);
    } else {
      this.removeSelectedTicket(sessionId.toString(), category, seatInfo);
    }
  }

  protected addSessionsToCartObservable(isEarlyReturnEnabled: boolean = true): Observable<BaseResponse<Cart> | never | void> {
    if (this.addSessionsToCartIsDisabled()) {
      return EMPTY;
    }

    if (
      isEarlyReturnEnabled &&
      this.cart !== null &&
      this.cart.hasSameContent(this.nonConfirmedCart) &&
      !this.#hasSeatingInNonConfirmedCart() &&
      this.currentStep.nextStep
    ) {
      this.currentStep = this.currentStep.nextStep;
      return of(void 0);
    }
    this.setPreviousAndNextSteps(this.#hasSeatingInNonConfirmedCart());
    this.#addSessionsToCartSetProps();
    return this.#addSessionsToCartLoadSeatingMap(null);
  }

  protected canApplyAvailabilityPerformance(): boolean {
    const isOngoingCapablePlan = (this.plan?.isTimeless() ?? false) || (this.plan?.isGiftCard() ?? false);
    return !isOngoingCapablePlan;
  }

  protected getDatesAvailabilityQuery(query: GetAvailableSessionQuery): GetAvailableSessionQuery {
    return query;
  }

  #datesAvailabilityQuery(query: GetAvailableSessionQuery, usePerformanceAvailability: boolean): GetAvailableSessionQuery {
    const datesAvailabilityQuery = this.getDatesAvailabilityQuery(query);
    if (usePerformanceAvailability) {
      return { ...datesAvailabilityQuery, sessionTypeIds: undefined };
    }
    return datesAvailabilityQuery;
  }

  protected requestDatesAndSessionsAvailability(params: GetSessionAvailableParams = {}): void {
    this.getSessionAvailable({ ...params, onlyGetSessions: false });
  }

  protected getSessionsForSelectedDate(params: GetSessionAvailableParams = {}): void {
    this.getSessionAvailable({ ...params, onlyGetSessions: true });
  }

  protected changePlan(): Observable<Plan> {
    if (!this.partner) {
      return EMPTY;
    }
    return this.planService.getPlan(this.partner.id, this.selectedPlan.id).pipe(
      map(response => this.mapApiResponse(response) as Plan),
      tap(plan => {
        if (this.plan?.id !== plan.id) {
          this.selectedAvailabilityFromDate = null;
        }
        this.plan = plan;
      }),
    );
  }

  protected checkResponseData<T>(response: BaseResponse<T>): Observable<BaseResponse<T>> {
    return response?.data ? of(response) : throwError(response);
  }

  protected clearCart(): void {
    if (this.cart) {
      this.sendClickClearAllCartEvent();
      this.cart = null;
      this.cartDetailService?.clearCart();
    }
    if (!this.isPreservingCart) {
      this.nonConfirmedCart = null;
    }
  }

  protected clearSeats(): void {
    if (!this.seatingSelectorRef || this.seatingSelectorRef.seatsCounter === 0) {
      this.continueRestore();
      return;
    }
    this.seatingSelectorRef.clearSelection();
    const resetTicketTypeRow = (ticketType: TicketType): void => {
      ticketType.availableTickets = 0;
      ticketType.isHidden = false;
      ticketType.price = undefined;
      ticketType.partySizeMinimum = 0;
    };
    this.ticketTypes.forEach(resetTicketTypeRow);
    for (const group of this.ongoingMultiDayTicketGroups) {
      group.ticketTypes.forEach(resetTicketTypeRow);
    }
    if (this.selectedSession && this.selectedSession.selectedDatetime !== null) {
      const timeslotSessions = this.selectedSession.selectedDatetime.sessionAvailabilityList;
      timeslotSessions.forEach(session => {
        const index = this.ticketTypes.findIndex(ticketType => ticketType.sessionId === session.id);
        if (this.ticketTypes[index]) {
          this.#applySessionAvailabilityToTicketType(this.ticketTypes[index], session);
          this.ticketTypes[index].partySizeMinimum = SessionAvailability.partySizeMinimumForSession(session, timeslotSessions);
        }
      });
    }
    const ongoingBySessionId = this.#getOngoingSessionAvailabilityBySessionId();
    const ongoingTimeslotBySessionId = this.#getOngoingTimeslotSessionsBySessionId();
    for (const group of this.ongoingMultiDayTicketGroups) {
      for (const ticketType of group.ticketTypes) {
        if (ticketType.sessionId === undefined) {
          continue;
        }
        const session = ongoingBySessionId.get(ticketType.sessionId);
        if (session) {
          this.#applySessionAvailabilityToTicketType(ticketType, session);
          const timeslotSessions = ongoingTimeslotBySessionId.get(ticketType.sessionId) ?? [session];
          ticketType.partySizeMinimum = SessionAvailability.partySizeMinimumForSession(session, timeslotSessions);
        }
      }
    }
  }

  #applySessionAvailabilityToTicketType(ticketType: TicketType, session: SessionAvailability): void {
    ticketType.availableTickets = session.availableTickets ? session.availableTickets : 0;
    ticketType.isHidden = session.isHidden;
    ticketType.price = session.ticketPrice ?? undefined;
    ticketType.isPurchasable = !session.isDisabled();
    ticketType.sessionId = session.id;
    ticketType.stepQuantity = this.getStepQuantityFromSession(session);
  }

  #getOngoingSessionAvailabilityBySessionId(): Map<number, SessionAvailability> {
    const map = new Map<number, SessionAvailability>();
    for (const bucket of this.getOngoingMultiDayBuckets()) {
      for (const slot of bucket.sessionAvailabilityByDatetimeList) {
        for (const session of slot.sessionAvailabilityList) {
          map.set(session.id, session);
        }
      }
    }
    return map;
  }

  #getOngoingTimeslotSessionsBySessionId(): Map<number, SessionAvailability[]> {
    const map = new Map<number, SessionAvailability[]>();
    for (const bucket of this.getOngoingMultiDayBuckets()) {
      for (const slot of bucket.sessionAvailabilityByDatetimeList) {
        for (const session of slot.sessionAvailabilityList) {
          map.set(session.id, slot.sessionAvailabilityList);
        }
      }
    }
    return map;
  }

  #ticketTypeFromSession(session: SessionAvailability, isOngoingMultiDay: boolean): TicketType {
    return new TicketType(
      session.name,
      session.sessionType?.id,
      session.minimumTicketsAllowedPerBooking,
      session.maximumTicketsAllowedPerBooking,
      !session.isDisabled(),
      session.isHidden,
      session.availableTickets,
      session.ticketPrice ?? undefined,
      session.surchargePerTicket,
      session.id,
      session.sessionType!.reservationRestriction,
      session.sessionType!.ticketReceiptLabel,
      session.sessionType!.isAddOn,
      session.details,
      false,
      session.strikethroughPrice,
      undefined,
      this.getStepQuantityFromSession(session),
      isOngoingMultiDay,
      undefined,
      undefined,
      session.sessionType?.imageUrl,
      session.sessionType?.tileColor,
    );
  }

  #formatOngoingCalendarDayLabel(isoDateOnly: string): string {
    const m = moment.tz(`${isoDateOnly}T12:00:00`, this.timezone);
    if (this.locale) {
      m.locale(this.locale);
    }
    return typeof m.format === 'function' ? m.format('LL') : isoDateOnly;
  }

  #formatOngoingSessionDateTimeLabel(iso: string): string {
    const m = moment.tz(iso, this.timezone);
    if (this.locale) {
      m.locale(this.locale);
    }
    return typeof m.format === 'function' ? m.format('lll') : iso;
  }

  #ongoingBucketFinishesOnLabel(bucket: RegularSessionAvailabilitySummaryByDate): string {
    let latest: moment.Moment | undefined;
    for (const slot of bucket.sessionAvailabilityByDatetimeList) {
      for (const session of slot.sessionAvailabilityList) {
        if (!session.endsAt) {
          continue;
        }
        const m = moment.tz(session.endsAt, this.timezone);
        if (!latest || m.isAfter(latest)) {
          latest = m;
        }
      }
    }
    if (!latest) {
      return '';
    }
    if (this.locale) {
      latest.locale(this.locale);
    }
    return typeof latest.format === 'function' ? latest.format('LL') : latest.toISOString();
  }

  #rebuildOngoingMultiDayTicketGroups(): void {
    this.ongoingMultiDayTicketGroups = [];
    const selectedDate = this.selectedSession?.date;
    const selectedDatetime = this.selectedSession?.selectedDatetime?.datetime;
    for (const bucket of this.getOngoingMultiDayBuckets()) {
      const startOn = this.#formatOngoingCalendarDayLabel(bucket.date);
      const finishOn = this.#ongoingBucketFinishesOnLabel(bucket);
      const seenSessionIds = new Set<number>();
      const types: TicketType[] = [];
      for (const slot of bucket.sessionAvailabilityByDatetimeList) {
        for (const session of slot.sessionAvailabilityList) {
          if (seenSessionIds.has(session.id)) {
            continue;
          }
          if (selectedDate && !OngoingSessionUtil.isSessionOngoingOnDate(session, selectedDate, this.timezone, selectedDatetime)) {
            continue;
          }
          seenSessionIds.add(session.id);
          const ticketType = this.#ticketTypeFromSession(session, true);
          ticketType.ongoingMultiDayStartOnLabel = this.#formatOngoingSessionDateTimeLabel(session.startsAt);
          ticketType.ongoingMultiDayFinishOnLabel = OngoingSessionUtil.isOpenEndedSession(session)
            ? ''
            : this.#formatOngoingSessionDateTimeLabel(session.endsAt);
          types.push(ticketType);
        }
      }
      if (types.length === 0) {
        continue;
      }
      this.ongoingMultiDayTicketGroups.push({
        startOn,
        finishOn,
        ticketTypes: types,
      });
    }
  }

  protected rebuildOngoingMultiDayTicketGroups(): void {
    this.#rebuildOngoingMultiDayTicketGroups();
  }

  protected clearSelectedTickets(): void {
    this.clearSelectedTicketsReferences();
    this.selectedSession = null;
    const types = [...this.ticketTypes];
    this.ticketTypes = [];
    this.ticketTypes = types;
  }

  protected clearSelectedTicketsReferences(): void {
    this.selectedTicketsBySessionId = new Map();
    this.selectedTicketsBySessionType = new Map();
    this.selectedTicketsSeatsBySessionId = new Map();
    if (!this.isPreservingCart) {
      this.seatingHoldTokensBySessionId = new Map();
    }
    this.hasSeatsSelected = false;
  }

  protected continueRestore(): void {
    if (this.shouldGoBack) {
      this.shouldGoBack = false;
      if (this.currentStep.previousStep) {
        this.currentStep = this.currentStep.previousStep;
      } else {
        this.restoreToBeginning();
      }
      this.resetScroll();
      return;
    }
    if (this.cart) {
      this.discardCartAndRestore();
      return;
    }
    this.restoreToBeginning();
  }

  protected getCartItemsCount(cart: Cart | null): number {
    return cart?.getNumberOfTicketAndProductCounts() ?? 0;
  }

  private getStepQuantityFromSession(session: SessionAvailability): number {
    const q = session.sessionType?.ticketSelectorStepQuantity;
    if (q === undefined || q === null) return 1;
    const num = Number(q);
    return Number.isInteger(num) && num > 0 ? num : 1;
  }

  protected createOrUpdateCartResponse(response: BaseResponse<Cart>, hasSeating: boolean): void {
    const previousCart = this.cart;
    const previousPlanCount = this.#countUniquePlans(previousCart);

    this.cart = response.data;
    if (this.cart) {
      this.cartDetailService?.setCart(this.cart);
      this.cart.hasSeating = hasSeating;
    }

    const currentPlanCount = this.#countUniquePlans(this.cart);

    if (currentPlanCount >= 2 && currentPlanCount > previousPlanCount && this.toastService) {
      this.toastService.add({
        message: this.translate.instant('boxOffice.cart.newPlanAdded.message'),
        sentiment: AlertSentiment.positive,
        title: this.translate.instant('boxOffice.cart.newPlanAdded.title'),
      });
    }

    this.sendClickAddToCartEvent();
    this.goToNextStep();
  }

  protected get currentPlanTicketsInCart(): CartSession[] {
    return this.ticketingContextService.getTicketsForCurrentPlan({
      cart: this.cart,
      currentPlanId: this.selectedPlan?.id ?? 0,
      nonConfirmedCart: this.nonConfirmedCart,
    });
  }

  protected getOngoingMultiDayBuckets(): RegularSessionAvailabilitySummaryByDate[] {
    const selectedKey = this.selectedSession?.date;
    if (!selectedKey || !this.regularSessionAvailabilitySummaryByDateList?.length) {
      return [];
    }
    return this.regularSessionAvailabilitySummaryByDateList.filter(
      summary =>
        summary.date < selectedKey &&
        summary.sessionAvailabilityByDatetimeList.length > 0 &&
        this.#hasAnySessionOngoingOnSelectedDate(summary, selectedKey),
    );
  }

  /**
   * A bucket is "ongoing" for the selected date only when it contains at least one session that starts before the
   * selected calendar day AND ends on or after the selected calendar day (i.e. a truly multi-day ongoing session).
   * Otherwise the bucket is just an earlier date that happens to have sessions; treating it as ongoing would break
   * unrelated flows (e.g. duplicated sessionIds across days, date disabled-state calculation).
   */
  #hasAnySessionOngoingOnSelectedDate(bucket: RegularSessionAvailabilitySummaryByDate, selectedDate: string): boolean {
    return OngoingSessionUtil.isBucketOngoingOnDate(bucket, selectedDate, this.timezone);
  }

  protected buildSessionCartContextForCart(): Map<number, SessionCartContext> {
    return buildSessionCartContextMap(this.selectedSession, this.getOngoingMultiDayBuckets());
  }

  getOngoingMultiDaySelectedTicketTypeNames(): string[] {
    const seen = new Set<string>();
    const names: string[] = [];
    for (const group of this.ongoingMultiDayTicketGroups) {
      for (const ticketType of group.ticketTypes) {
        if (ticketType.sessionId === undefined) {
          continue;
        }
        const bySessionId = this.selectedTicketsBySessionId.get(String(ticketType.sessionId)) ?? 0;
        const bySessionType = this.selectedTicketsBySessionType.get(ticketType.name) ?? 0;
        if ((bySessionId > 0 || bySessionType > 0) && !seen.has(ticketType.name)) {
          seen.add(ticketType.name);
          names.push(ticketType.name);
        }
      }
    }
    return names;
  }

  protected getCart(): Cart | null {
    const sessionContextBySessionId = this.buildSessionCartContextForCart();
    return generateCart({
      productSessions: this.sessionAvailabilitySummary?.productSessions ?? [],
      seatingHoldTokensBySessionId: this.shouldUseSeatingHoldTokensBySession ? this.seatingHoldTokensBySessionId : undefined,
      seatingProvider: this.seatingProvider,
      selectedTickets: {
        bySeating: this.selectedTicketsSeatsBySessionId,
        bySessionId: this.selectedTicketsBySessionId,
        bySessionType: this.selectedTicketsBySessionType,
      },
      session: this.selectedSession,
      timezone: this.timezone,
      sessionContextBySessionId: sessionContextBySessionId.size > 0 ? sessionContextBySessionId : undefined,
    });
  }

  protected getCartMixpanelData(): ClickClearAllCartData {
    return {
      cart_id: this.cart?.id ?? '',
      channel: this.channelId ?? this.channel,
      city_id: this.selectedCity.id,
      city_name: this.selectedCity.title,
      partner_id: this.partner?.id ?? -1,
      place_id: this.selectedPlace.id,
      place_name: this.selectedPlace.title,
      plan_id: this.selectedPlan.id,
      plan_name: this.selectedPlan.title,
      time: new Date().toISOString(),
    };
  }

  protected getDatesAvailability(dates: DatesAvailability | undefined): DatesAvailability | null {
    if (
      this.daysWithActiveSession !== 1 ||
      this.partner?.id !== CAPN_ID ||
      this.channel !== Channel.BoxOffice ||
      !dates ||
      dates?.size === 0
    ) {
      return dates ?? null;
    }
    const dateAvailability = new Date(Array.from(dates.keys())[0]);
    return dateAvailability.toISOString() === this.fromDate.toISOString() ? dates : null;
  }

  protected getIncludeOngoing(): boolean {
    return this.includeOngoing;
  }

  protected getIncludeOngoingForSessionsForDate(): boolean {
    return this.getIncludeOngoing();
  }

  protected getLoadTicketingData(hasResult: boolean): LoadTicketingData {
    return {
      city_id: this.selectedCity.id,
      city_name: this.selectedCity.title,
      default_filter: this.isDefaultFilter,
      has_results: hasResult,
      place_id: this.selectedPlace.id,
      place_name: this.selectedPlace.title,
      plan_id: this.selectedPlan.id,
      plan_name: this.selectedPlan.title,
      time: new Date().toISOString(),
    };
  }

  protected getSessionAvailable(params: GetSessionAvailableParams): void {
    if (!this.partner || !this.selectedPlan || !this.fromDate || !this.timezone) {
      return;
    }
    this.error = false;
    this.errorObject = null;
    this.hasResult = false;
    const query: GetAvailableSessionQuery = {
      businessId: this.businessId,
      cacheTimeoutInSeconds: params.cacheTimeoutInSeconds ?? this.cacheTimeoutInSeconds,
      channel: this.getAvailabilityQueryChannel(),
      channelId: this.getAvailabilityQueryChannelId(),
      contentLanguage: this.translate.currentLang,
      daysWithActiveSession: params.daysWithActiveSession ?? this.daysWithActiveSession,
      fromDate: this.fromDate,
      includeOngoing: params.includeOngoing ?? this.includeOngoing,
      includeSoldOutSessions: params.includeSoldOutSessions ?? this.includeSoldOutSessions,
      partnerId: this.partner.id,
      placeId: this.selectedPlace.id,
      planId: this.selectedPlan.id,
      sessionTypeIds: this.sessionTypeIds,
      timezone: this.timezone,
    };

    if (this.availabilityInUtc) {
      query.utc = true;
    }

    if (this.isHidden !== undefined) {
      query.isHidden = this.isHidden;
    }

    if (this.includeTimeSlotCapacity) {
      query.includeTimeSlotCapacity = this.includeTimeSlotCapacity;
    }

    const rescheduleOrderId = this.getRescheduleOrderId();
    if (rescheduleOrderId !== undefined) {
      query.rescheduleOrderId = rescheduleOrderId;
    }

    this.getSessionAvailableSubscription?.unsubscribe();
    this.getSessionAvailableSubscription = this.changePlan()
      .pipe(
        mergeMap(() => {
          query.includeOngoing = params.includeOngoing ?? this.getIncludeOngoing();
          query.includeShopProducts = this.includeShopProducts;
          return this.getDatesAndSessionsAvailability(
            query,
            params.useCacheEnabled ?? this.useCacheEnabled,
            params.onlyGetSessions ?? true,
          );
        }),
        finalize(() => this.onGetSessionAvailableEnd()),
        takeUntilDestroyed(this.#destroyRef),
      )
      .subscribe(
        response => {
          this.isLoadingSessions = false;
          this.isLoadingDates = false;
          if (response?.data) {
            this.hasResult =
              response.data.regularSessionAvailabilitySummaryByDates && response.data.regularSessionAvailabilitySummaryByDates.length > 0;
            this.sendLoadTicketingEvent(this.hasResult);
            const availabilityDates = this.filterOutWhenOnlyGlobalAddons(response.data.regularSessionAvailabilitySummaryByDates);
            this.hasResult = availabilityDates.length > 0;
            this.regularSessionAvailabilitySummaryByDateList = availabilityDates;
            const newProductSessions = response?.data?.productSessions ?? [];
            newProductSessions.forEach(newProductSession => {
              if (!this.productSessions.some(existingProductSession => existingProductSession.id === newProductSession.id)) {
                this.productSessions.push(newProductSession);
              }
            });
            const newProductTypes = response?.data?.getProductTypes() ?? [];
            newProductTypes.forEach(newProductType => {
              if (!this.productTypes.some(existingProductType => existingProductType.sessionId === newProductType.sessionId)) {
                this.productTypes.push(newProductType);
              }
            });
            this.allowMultiSessionPurchase = response.data.allowMultiSessionPurchase;
            this.hasExplodePipe = response.data.hasExplodePipe;
            this.timezone = response.data.timezone;
            this.resetScroll();
            this.resetSelectedTickets();
            this.currency = this.getCurrency();
            this.sessionSelectorType = response.data.sessionSelectorType as SessionSelectorType;
            this.updateFreeMapMode();
            this.sessionAvailableReady.next();
          } else {
            this.error = true;
            this.errorObject = response?.error;
          }
          this.changeDetectorRef.markForCheck();
          this.resetPreservingCartAfterRender();
        },
        error => {
          this.isLoadingSessions = false;
          this.isLoadingDates = false;
          this.error = true;
          this.errorObject = error;
          this.changeDetectorRef.detectChanges();
          this.resetPreservingCartAfterRender();
        },
      );
  }

  protected goToNextStep(): void {
    if (this.currentStep.nextStep) {
      this.currentStep = this.currentStep.nextStep;
      this.changeDetectorRef.detectChanges();
    }
  }

  protected handleCartContent(): Observable<BaseResponse<Cart> | never | void> {
    const emptyCart = !this.nonConfirmedCart || this.nonConfirmedCart.getNumberOfTicketAndProductCounts() === 0;
    if (emptyCart) {
      this.showModalError();
      return EMPTY;
    }
    if (this.manageAsFreeSeatingMap) {
      if (!this.seatingSelectorRef) {
        return EMPTY;
      }
      this.finishSeating();
      return this.confirmSeatingMap$;
    }
    return this.addSessionsToCartObservable();
  }

  protected get hasMultiplanSeatingFlowContext(): boolean {
    return this.ticketingContextService.hasMultiplanSeatingFlowContext({
      cart: this.cart,
      nonConfirmedCart: this.nonConfirmedCart,
      sessionSummaries: this.regularSessionAvailabilitySummaryByDateList,
      userAttributes: this.selectedPlan ? { plan_id: this.selectedPlan.id.toString() } : undefined,
    });
  }

  protected hasPlanSeating(): boolean {
    return this.regularSessionAvailabilitySummaryByDateList.some(summaryByDate =>
      summaryByDate.sessionAvailabilityByDatetimeList.some(datetimeAvailability =>
        datetimeAvailability.sessionAvailabilityList.some(session => session.seating !== null),
      ),
    );
  }

  protected loadFreeSeatingMap(): Observable<BaseResponse<FreeSeatingMap>> {
    const seating: Seat | null =
      this.selectedSession?.selectedDatetime?.sessionAvailabilityList.find(session => session.seating != null)?.seating ?? null;
    if (seating == null || !this.partner) {
      return EMPTY;
    }
    const freeSeatingMapQuery: FreeSeatingMapQuery = {
      channel: this.channel,
      channelId: this.channelId,
      isHidden: this.isHidden,
      partnerId: this.partner.id,
      placeId: this.selectedPlace.id,
      planId: this.selectedPlan.id,
      seatingPoolId: seating.poolId!,
    };
    return this.freeSeatingSelectorService.getFreeSeatingMap(freeSeatingMapQuery).pipe(
      mergeMap((response: BaseResponse<FreeSeatingMap>) => {
        if (!response.data) {
          return throwError(() => response.error);
        }
        this.seatingMapUrl = response.data.url;
        this.seatingMapState = response.data.state;
        this.updateSeatingProvider();
        return of(response);
      }),
    );
  }

  protected onGetSessionAvailableEnd(): void {
    if (this.hasPlanSeating()) {
      this.allowMultiTimeSlotSelection = false;
    }
  }

  protected resetIncludeOngoing(): void {
    this.includeOngoing = true;
  }

  protected resetPreservingCartAfterRender(): void {
    queueMicrotask(() => {
      if (this.hasMultiplanSeatingFlowContext) {
        const currentPlanId = this.selectedPlan?.id ?? 0;
        if (currentPlanId > 0) {
          if (this.nonConfirmedCart) {
            const filteredNonConfirmed = CartUtil.removeSessionsByMainPlanId(this.nonConfirmedCart, currentPlanId);
            this.nonConfirmedCart = filteredNonConfirmed;
          }
          if (this.cart?.id && this.cartService && this.partner) {
            const query: RemovePlanFromCartQuery = {
              cart: this.cart,
              cartId: this.cart.id,
              mainPlanId: currentPlanId,
              partnerId: this.partner.id,
            };
            this.cartService
              .removePlanFromCart(query)
              .pipe(takeUntilDestroyed(this.#destroyRef))
              .subscribe(response => {
                this.cart = response.data ?? null;
                if (this.cart) {
                  this.cartDetailService?.setCart(this.cart);
                } else {
                  this.cartDetailService?.clearCart();
                }
                this.changeDetectorRef.markForCheck();
              });
          }
        }
        this.isPreservingCart = true;
      } else {
        this.isPreservingCart = false;
      }
    });
  }

  protected resetScroll(): void {
    if (this.channel === Channel.Kiosk) {
      return;
    }
    if (this.dualScreenStorageService?.containsData()) {
      ScrollUtils.scrollToTop();
    } else if (window.innerWidth < 1200) {
      this.scrollToBoxOfficeContent();
    }
  }

  /**
   * Plan-scoped like every other Box Office decision, so switching plan without a reload re-evaluates
   * it. The Box Office pages call this where they refresh their other plan flags; nothing reads it from
   * a template, which would re-run the decision on every change-detection pass (GAME-1552).
   */
  protected resolveNextUpcomingSessionFlag(plan?: SelectOption): boolean {
    const currentPlan = plan ?? this.selectedPlan;
    // `partner_id` is not passed: OptimizelyService already stamps it on every decision.
    const userAttributes: UserAttributes = currentPlan ? { plan_id: currentPlan.id.toString() } : {};

    return this.optimizelyService?.isFeatureEnabled(FeatureFlags.BOX_OFFICE_PRESELECT_NEXT_UPCOMING_SESSION, userAttributes) ?? false;
  }

  protected restoreToBeginning() {
    this.shouldRestoreToBeginning = false;
    this.clearCart();
    this.clearSelectedTickets();
    this.seatingMapUrl = null;
    this.seatingMapState = null;
    this.seatingToken = null;
    this.seatingHoldTokensBySessionId = new Map();
    this.currentStep = this.ticketSelectorStep;
    this.showCartDetails = false;
    this.resetSelectedTickets();
    this.updateFreeMapMode();
    this.changeDetectorRef.detectChanges();
    this.resetScroll();
  }

  protected selectDefaultSessionForAdvancedFlow(): void {
    if (this.selectedTicketsBySessionType.size === 0 && !this.selectedSession) {
      this.selectFirstAvailableSessionForSelectedTickets(this.regularSessionAvailabilitySummaryByDateList);
      const session = this.selectedSession as SessionAvailabilitySummaryByDate | null;
      if (session) {
        session.selectNextAvailableDatetime(this.selectedTicketsBySessionType, this.maxLimitTicketField, {
          preferNextUpcoming: this.preselectNextUpcomingSession,
        });
      }
    }
  }

  protected sendClickAddToCartEvent(): void {
    this.trackingService.track(
      new ClickAddToCartEvent({
        ...this.getCartMixpanelData(),
        ticketing_flow: 'date_ticket',
      }),
    );
  }

  protected setPreviousAndNextSteps(hasSeating?: boolean): void {
    if (hasSeating) {
      this.ticketSelectorStep.nextStep = seatingSelectorStep;
      this.seatingSelectorStep.previousStep = ticketSelectorStep;
      this.seatingSelectorStep.nextStep = this.lastSelectorStep;
      this.lastSelectorStep.previousStep = seatingSelectorStep;
      return;
    }
    this.ticketSelectorStep.nextStep = this.lastSelectorStep;
    this.lastSelectorStep.previousStep = ticketSelectorStep;
    this.resetScroll();
  }

  protected get shouldUseSeatingHoldTokensBySession(): boolean {
    return false;
  }

  /**
   * Line options every create and update query of the flow carries. Off by default: only a flow that prices ticket types (the
   * reservation on behalf of a customer, GAME-1722) sends the cart as session item lines.
   */
  protected getCartLinesQueryOptions(): CartLinesQueryOptions {
    return {};
  }

  /** Sends the sessions of `cart` as an update of the current cart, keeping its line ids when the flow sends lines. */
  protected updateCartWithSessionItems(cart: Cart): Observable<BaseResponse<Cart>> {
    const newCart: Cart = new Cart(new Map([...cart.sessionItemsByDatetime]));
    if (this.getCartLinesQueryOptions().useSessionItemLines === true) {
      newCart.sessionItemLines = this.cart?.sessionItemLines ?? [];
    }
    return this.prepareCartForUpdateWithNewSessionItems(newCart);
  }

  protected showConfirmationModal(
    title: string,
    message: string,
    acceptButtonLabel: string,
    cancelButtonLabel: string,
    callback: (response: boolean) => void,
  ): void {
    const modal = this.modalService.open(MessageModalComponent);
    modal.componentInstance.title = this.translate.instant(title);
    modal.componentInstance.messages = [this.translate.instant(message)];
    modal.componentInstance.acceptButtonLabel = this.translate.instant(acceptButtonLabel);
    modal.componentInstance.cancelButtonLabel = this.translate.instant(cancelButtonLabel);
    modal.componentInstance.responseEmitter.pipe(takeUntilDestroyed(this.#destroyRef)).subscribe(callback);
  }

  protected showModal(title: string, message: string, errorCode?: string | number): void {
    let options: ErrorModalOptions = {
      errorCode,
      logError: this.logErrorModal,
      message,
      title,
    };
    if (this.channel === Channel.Kiosk) {
      options = { ...options, windowClass: 'kiosk-modal' };
    }

    this.errorModalService!.open(options);
  }

  /** Called with the error code when the cart request of the ticket step fails, before the error modal opens. */
  protected onCartRequestFailed?(code: number | string | undefined): void;

  protected showModalError(errorMessage?: string, titleError?: string): void {
    this.showModal(titleError ?? 'common.errorTitle', errorMessage ?? 'errors.generic');
  }

  protected updateNonConfirmedCart(): void {
    if (!this.selectedSession?.selectedDatetime?.datetime && !this.isPreservingCart) {
      this.restoreToBeginning();
    }
    if (this.ticketCounterHasErrors) {
      if (!this.isPreservingCart) {
        this.nonConfirmedCart = null;
      }
      this.applySharedAvailabilityGroupLimits();
      return;
    }
    const updatedCart = this.getCart();
    if (updatedCart !== null || !this.isPreservingCart) {
      this.nonConfirmedCart = updatedCart;
    }
    this.applySharedAvailabilityGroupLimits();
  }

  protected appliesSharedAvailabilityGroupLimits(): boolean {
    return false;
  }

  protected applySharedAvailabilityGroupLimits(): void {
    const groupLimitsBySessionId = buildGroupLimitsBySessionId(
      this.nonConfirmedCart?.sessionItemsByDatetime ?? new Map(),
      this.buildSessionCartContextForCart(),
      this.sharedAvailabilityGroupLimitsScope(),
    );
    if (areGroupLimitsEqual(this.sharedAvailabilityGroupLimitsBySessionId, groupLimitsBySessionId)) {
      return;
    }
    this.sharedAvailabilityGroupLimitsBySessionId = groupLimitsBySessionId;
  }

  protected sharedAvailabilityGroupLimitsScope(): SharedAvailabilityGroupLimitsScope {
    return this.appliesSharedAvailabilityGroupLimits() ? 'all' : 'none';
  }

  protected updateTicketTypeFields(): void {
    this.#applySessionFieldsToTicketTypes();
    this.applySharedAvailabilityGroupLimits();
  }

  #applySessionFieldsToTicketTypes(): void {
    this.updateTicketTypes();
    if (!this.selectedSession) {
      return;
    }
    const resetTicketTypeRow = (ticketType: TicketType): void => {
      ticketType.availableTickets = 0;
      ticketType.isHidden = false;
      ticketType.price = undefined;
      ticketType.partySizeMinimum = 0;
    };
    this.ticketTypes.forEach(resetTicketTypeRow);
    for (const group of this.ongoingMultiDayTicketGroups) {
      group.ticketTypes.forEach(resetTicketTypeRow);
    }
    if (this.selectedSession && this.selectedSession.selectedDatetime !== null) {
      const timeslotSessions = this.selectedSession.selectedDatetime.sessionAvailabilityList;
      timeslotSessions.forEach(session => {
        const index = this.ticketTypes.findIndex(ticketType => ticketType.sessionId === session.id);
        if (this.ticketTypes[index]) {
          this.#applySessionAvailabilityToTicketType(this.ticketTypes[index], session);
          this.ticketTypes[index].partySizeMinimum = SessionAvailability.partySizeMinimumForSession(session, timeslotSessions);
        }
      });
    }
    const ongoingBySessionId = this.#getOngoingSessionAvailabilityBySessionId();
    const ongoingTimeslotBySessionId = this.#getOngoingTimeslotSessionsBySessionId();
    for (const group of this.ongoingMultiDayTicketGroups) {
      for (const ticketType of group.ticketTypes) {
        if (ticketType.sessionId === undefined) {
          continue;
        }
        const session = ongoingBySessionId.get(ticketType.sessionId);
        if (session) {
          this.#applySessionAvailabilityToTicketType(ticketType, session);
          const timeslotSessions = ongoingTimeslotBySessionId.get(ticketType.sessionId) ?? [session];
          ticketType.partySizeMinimum = SessionAvailability.partySizeMinimumForSession(session, timeslotSessions);
        }
      }
    }
  }

  #addSessionsToCartLoadSeatingMap(notifier: ObservableInput<unknown> | null): Observable<BaseResponse<Cart>> {
    const loadSeatingMap$: Observable<BaseResponse<Cart>> = this.loadSeatingMap().pipe(
      mergeMap(() => this.createOrUpdateCart()),
      mergeMap(response => this.checkResponseData(response)),
      tap((response: BaseResponse<Cart>) => this.createOrUpdateCartResponse(response, this.#hasSeatingInNonConfirmedCart())),
      finalize(() => {
        this.isLoadingCart = false;
        this.changeDetectorRef.detectChanges();
      }),
      catchError((response: BaseResponse<null> | HttpErrorResponse | null) => {
        this.onCartRequestFailed?.(response?.error?.code);
        this.showModalError(response?.error?.message);
        return EMPTY;
      }),
    );
    return notifier !== null ? loadSeatingMap$.pipe(takeUntil(notifier)) : loadSeatingMap$;
  }

  #addSessionsToCartSetProps(): void {
    this.isLoadingCart = true;
    this.seatingMapState = null;
    this.seatingToken = null;
  }

  #countUniquePlans(cart: Cart | null): number {
    if (!cart) {
      return 0;
    }

    const planIds = new Set<number>();
    for (const sessions of cart.sessionItemsByDatetime.values()) {
      for (const session of sessions) {
        if (session.mainPlanId !== undefined) {
          planIds.add(session.mainPlanId);
        }
      }
    }

    return planIds.size;
  }

  #hasSeatingInNonConfirmedCart(): boolean {
    return this.nonConfirmedCart?.hasSeating ?? false;
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

  private addSelectedTicket(sessionId: string, category: string, seatInfo: SeatInfo): void {
    if (this.noSelectedTickets()) {
      this.selectedTicketsBySessionId = new Map([[sessionId, 1]]);
      this.selectedTicketsBySessionType = new Map([[category, 1]]);
      this.selectedTicketsSeatsBySessionId = new Map([[sessionId, [seatInfo]]]);
    } else {
      const count = !this.selectedTicketsBySessionId.has(sessionId) ? 1 : this.selectedTicketsBySessionId.get(sessionId)! + 1;
      const currentSeatReferences = !this.selectedTicketsSeatsBySessionId.has(sessionId)
        ? []
        : this.selectedTicketsSeatsBySessionId.get(sessionId)!;
      currentSeatReferences.push(seatInfo);
      this.selectedTicketsBySessionId = new Map(this.selectedTicketsBySessionId).set(sessionId, count);
      this.selectedTicketsBySessionType = new Map(this.selectedTicketsBySessionType).set(category, count);
      this.selectedTicketsSeatsBySessionId.set(sessionId, currentSeatReferences);
    }
    this.hasSeatsSelected = true;
  }

  private discardCartAndRestore(): void {
    if (!this.partner) {
      this.restoreToBeginning();
      return;
    }
    const query: DiscardCartQuery = {
      cartId: this.cart!.id!,
      partnerId: this.partner.id,
    };

    this.cartService!.discardCart(query)
      .pipe(
        takeUntilDestroyed(this.#destroyRef),
        finalize(() => this.restoreToBeginning()),
      )
      .subscribe();
  }

  protected getCurrency(): string | null {
    const allSessionsAvailability: Array<SessionAvailabilitySummaryByDate> = [...(this.regularSessionAvailabilitySummaryByDateList ?? [])];
    return allSessionsAvailability[0]?.sessionAvailabilityByDatetimeList[0]?.sessionAvailabilityList[0]?.ticketPrice?.currency ?? null;
  }

  protected getDatesAndSessionsAvailability(
    query: GetAvailableSessionQuery,
    useCacheEnabled: boolean,
    onlyGetSessions: boolean,
  ): Observable<BaseResponse<SessionAvailabilitySummary>> {
    const needsUpdateAvailabilityFromDate = !this.selectedAvailabilityFromDate && this.showDateSelectorFrom;
    const usePerformanceAvailability = this.canApplyAvailabilityPerformance();
    const datesAvailabilityQuery = this.#datesAvailabilityQuery(query, usePerformanceAvailability);

    const getDatesAvailability: Observable<BaseResponse<DatesAvailabilityResponse> | null> =
      needsUpdateAvailabilityFromDate || !onlyGetSessions
        ? this.sessionAvailabilityService.getDatesAvailability(datesAvailabilityQuery, usePerformanceAvailability, useCacheEnabled)
        : of(null);

    if (onlyGetSessions) {
      this.isLoadingDateSessions = true;

      return getDatesAvailability.pipe(
        mergeMap((datesResponse: BaseResponse<DatesAvailabilityResponse> | null) => {
          if (needsUpdateAvailabilityFromDate) {
            this.selectedAvailabilityFromDate = datesResponse?.data?.dates?.entries()?.next()?.value?.[0] ?? null;
          }

          query.includeOngoing = this.getIncludeOngoingForSessionsForDate();

          return this.sessionAvailabilityService
            .getSessionAvailableForDate(
              { ...query, utc: undefined },
              this.overrideMaximumTickets as number | undefined,
              this.minutesBeforeToExpire as number | undefined,
              useCacheEnabled,
            )
            .pipe(tap(() => (this.isLoadingDateSessions = false)));
        }),
      ) as Observable<BaseResponse<SessionAvailabilitySummary>>;
    }

    this.regularSessionAvailabilitySummaryByDateList = [];
    this.isLoadingDateSessions = true;
    return getDatesAvailability.pipe(
      mergeMap((datesResponse: BaseResponse<DatesAvailabilityResponse> | null) => {
        const dates = this.getDatesAvailability(datesResponse?.data?.dates);

        this.nextAvailableDate = datesResponse?.data?.nextAvailableDate ?? '';
        const datesAvailability = dates?.size ? Array.from(dates.values()) : [];
        this.datesAvailability = this.datesAvailability.concat(datesAvailability);

        if (this.datesAvailability.length === 0) {
          this.isLoadingDateSessions = false;
          const emptyResponse = new SessionAvailabilitySummary(
            this.timezone,
            this.allowMultiSessionPurchase,
            this.hasExplodePipe,
            [],
            this.nextAvailableDate,
            this.sessionSelectorType,
          );
          return of(new BaseResponse(emptyResponse, null));
        }
        this.selectedDateAvailability = datesAvailability[0];
        const nextDate = moment(datesAvailability[0].date).toDate();
        const fromDate = new Date(Date.UTC(nextDate.getFullYear(), nextDate.getMonth(), nextDate.getDate()));
        this.fromDate = fromDate;
        query.fromDate = fromDate;
        query.includeOngoing = this.getIncludeOngoingForSessionsForDate();

        if (needsUpdateAvailabilityFromDate) {
          this.selectedAvailabilityFromDate = datesResponse?.data?.dates?.entries()?.next()?.value?.[0] ?? null;
        }

        return this.sessionAvailabilityService
          .getSessionAvailableForDate(
            { ...query, utc: undefined },
            this.overrideMaximumTickets as number | undefined,
            this.minutesBeforeToExpire as number | undefined,
            useCacheEnabled,
          )
          .pipe(tap(() => (this.isLoadingDateSessions = false)));
      }),
    ) as Observable<BaseResponse<SessionAvailabilitySummary>>;
  }

  private getSelectedSessionSeatingCategory(sessionId: number): string {
    return this.selectedSession!.selectedDatetime!.ticketTypesBySessionId.get(sessionId) ?? '';
  }

  private loadSeatingMap(): Observable<unknown> {
    if (this.currentStep.nextStep === seatingSelectorStep) {
      if (!this.partner) {
        return EMPTY;
      }
      const seatingMapQuery = {
        channel: this.channelId || this.channel,
        partnerId: this.partner.id,
        ...this.nonConfirmedCart!.getSeatingInfo(),
      };
      return this.seatingSelectorService.getSeatingMap(seatingMapQuery).pipe(
        mergeMap((response: BaseResponse<SeatingMap>) => {
          if (!response.data) {
            return throwError(() => response.error);
          }
          this.seatingMapUrl = response.data.baseUrl;
          this.seatingMapState = response.data.getState();
          this.seatingToken = response.data.holdToken;
          if (response.data.holdToken) {
            this.#storeHoldTokenForSessions(response.data.holdToken);
          }
          this.updateSeatingProvider();
          this.updateSeats(this.nonConfirmedCart!, response.data.assignedSeats);
          return of(response);
        }),
      );
    }
    return of({});
  }

  private mapApiResponse<T>(response: BaseResponse<T>): T {
    if (response.data) {
      return response.data;
    }
    throw response.error ?? new Error('Unknown error');
  }

  private noSelectedTickets(): boolean {
    return this.selectedTicketsBySessionId.size === 0 || this.selectedTicketsBySessionType.size === 0;
  }

  private prepareCartForUpdateWithNewSessionItems(newCart: Cart): Observable<BaseResponse<Cart>> {
    newCart.hasSeating = this.#hasSeatingInNonConfirmedCart();
    newCart.id = this.cart!.id;
    return this.updateCart(newCart);
  }

  private removeSelectedTicket(sessionId: string, category: string, seatInfo: SeatInfo): void {
    if (this.selectedTicketsBySessionId.size === 0) {
      return;
    }
    const count = this.selectedTicketsBySessionId.get(sessionId)! - 1;
    if (count == 0) {
      const nextById = new Map(this.selectedTicketsBySessionId);
      nextById.delete(sessionId);
      this.selectedTicketsBySessionId = nextById;

      const nextByType = new Map(this.selectedTicketsBySessionType);
      nextByType.delete(category);
      this.selectedTicketsBySessionType = nextByType;

      this.selectedTicketsSeatsBySessionId.delete(sessionId);
      if (this.selectedTicketsBySessionType.size === 0) {
        this.clearSelectedTicketsReferences();
      }
    } else {
      this.selectedTicketsBySessionId = new Map(this.selectedTicketsBySessionId).set(sessionId, count);
      this.selectedTicketsBySessionType = new Map(this.selectedTicketsBySessionType).set(category, count);
      const sessionSeats = this.selectedTicketsSeatsBySessionId.get(sessionId)!;
      const index = sessionSeats.findIndex(seat => seat.seatReference === seatInfo.seatReference);
      if (index !== -1) {
        sessionSeats.splice(index, 1);
      }
    }
  }

  protected resetSelectedTickets(): void {
    this.selectDefaultSessionForAdvancedFlow();
    this.updateTicketTypeFields();
  }

  private scrollToBoxOfficeContent(): void {
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

  private selectFirstAvailableSessionForSelectedTickets(sessions: SessionAvailabilitySummaryByDate[]): void {
    const selectedKey = this.selectedDateAvailability?.date;
    const orderedSessions =
      selectedKey && sessions.length > 1
        ? [...sessions.filter(s => s.date === selectedKey), ...sessions.filter(s => s.date !== selectedKey)]
        : sessions;
    const ongoingNames = new Set(this.getOngoingMultiDaySelectedTicketTypeNames());
    for (const sessionDate of orderedSessions) {
      if (sessionDate.isAvailable(this.selectedTicketsBySessionType, undefined, undefined, undefined, ongoingNames)) {
        this.selectedSession = sessionDate;
        break;
      }
    }
  }

  private sendClickClearAllCartEvent(): void {
    this.trackingService.track(new ClickClearAllCartEvent(this.getCartMixpanelData()));
  }

  private updateCart(cart: Cart): Observable<BaseResponse<Cart>> {
    if (!this.partner) {
      return EMPTY;
    }
    const partnerId = this.partner.id;
    const updateCartQuery: UpdateCartQuery = {
      cartId: cart.id!,
      partnerId,
      seatingHoldTokensBySessionId: this.shouldUseSeatingHoldTokensBySession ? this.seatingHoldTokensBySessionId : undefined,
      seatingMapState: this.seatingMapState ?? undefined,
      sessionItemLines: cart.sessionItemLines,
      sessionItemsByDatetime: cart.sessionItemsByDatetime,
      ...this.getCartLinesQueryOptions(),
    };

    if (this.seatingMapState && !this.seatingMapState.hold_token && this.seatingToken) {
      updateCartQuery.seatingMapState = {
        ...this.seatingMapState,
        hold_token: this.seatingToken,
      };
    }
    const discardCartQuery: DiscardCartQuery = {
      cartId: cart.id!,
      partnerId,
    };

    return (this.cartService!.updateCart(updateCartQuery) as Observable<BaseResponse<Cart>>).pipe(
      switchMap(response => {
        if (response.error?.code === this.INVALID_CART_STATUS_ERROR_CODE) {
          return this.cartService!.discardCart(discardCartQuery).pipe(
            switchMap(() => this.createCart(cart)),
            switchMap(response => this.checkResponseData(response)),
            tap(response => {
              this.cart = response.data;
              this.cartDetailService?.setCart(this.cart!);
              this.cart!.hasSeating = this.#hasSeatingInNonConfirmedCart();
            }),
            switchMap(response => this.prepareCartForUpdateWithNewSessionItems(response.data!)),
          );
        }
        if (this.channel === Channel.BoxOffice && (this.optimizelyService?.isFeatureEnabled('fix_update_cart_box_office') ?? false)) {
          return this.cartService!.getCart(partnerId, cart.id!) as Observable<BaseResponse<Cart>>;
        }
        return of(response);
      }),
    );
  }

  private updateSeatingProvider() {
    if (this.seatingMapUrl?.endsWith('onebox/')) {
      this.seatingProvider = SeatingProviderEnum.ONEBOX;
    } else {
      this.seatingProvider = SeatingProviderEnum.SEATSIO;
    }
    this.#setSeatingProviderOnState();
  }

  #setSeatingProviderOnState(): void {
    if (!this.seatingMapState) {
      return;
    }
    this.seatingMapState.seating_provider = this.seatingProvider;
  }

  private clearSeatsFromSessionsOtherThan(cartSessions: CartSession[], seatedSession?: CartSession): void {
    cartSessions.forEach(cartSession => {
      if (cartSession !== seatedSession) {
        cartSession.seats = undefined;
        cartSession.seatLabels = undefined;
        cartSession.seatDisplayLabels = undefined;
      }
    });
  }

  private findSessionOwningSeats(cartSessions: CartSession[], category?: string): CartSession | undefined {
    const seatedSessions = cartSessions.filter(cartSession => this.isSeatedSession(cartSession));
    if (seatedSessions.length === 0) {
      return this.hasKnownSeatingAvailability(cartSessions) ? undefined : cartSessions[0];
    }
    const sessionOwningCategory =
      category != null
        ? seatedSessions.find(cartSession => this.getSeatingCategoryForSession(cartSession.sessionId) === category)
        : undefined;
    return sessionOwningCategory ?? (seatedSessions.length === 1 ? seatedSessions[0] : undefined);
  }

  private getSeatingCategoryForSession(sessionId: number): string | undefined {
    return (
      this.selectedSession?.selectedDatetime?.sessionAvailabilityList.find(session => session.id === sessionId)?.seating?.category ??
      undefined
    );
  }

  private hasKnownSeatingAvailability(cartSessions: CartSession[]): boolean {
    const sessionAvailabilityList = this.selectedSession?.selectedDatetime?.sessionAvailabilityList ?? [];
    return cartSessions.some(cartSession => sessionAvailabilityList.some(session => session.id === cartSession.sessionId));
  }

  private isSeatedSession(cartSession: CartSession): boolean {
    return cartSession.hasSeating === true || this.getSeatingCategoryForSession(cartSession.sessionId) !== undefined;
  }

  private updateSeats(cart: Cart, seats: Array<string>, fromMap = false, category?: string): void {
    if (!cart || !seats) {
      return;
    }
    this.hasSeatsSelected = false;
    cart.sessionItemsByDatetime.forEach((cartSessions: CartSession[]) => {
      const seatedSession = this.findSessionOwningSeats(cartSessions, category);
      this.clearSeatsFromSessionsOtherThan(cartSessions, seatedSession);
      if (!seatedSession) {
        return;
      }
      seatedSession.seats = seats;
      this.hasSeatsSelected = fromMap && seatedSession.units == seats.length;
    });
  }

  private updateSessionAvailabilitySummary(): void {
    this.sessionAvailabilitySummary = new SessionAvailabilitySummary(
      this.timezone,
      this.allowMultiSessionPurchase,
      this.hasExplodePipe,
      this.selectedSession && this.selectedSession instanceof RegularSessionAvailabilitySummaryByDate
        ? [this.selectedSession]
        : this.regularSessionAvailabilitySummaryByDateList,
      this.nextAvailableDate,
      this.sessionSelectorType,
      this.productSessions,
    );
  }

  private updateTicketTypes(): void {
    this.updateSessionAvailabilitySummary();
    this.ticketTypes = [];
    if (this.selectedSession && this.selectedSession.selectedDatetime !== null) {
      this.selectedSession.selectedDatetime.sessionAvailabilityList.forEach(session => {
        this.ticketTypes.push(this.#ticketTypeFromSession(session, false));
      });
    } else {
      this.ticketTypes = this.sessionAvailabilitySummary!.getTicketTypes();
    }
    this.ticketTypes = this.filterOutWhenOnlyGlobalAddons(this.ticketTypes);
    this.#rebuildOngoingMultiDayTicketGroups();
    this.productTypes = this.sessionAvailabilitySummary!.getProductTypes();
  }

  protected filterOutWhenOnlyGlobalAddons(ticketTypes: TicketType[]): TicketType[];
  protected filterOutWhenOnlyGlobalAddons(dates: RegularSessionAvailabilitySummaryByDate[]): RegularSessionAvailabilitySummaryByDate[];
  protected filterOutWhenOnlyGlobalAddons(
    data: TicketType[] | RegularSessionAvailabilitySummaryByDate[],
  ): TicketType[] | RegularSessionAvailabilitySummaryByDate[] {
    if (!(this.optimizelyService?.isFeatureEnabled(ADDONS_INDEPENDENT_FROM_EXPLODE_PIPE_FEATURE) ?? false)) {
      return data;
    }

    if (data.length === 0) {
      return data;
    }

    if (data[0] instanceof RegularSessionAvailabilitySummaryByDate) {
      return filterOutGlobalAddonOnlySessions(data as RegularSessionAvailabilitySummaryByDate[]);
    }

    return filterOutGlobalAddonOnlySessions(data as TicketType[]);
  }
}
