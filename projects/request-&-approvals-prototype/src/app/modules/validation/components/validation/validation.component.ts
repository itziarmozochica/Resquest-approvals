import { Location } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, DestroyRef, inject, OnDestroy, OnInit, signal, untracked } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Params, Router } from '@angular/router';

import { DatadogLogService } from '@fz-original/app/core/error/datadog/logger/datadog-log.service';
import { withCartDepositFromSource } from '@fz-original/app/shared/cart/utils/deposit-cart-breakdown.util';
import { OrderAction } from '@fz-original/app/shared/enums/order-action.enum';
import { TOGGLE_FOOTER_EVENT_KEY } from '@fz-original/app/shared/layout/footer/toggle-footer-event-key';
import { BaseResponse } from '@fz-original/app/shared/models/base-response';
import { Cart } from '@fz-original/app/shared/models/cart/cart.model';
import { DepositStatusEnum } from '@fz-original/app/shared/models/deposit/deposit-status.enum';
import { OrderActionEvent } from '@fz-original/app/shared/models/order/order-action.model';
import { ValidationOrderSummariesPage, ValidationOrderSummary } from '@fz-original/app/shared/models/order/order-summary.model';
import { CartService } from '@fz-original/app/shared/services/cart/cart.service';
import { DualScreenStorageService } from '@fz-original/app/shared/services/dual-screen/dual-screen-storage.service';
import { GetOrderIncludes } from '@fz-original/app/shared/services/purchase/get-order-includes';
import { UserService } from '@fz-original/app/shared/services/user/user.service';
import { isModifiedClick } from '@fz-original/app/shared/utils/modified-click.util';
import { FzTrackingService } from '@fz/fz-tracking/src/public-api';
import { AlertSentiment } from '@ignite/legacy/components/ignt-alert/ignt-alert.component';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { TranslateService } from '@ngx-translate/core';
import { EMPTY, forkJoin, Observable, of, Subject } from 'rxjs';
import { catchError, finalize, map, switchMap, takeUntil, tap } from 'rxjs/operators';

import { ConfirmValidateTicketsData, ConfirmValidateTicketsEvent } from '../../../../core/tracking/core/events/confirm-validate-tickets';
import { CreateOrderNoteEvent } from '../../../../core/tracking/core/events/create-order-note';
import { DeleteOrderNoteEvent } from '../../../../core/tracking/core/events/delete-order-note';
import { EditOrderNoteEvent } from '../../../../core/tracking/core/events/edit-order-note';
import { OpenValidateTicketsEvent } from '../../../../core/tracking/core/events/open-validate-tickets';
import { OrderNoteData } from '../../../../core/tracking/core/events/order-note.model';
import { PrintValidateData, PrintValidateEvent } from '../../../../core/tracking/core/events/print-validate';
import {
  ResendOrderConfirmationEmailData,
  ResendOrderConfirmationEmailEvent,
} from '../../../../core/tracking/core/events/resend-order-confirmation-email';
import {
  ResendPurchaseConfirmationEmailData,
  ResendPurchaseConfirmationEmailEvent,
} from '../../../../core/tracking/core/events/resend-purchase-confirmation-email';
import { SearchValidateData, SearchValidateEvent } from '../../../../core/tracking/core/events/search-validate';
import { SendWalletPassesEvent, SendWalletPassesTrackingData } from '../../../../core/tracking/core/events/send-wallet-passes';
import { TrackingService } from '../../../../core/tracking/tracking.service';
import { MessageModalComponent } from '../../../../shared/components/message-modal/message-modal.component';
import { ModalVideoComponent } from '../../../../shared/layout/modal/modal-video/modal-video.component';
import { CartSession } from '../../../../shared/models/cart/cart-session.model';
import { Journey } from '../../../../shared/models/journey/journey.model';
import { isSecondaryGroupMember } from '../../../../shared/models/order/order-group-kind.util';
import { Order } from '../../../../shared/models/order/order.model';
import { FeatureFlags } from '../../../../shared/optimizely/feature-flags';
import { OptimizelyService } from '../../../../shared/optimizely/optimizely.service';
import { NavigationService } from '../../../../shared/services/navigation/navigation.service';
import { PartnerService } from '../../../../shared/services/partner/partner.service';
import { PurchaseService } from '../../../../shared/services/purchase/purchase.service';
import { SearchOrderQuery } from '../../../../shared/services/purchase/search-order-query';
import { ToastService } from '../../../../shared/services/toast/toast.service';
import { ReservationStatus } from '../../../reservation/models/reservation-status.enum';
import { ReservationsService } from '../../../reservation/services/reservations.service';
import { resolveDepositRefundErrorSuffix } from '../../../reservation/utils/deposit-refund-error.util';
import { ValidationTypeEnum } from '../../enums/validation-type.enum';
import { ValidationMixpanelData } from '../../models/validation-mix-panel.model';
import { readValidationNavigationState } from '../../models/validation-navigation-state.model';
import { ValidationSearchOptionRequest } from '../../models/validation-search.model';
import { ValidationSummaryFilters } from '../../models/validation-summary-filters.model';
import { ValidationSearchHandoffService } from '../../services/search-handoff/validation-search-handoff.service';
import { resendWhatsappPurchaseConfirmation } from '../../tracking/events/resend-whatsapp-purchase-confirmation.event';
import { resolveGroupedOrdersFromMembers } from '../../utils/resolve-grouped-orders-from-members.util';
import { isValidationUrl, resolveValidationBackOrigin } from '../../utils/resolve-validation-back-origin.util';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '[class.validation--dual-screen]': 'isDualScreen',
  },
  selector: 'app-validation',
  standalone: false,
  styleUrl: './validation.component.scss',
  templateUrl: './validation.component.html',
})
export class ValidationComponent implements OnInit, OnDestroy {
  static readonly summaryPageSize = 10;

  readonly #uniqueResultValidationTypes = new Set<ValidationTypeEnum>([
    ValidationTypeEnum.CODE,
    ValidationTypeEnum.ORDER,
    ValidationTypeEnum.RESERVATION,
    ValidationTypeEnum.TICKET,
  ]);

  readonly #cancelCurrentDetail = new Subject<void>();
  readonly #cancelCurrentSearch = new Subject<void>();
  readonly #cancelGroupedOrders = new Subject<void>();
  readonly #route = inject(ActivatedRoute);
  readonly #router = inject(Router);
  readonly #cartService = inject(CartService);
  readonly #datadogService = inject(DatadogLogService);
  readonly #destroyRef = inject(DestroyRef);
  readonly #location = inject(Location);
  readonly #navigationService = inject(NavigationService);
  protected readonly isDualScreen = inject(DualScreenStorageService).containsData();
  #lastSearchQuery: SearchOrderQuery | null = null;
  readonly #modalService: NgbModal = inject(NgbModal);
  readonly #toastService = inject(ToastService);
  readonly #optimizelyService = inject(OptimizelyService);
  readonly #partnerService: PartnerService = inject(PartnerService);
  readonly #purchaseService: PurchaseService = inject(PurchaseService);
  readonly #reservationsService = inject(ReservationsService);
  readonly #searchHandoff = inject(ValidationSearchHandoffService);
  readonly #fzTracking = inject(FzTrackingService);
  readonly #trackingService: TrackingService = inject(TrackingService);
  readonly #translate: TranslateService = inject(TranslateService);

  readonly #userService = inject(UserService);
  cartSessions = signal(new Map<number | undefined, CartSession[]>());
  depositCarts = signal(new Map<number, Cart>());
  depositRefundFns = signal(new Map<number, () => Observable<boolean>>());
  groupedOrders = signal<Order[]>([]);
  groupedOrdersLoading = signal(false);

  constructor() {
    if (this.isDualScreen) {
      this.#toggleFooter(false);
    }
  }
  error: string | null = null;
  protected readonly loadingDetail = signal(false);
  loadingSearch = signal(false);
  readonly #orderSummaries = signal<ValidationOrderSummary[]>([]);
  protected readonly summaryCurrentPage = signal(1);
  protected readonly summaryFilters = signal<ValidationSummaryFilters>({
    buyerName: null,
    eventDateRange: null,
    purchaseDateRange: null,
  });
  readonly #summaryNextCursor = signal<string | null>(null);
  protected readonly summaryTotalCount = signal(0);
  protected readonly summaryListSessionActive = signal(false);
  readonly #autoSelectBlocked = signal(false);
  orders = signal<Order[]>([]);
  partnerId: number | null = this.#partnerService.getPartner()?.id ?? null;
  requestSearchSubject = new Subject<SearchOrderQuery | null>();
  searchCount = 0;
  searchedQRCode = signal<string | undefined>(undefined);
  searchedTicketId = signal<number | undefined>(undefined);
  protected readonly selectedOrder = signal<Order | null>(null);
  sendMixpanelEvent = true;
  showTicketDetails = false;
  readonly #backOrigin = signal<string | undefined>(undefined);
  showGoBack = signal(false);

  protected readonly isSummarySearchEnabled = computed(
    () => !!(this.#optimizelyService.isFeatureEnabled(FeatureFlags.VALIDATION_SUMMARY_SEARCH) ?? false),
  );
  protected readonly isOrderDetailRedesignEnabled = computed(
    () => !!(this.#optimizelyService.isFeatureEnabled(FeatureFlags.ORDER_DETAIL_REDESIGN) ?? false),
  );

  protected readonly filteredOrderSummaries = computed(() => this.#orderSummaries());
  protected readonly summaryPageSize = ValidationComponent.summaryPageSize;
  readonly #summaryCursorHistory = signal<Array<string | null>>([null]);
  #summaryPaginationRollback: { cursorHistory: Array<string | null>; currentPage: number } | null = null;
  #summaryPageOnlySearch = false;
  #summaryRefreshKeepSelection = false;
  #summarySearchCursor: string | undefined = undefined;
  readonly #summarySearchTrigger = signal<'primary' | 'lateral'>('primary');
  readonly #activePrimaryValidationType = signal<ValidationTypeEnum | null>(null);
  #lastRedirectTargetId: number | null = null;

  protected readonly showHistoryBackButton = computed(
    () => this.showGoBack() && !(this.isSummarySearchEnabled() && this.selectedOrder() !== null && this.summaryTotalCount() > 1),
  );

  protected readonly backUrl = computed(() => (this.showHistoryBackButton() ? (this.#backOrigin() ?? '') : ''));
  protected readonly backHref = computed(() => {
    const backUrl = this.backUrl();
    return backUrl.length > 0 ? this.#location.prepareExternalUrl(backUrl) : '';
  });

  protected readonly showBackToSummaryListButton = computed(
    () => this.isSummarySearchEnabled() && this.selectedOrder() !== null && this.summaryTotalCount() > 1,
  );

  protected readonly showGlobalSearchSpinner = computed(
    () => this.loadingSearch() && !(this.isSummarySearchEnabled() && this.summaryListSessionActive()),
  );

  protected readonly showValidationBody = computed(
    () => !this.loadingSearch() || (this.isSummarySearchEnabled() && this.summaryListSessionActive()),
  );

  depositReservationStatus(order: Order): ReservationStatus | undefined {
    switch (order.status) {
      case ReservationStatus.CANCELLED:
        return ReservationStatus.CANCELLED;
      case ReservationStatus.EXPIRED:
        return ReservationStatus.EXPIRED;
      default:
        return undefined;
    }
  }

  readonly #isPrimaryUniqueResultSearch = computed(
    () =>
      this.isSummarySearchEnabled() &&
      !this.#autoSelectBlocked() &&
      this.#summarySearchTrigger() === 'primary' &&
      this.#activePrimaryValidationType() != null &&
      this.#uniqueResultValidationTypes.has(this.#activePrimaryValidationType()!),
  );

  protected readonly pendingSingleResultAutoSelect = computed(
    () =>
      this.#isPrimaryUniqueResultSearch() &&
      !this.loadingSearch() &&
      this.selectedOrder() === null &&
      this.summaryListSessionActive() &&
      this.summaryTotalCount() === 1 &&
      this.filteredOrderSummaries().length === 1,
  );

  protected readonly showSummaryDetailShell = computed(
    () =>
      this.isSummarySearchEnabled() &&
      (this.selectedOrder() !== null ||
        this.loadingDetail() ||
        this.pendingSingleResultAutoSelect() ||
        (this.#isPrimaryUniqueResultSearch() && this.loadingSearch() && this.summaryListSessionActive())),
  );

  protected readonly validationBodySlot = computed<'legacy' | 'summary-detail' | 'summary-list'>(() => {
    if (!this.isSummarySearchEnabled()) {
      return 'legacy';
    }
    return this.showSummaryDetailShell() ? 'summary-detail' : 'summary-list';
  });

  protected readonly legacyReservationStatusLookup = (order: Order): ReservationStatus | undefined => this.depositReservationStatus(order);

  get isBusiness(): boolean {
    return !!this.#userService.isBusiness();
  }

  /** Lets modified clicks reach the browser (new tab, new window); a plain click navigates in the app. */
  protected onBackClick(event: MouseEvent): void {
    if (isModifiedClick(event)) {
      return;
    }
    event.preventDefault();
    const backUrl = this.backUrl();
    const staysOnValidation = isValidationUrl(backUrl);
    if (staysOnValidation) {
      this.optionSelected();
    }
    void this.#router.navigateByUrl(backUrl).then(navigated => {
      if (navigated && staysOnValidation) {
        this.#resolveBackOrigin();
      }
    });
  }

  protected backToList(): void {
    this.#cancelCurrentDetail.next();
    this.#cancelGroupedOrders.next();
    this.#lastRedirectTargetId = null;
    this.selectedOrder.set(null);
    this.groupedOrders.set([]);
    this.groupedOrdersLoading.set(false);
    this.#autoSelectBlocked.set(true);
  }

  protected onSummaryFiltersChange(filters: ValidationSummaryFilters): void {
    this.#summarySearchTrigger.set('lateral');
    this.#autoSelectBlocked.set(false);
    this.#summaryPaginationRollback = null;
    this.summaryFilters.set(filters);
    this.#summaryCursorHistory.set([null]);
    this.summaryCurrentPage.set(1);
    this.#summaryNextCursor.set(null);
    this.#summarySearchCursor = undefined;
    this.requestSearchSubject.next(this.#lastSearchQuery);
  }

  protected onSummaryNextPage(): void {
    const nextCursor = this.#summaryNextCursor();
    if (!nextCursor) {
      return;
    }

    this.#summaryPaginationRollback = {
      currentPage: this.summaryCurrentPage(),
      cursorHistory: [...this.#summaryCursorHistory()],
    };
    this.#summaryPageOnlySearch = true;
    const nextPage = this.summaryCurrentPage() + 1;
    this.#summaryCursorHistory.update(history => {
      const nextHistory = [...history];
      nextHistory[nextPage - 1] = nextCursor;
      return nextHistory;
    });
    this.summaryCurrentPage.set(nextPage);
    this.#summarySearchCursor = nextCursor;
    this.requestSearchSubject.next(this.#lastSearchQuery);
  }

  protected onSummaryPreviousPage(): void {
    const currentPage = this.summaryCurrentPage();
    if (currentPage <= 1) {
      return;
    }

    this.#summaryPaginationRollback = {
      currentPage,
      cursorHistory: [...this.#summaryCursorHistory()],
    };
    this.#summaryPageOnlySearch = true;
    const previousPage = currentPage - 1;
    const previousCursor = this.#summaryCursorHistory()[previousPage - 1] ?? null;
    this.summaryCurrentPage.set(previousPage);
    this.#summarySearchCursor = previousCursor ?? undefined;
    this.requestSearchSubject.next(this.#lastSearchQuery);
  }

  mapResult<T>(result: BaseResponse<T>): T {
    if (!result.data) {
      if (result.error) {
        this.#datadogService.logError(
          `Validation screen: There has been an ${result.error?.code ? 'controlled' : 'uncontrolled'} error loading the order data`,
        );
      }
      throw result.error;
    }
    return result.data;
  }

  ngOnDestroy(): void {
    if (this.isDualScreen) {
      this.#toggleFooter(true);
    }
  }

  ngOnInit(): void {
    this.#resolveBackOrigin();
    this.#trackingService.track(new OpenValidateTicketsEvent());
    this.requestSearchSubject
      .pipe(
        tap(query => (this.#lastSearchQuery = query)),
        switchMap(query => this.#searchOrderRequest(query)),
        switchMap(response => {
          const searchIndexForThisResult = this.searchCount;
          const orders = response ?? [];
          const firstOrder = orders[0] ?? null;
          const orderForRedirect = orders.length === 1 ? firstOrder : null;
          return this.#resolveShouldRedirectToMainOrder(orderForRedirect).pipe(
            map(shouldRedirect => ({ firstOrder, orders, response, searchIndexForThisResult, shouldRedirect })),
            takeUntil(this.#cancelCurrentSearch),
            finalize(() => {
              if (!this.isSummarySearchEnabled() && searchIndexForThisResult === this.searchCount) {
                this.loadingSearch.set(false);
              }
            }),
          );
        }),
        takeUntilDestroyed(this.#destroyRef),
      )
      .subscribe(({ firstOrder, orders, response, searchIndexForThisResult, shouldRedirect }) => {
        if (searchIndexForThisResult !== this.searchCount) {
          return;
        }
        this.searchedTicketId.set(this.#lastSearchQuery?.ticketId);
        this.searchedQRCode.set(this.#lastSearchQuery?.code);
        if (shouldRedirect && firstOrder?.mainOrderId != null && firstOrder.mainOrderId !== this.#lastRedirectTargetId) {
          this.#navigateToMainOrder(firstOrder.mainOrderId);
          return;
        }
        this.orders.set(orders);
        const isSummarySearchWithoutOrders = this.isSummarySearchEnabled() && response === null;
        if (!isSummarySearchWithoutOrders) {
          this.cartSessions.set(this.#createPerSessionCartSessionsMap(orders));
          this.#hydrateDepositCarts(orders);
        }
        if (!this.isSummarySearchEnabled()) {
          const detailLoadedOrderId = orders.length === 1 ? this.#loadGroupedOrders(firstOrder) : null;
          this.#hydrateJourneys(orders.filter(order => order.id !== detailLoadedOrderId));
        }
        this.orderAction({ action: OrderAction.SEARCH });
        this.#showStaffNoteToastFromMoveSeatsIfNeeded();
      });
  }

  #applyHydratedOrderDeposits(depositSourcesByOrderId: Map<number, Cart>): void {
    if (depositSourcesByOrderId.size === 0) {
      return;
    }

    const withHydratedDeposit = (order: Order): Order => {
      if (order.id == null || !order.cart) {
        return order;
      }
      const depositSource = depositSourcesByOrderId.get(order.id);
      if (!depositSource) {
        return order;
      }
      const cart = withCartDepositFromSource(order.cart, depositSource);
      return cart === order.cart ? order : Object.assign(new Order(), order, { cart });
    };

    const updateOrderList = (orders: Order[]): Order[] => {
      let changed = false;
      const next = orders.map(order => {
        const updated = withHydratedDeposit(order);
        if (updated !== order) {
          changed = true;
        }
        return updated;
      });
      return changed ? next : orders;
    };

    const currentOrders = this.orders();
    const nextOrders = updateOrderList(currentOrders);
    if (nextOrders !== currentOrders) {
      this.orders.set(nextOrders);
    }

    const currentGrouped = this.groupedOrders();
    const nextGrouped = updateOrderList(currentGrouped);
    if (nextGrouped !== currentGrouped) {
      this.groupedOrders.set(nextGrouped);
    }

    const selected = this.selectedOrder();
    if (selected) {
      const nextSelected = withHydratedDeposit(selected);
      if (nextSelected !== selected) {
        this.selectedOrder.set(nextSelected);
      }
    }
  }

  #hydrateDepositCarts(orders: Order[]): void {
    this.depositCarts.set(new Map());
    this.depositRefundFns.set(new Map());
    const partnerId = this.partnerId;
    if (!partnerId || orders.length === 0) {
      return;
    }
    const fetches: Observable<{ cart: Cart | null; order: Order }>[] = [];
    for (const order of orders) {
      const cartId = order.cart?.id;
      if (order.id == null || !cartId || order.hasDeposit === false) {
        continue;
      }
      fetches.push(
        this.#cartService.getCart(partnerId, cartId).pipe(
          map(response => ({ cart: response.data, order })),
          catchError(() => of({ cart: null as Cart | null, order })),
        ),
      );
    }
    if (fetches.length === 0) {
      return;
    }
    forkJoin(fetches)
      .pipe(takeUntilDestroyed(this.#destroyRef))
      .subscribe(results => {
        const cartsNext = new Map<number, Cart>();
        const refundsNext = new Map<number, () => Observable<boolean>>();
        const depositSourcesByOrderId = new Map<number, Cart>();

        for (const { cart, order } of results) {
          if (!cart || order.id == null) {
            continue;
          }
          cartsNext.set(order.id, cart);
          depositSourcesByOrderId.set(order.id, cart);
          const refundFn = this.#buildRefundDeposit(order);
          if (refundFn) {
            refundsNext.set(order.id, refundFn);
          }
        }
        untracked(() => {
          this.depositCarts.set(cartsNext);
          this.depositRefundFns.set(refundsNext);
          this.#applyHydratedOrderDeposits(depositSourcesByOrderId);
        });
      });
  }

  #applyHydratedOrderJourneys(journeysByOrderId: Map<number, Journey>): void {
    if (journeysByOrderId.size === 0) {
      return;
    }
    const currentOrders = this.orders();
    let changed = false;
    const nextOrders = currentOrders.map(order => {
      const journey = order.id == null ? undefined : journeysByOrderId.get(order.id);
      if (journey === undefined) {
        return order;
      }
      changed = true;
      return Object.assign(new Order(), order, { journey });
    });
    if (changed) {
      this.orders.set(nextOrders);
    }
  }

  #hydrateJourneys(orders: Order[]): void {
    const partnerId = this.partnerId;
    if (partnerId === null) {
      return;
    }
    const fetches: Observable<{ journey: Journey | undefined; orderId: number }>[] = [];
    for (const order of orders) {
      const orderId = order.id;
      if (orderId == null || order.hasAssetBasedBooking !== true || order.journey !== undefined) {
        continue;
      }
      fetches.push(
        this.#purchaseService.getOrder(partnerId, orderId, this.#getDetailIncludes()).pipe(
          map(response => ({ journey: response.data?.journey, orderId })),
          catchError(() => of({ journey: undefined, orderId })),
        ),
      );
    }
    if (fetches.length === 0) {
      return;
    }
    forkJoin(fetches)
      .pipe(takeUntil(this.#cancelCurrentSearch), takeUntilDestroyed(this.#destroyRef))
      .subscribe(results => {
        const journeysByOrderId = new Map<number, Journey>();
        for (const { journey, orderId } of results) {
          if (journey !== undefined) {
            journeysByOrderId.set(orderId, journey);
          }
        }
        untracked(() => this.#applyHydratedOrderJourneys(journeysByOrderId));
      });
  }

  #buildRefundDeposit(order: Order): (() => Observable<boolean>) | null {
    const partnerId = this.partnerId;
    const reservationId = order.reservationId;
    if (!partnerId || !reservationId) {
      return null;
    }
    return () =>
      this.#reservationsService.refundDeposit(partnerId, reservationId).pipe(
        map((response: BaseResponse<null>) => {
          const isError = !!response.error;
          this.#showDepositRefundToast(
            isError ? AlertSentiment.danger : AlertSentiment.positive,
            isError ? response.error?.code : undefined,
          );
          if (!isError) {
            this.#markOrderDepositRefunded(order);
          }
          return !isError;
        }),
        catchError(() => {
          this.#showDepositRefundToast(AlertSentiment.danger);
          return of(false);
        }),
      );
  }

  #markOrderDepositRefunded(order: Order): void {
    if (order.id == null) {
      return;
    }
    const cart = this.depositCarts().get(order.id);
    if (!cart?.deposit) {
      return;
    }
    const updatedCart = cart.clone();
    updatedCart.deposit = {
      ...cart.deposit,
      refundedAt: new Date().toISOString(),
      status: DepositStatusEnum.REFUNDED,
    };
    const next = new Map(this.depositCarts());
    next.set(order.id, updatedCart);
    this.depositCarts.set(next);
    this.#applyHydratedOrderDeposits(new Map([[order.id, updatedCart]]));
  }

  onSearchRequest(request: ValidationSearchOptionRequest, options?: { preserveRedirectTarget?: boolean }): void {
    if (request.fromScan) {
      this.#keepScanOriginAsBackOrigin(request.scanOrigin);
    }
    if (this.partnerId !== null) {
      if (
        request.type === ValidationTypeEnum.CARD_DIGITS &&
        !(this.#optimizelyService.isFeatureEnabled(FeatureFlags.ORDER_SEARCH_BY_CARD_LAST_4_DIGITS) ?? false)
      ) {
        return;
      }
      if (!options?.preserveRedirectTarget) {
        this.#lastRedirectTargetId = null;
      }
      this.#summarySearchTrigger.set('primary');
      this.#activePrimaryValidationType.set(request.type);
      const searchQuery: SearchOrderQuery = {
        ...this.#searchHandoff.searchIncludes(),
        isScanned: request.fromCamera,
        partnerId: this.partnerId,
        validationType: request.type,
        ...this.#getSearchQueryValue(request),
      };
      this.#autoSelectBlocked.set(false);
      if (this.isSummarySearchEnabled()) {
        this.summaryCurrentPage.set(1);
        this.#summaryCursorHistory.set([null]);
        this.summaryFilters.set({
          buyerName: null,
          eventDateRange: null,
          purchaseDateRange: null,
        });
      }
      this.#summarySearchCursor = undefined;
      this.requestSearchSubject.next(searchQuery);
    }
  }

  openHowToValidateTickets(): void {
    const modalRef = this.#modalService.open(ModalVideoComponent);
    modalRef.componentInstance.srcVideo = this.#translate.instant('assets.howValidateTicketsVideo');
  }

  optionSelected(): void {
    this.#cancelCurrentDetail.next();
    this.#cancelCurrentSearch.next();
    this.#cancelGroupedOrders.next();
    this.#lastRedirectTargetId = null;
    this.orders.set([]);
    this.#orderSummaries.set([]);
    this.summaryCurrentPage.set(1);
    this.#summaryNextCursor.set(null);
    this.summaryTotalCount.set(0);
    this.#summaryCursorHistory.set([null]);
    this.selectedOrder.set(null);
    this.groupedOrders.set([]);
    this.groupedOrdersLoading.set(false);
    this.summaryFilters.set({
      buyerName: null,
      eventDateRange: null,
      purchaseDateRange: null,
    });
    this.#autoSelectBlocked.set(false);
    this.summaryListSessionActive.set(false);
    this.#summarySearchTrigger.set('primary');
    this.#activePrimaryValidationType.set(null);
  }

  orderAction(event: OrderActionEvent): void {
    const hasResults = this.orders().length > 0 || this.#orderSummaries().length > 0;
    if (!hasResults || !event?.action) {
      return;
    }
    const input: string | undefined =
      this.#lastSearchQuery?.email ||
      this.#lastSearchQuery?.code ||
      this.#lastSearchQuery?.ticketId?.toString() ||
      this.#lastSearchQuery?.orderId?.toString();
    let mixpanelData: ValidationMixpanelData;
    switch (event.action) {
      case OrderAction.SEARCH:
        this.#trackingService.track(new SearchValidateEvent(this.#getMixpanelData(input ?? '') as SearchValidateData));
        break;
      case OrderAction.VALIDATE_CODE:
        mixpanelData = this.#getMixpanelData(input ?? '', event.data?.orderId, 'code');
        mixpanelData = { ...mixpanelData, codes: event.data?.codes };
        this.#trackingService.track(new ConfirmValidateTicketsEvent(mixpanelData as ConfirmValidateTicketsData));
        this.#refreshAfterAction();
        break;
      case OrderAction.VALIDATE_TICKET:
        mixpanelData = this.#getMixpanelData(input ?? '', event.data?.orderId, 'ticket');
        mixpanelData = { ...mixpanelData, ticketCount: event.data?.ticketCount, ticketId: event.data?.ticketId };
        this.#trackingService.track(new ConfirmValidateTicketsEvent(mixpanelData as ConfirmValidateTicketsData));
        this.#refreshAfterAction();
        break;
      case OrderAction.PRINT_ORDER:
        this.#trackingService.track(
          new PrintValidateEvent(this.#getMixpanelData(input ?? '', event.data?.orderId, 'order') as PrintValidateData),
        );
        break;
      case OrderAction.PRINT_TICKET:
        mixpanelData = this.#getMixpanelData(input ?? '', event.data?.orderId, 'ticket');
        mixpanelData = { ...mixpanelData, ticketId: event.data?.ticketId };
        this.#trackingService.track(new PrintValidateEvent(mixpanelData as PrintValidateData));
        break;
      case OrderAction.RESCHEDULE_ORDER:
        this.#refreshAfterAction();
        break;
      case OrderAction.RESEND_ORDER:
        this.#trackingService.track(
          new ResendOrderConfirmationEmailEvent({
            order_id: event.data?.orderId,
            original_buyer_email: event.data?.originalTicketEmail,
            recipient_email: event.data?.recipientEmail,
          } as ResendOrderConfirmationEmailData),
        );
        break;
      case OrderAction.RESEND_PURCHASE_CONFIRMATION_EMAIL:
        this.#trackingService.track(
          new ResendPurchaseConfirmationEmailEvent({
            original_buyer_email: event.data?.originalTicketEmail,
            recipient_email: event.data?.recipientEmail,
            ticket_id: event.data?.ticketId,
          } as ResendPurchaseConfirmationEmailData),
        );
        break;
      case OrderAction.RESEND_WHATSAPP_PURCHASE_CONFIRMATION:
        this.#fzTracking.track(
          resendWhatsappPurchaseConfirmation({
            ticketId: event.data?.ticketId ?? 0,
          }),
        );
        break;
      case OrderAction.SEND_WALLET_PASSES:
        this.#trackingService.track(
          new SendWalletPassesEvent({
            original_buyer_email: event.data?.originalTicketEmail,
            recipient_email: event.data?.recipientEmail,
            ticket_id: event.data?.ticketId,
          } as SendWalletPassesTrackingData),
        );
        break;
      case OrderAction.ADD_NOTE:
        this.#trackingService.track(
          new CreateOrderNoteEvent({
            description: event.data?.noteDescription,
            order_id: event.data?.orderId,
            title: event.data?.noteTitle,
          } as OrderNoteData),
        );
        break;
      case OrderAction.DELETE_NOTE:
        this.#trackingService.track(
          new DeleteOrderNoteEvent({
            order_id: event.data?.orderId,
          } as OrderNoteData),
        );
        break;
      case OrderAction.UPDATE_NOTE:
        this.#trackingService.track(
          new EditOrderNoteEvent({
            description: event.data?.noteDescription,
            order_id: event.data?.orderId,
            title: event.data?.noteTitle,
          } as OrderNoteData),
        );
        break;
      case OrderAction.ONSITE_SETUP_CHANGED:
        this.#refreshAfterAction();
        break;
      case OrderAction.TICKET_UPDATED:
        this.#refreshAfterAction();
        break;
    }
  }

  protected selectSummary(summary: ValidationOrderSummary): void {
    if (this.partnerId === null) {
      return;
    }
    this.#loadOrderDetail(summary.id);
  }

  #buildSummarySearchQuery({ cursor }: { cursor?: string }): SearchOrderQuery | null {
    if (this.#lastSearchQuery == null) {
      return null;
    }

    const filters = this.summaryFilters();
    const purchaseDateFrom = filters.purchaseDateRange?.startDate?.toISOString();
    const purchaseDateTo = filters.purchaseDateRange?.endDate ? new Date(filters.purchaseDateRange.endDate) : null;
    purchaseDateTo?.setUTCHours(23, 59, 59, 999);
    const sessionDateFrom = filters.eventDateRange?.startDate?.toISOString();
    const sessionDateTo = filters.eventDateRange?.endDate ? new Date(filters.eventDateRange.endDate) : null;
    sessionDateTo?.setUTCHours(23, 59, 59, 999);

    return {
      ...this.#lastSearchQuery,
      cursor,
      fullName: filters.buyerName ?? undefined,
      itemsPerPage: ValidationComponent.summaryPageSize,
      purchaseDateFrom,
      purchaseDateTo: purchaseDateTo?.toISOString(),
      sessionDateFrom,
      sessionDateTo: sessionDateTo?.toISOString(),
    };
  }

  #createPerSessionCartSessionsMap(orders: Array<Order>): Map<number | undefined, Array<CartSession>> {
    const sessionMapEntries: [number | undefined, CartSession[]][] = orders.map(order => [
      order.id,
      this.#getAllSessions(order.cart?.sessionItemsByDatetime),
    ]);
    return new Map(sessionMapEntries);
  }
  #getAllSessions(sessionsMap?: Map<string, CartSession[]>): CartSession[] {
    return Array.from(sessionsMap?.entries() ?? []).reduce((previous, [, sessions]) => [...previous, ...sessions], [] as CartSession[]);
  }

  #getDetailIncludes(): GetOrderIncludes {
    return {
      includeNotes: true,
      includePhone: true,
      includeReschedules: true,
      includeReservationChannel: true,
      includeUserCancellationRecords:
        this.#optimizelyService.isFeatureEnabled({
          optimizelyFeatureKey: FeatureFlags.USER_CANCELLATION_RECORDS,
          team: 'b2b-platform',
        }) ?? false,
    };
  }

  #getMixpanelData(searchInput: string, orderId?: number, type?: string): ValidationMixpanelData {
    let mixpanelData: ValidationMixpanelData = {
      input: searchInput,
      input_type: this.#lastSearchQuery?.isScanned ? 'scanned' : 'manual',
      validation_type: this.#lastSearchQuery?.validationType ?? ('' as ValidationTypeEnum),
    };
    if (orderId) {
      mixpanelData = { ...mixpanelData, order: orderId };
    }
    if (type) {
      mixpanelData = { ...mixpanelData, type };
    }
    return mixpanelData;
  }

  #getSearchQueryValue(request: ValidationSearchOptionRequest): Record<string, string | number> | null {
    switch (request.type) {
      case ValidationTypeEnum.CODE:
        return { code: request.value };
      case ValidationTypeEnum.EMAIL:
        return { email: request.value };
      case ValidationTypeEnum.TICKET:
        return { ticketId: request.value };
      case ValidationTypeEnum.ORDER:
        return { orderId: request.value };
      case ValidationTypeEnum.RESERVATION:
        return { reservationId: request.value };
      case ValidationTypeEnum.PHONE:
        return { phoneNumber: request.value };
      case ValidationTypeEnum.CARD_DIGITS:
        return { paymentCardNumberLast4Digits: request.value };
      case ValidationTypeEnum.EXTERNAL_ORDER:
        return { externalOrderId: request.value };
      default:
        return null;
    }
  }

  #loadGroupedOrders(order: Order | null): number | null {
    this.#cancelGroupedOrders.next();

    const orderId = order?.id;
    if (order === null || orderId === undefined || this.partnerId === null || order.groupMemberCount === 0) {
      this.groupedOrders.set([]);
      this.groupedOrdersLoading.set(false);
      return null;
    }

    this.groupedOrders.set([]);
    this.groupedOrdersLoading.set((order.groupedOrders?.length ?? 0) > 1);

    this.#purchaseService
      .getOrder(this.partnerId, orderId, this.#getDetailIncludes())
      .pipe(
        map(result => result.data ?? null),
        catchError(() => of(null)),
        takeUntil(this.#cancelGroupedOrders),
        takeUntilDestroyed(this.#destroyRef),
        finalize(() => untracked(() => this.groupedOrdersLoading.set(false))),
      )
      .subscribe(orderDetail => {
        untracked(() => {
          this.groupedOrders.set(resolveGroupedOrdersFromMembers(orderDetail ?? order));
          if (orderDetail?.journey !== undefined) {
            this.#applyHydratedOrderJourneys(new Map([[orderId, orderDetail.journey]]));
          }
        });
      });

    return orderId;
  }

  #handleSearchError(error: unknown): Observable<never> {
    const message = (error as Error)?.message ?? 'errors.generic';
    const modal = this.#modalService.open(MessageModalComponent);
    modal.componentInstance.title = this.#translate.instant('common.errorTitle');
    modal.componentInstance.messages = [this.#translate.instant(message)];
    return EMPTY;
  }

  #loadOrderDetail(orderId: number): void {
    if (this.partnerId === null) {
      return;
    }
    this.#cancelCurrentDetail.next();
    if (untracked(() => this.selectedOrder()?.id) !== orderId) {
      this.selectedOrder.set(null);
    }
    this.loadingDetail.set(true);
    this.#purchaseService
      .getOrder(this.partnerId, orderId, this.#getDetailIncludes())
      .pipe(
        map(result => this.mapResult(result)),
        switchMap(order => this.#resolveShouldRedirectToMainOrder(order).pipe(map(shouldRedirect => ({ order, shouldRedirect })))),
        takeUntil(this.#cancelCurrentDetail),
        catchError(error => {
          this.#autoSelectBlocked.set(true);
          this.selectedOrder.set(null);
          this.cartSessions.set(new Map<number | undefined, CartSession[]>());
          return this.#handleSearchError(error);
        }),
        finalize(() => this.loadingDetail.set(false)),
        takeUntilDestroyed(this.#destroyRef),
      )
      .subscribe(({ order, shouldRedirect }) => {
        if (shouldRedirect && order?.mainOrderId != null && order.mainOrderId !== this.#lastRedirectTargetId) {
          this.#navigateToMainOrder(order.mainOrderId);
          return;
        }
        this.selectedOrder.set(order);
        this.cartSessions.set(this.#createPerSessionCartSessionsMap(order != null ? [order] : []));
        this.#hydrateDepositCarts(order != null ? [order] : []);
        this.#setGroupedOrdersFromDetail(order);
      });
  }

  #setGroupedOrdersFromDetail(order: Order | null): void {
    this.#cancelGroupedOrders.next();
    this.groupedOrders.set(order === null ? [] : resolveGroupedOrdersFromMembers(order));
    this.groupedOrdersLoading.set(false);
  }

  #resolveBackOrigin(): void {
    const origin = resolveValidationBackOrigin(this.#navigationService.history, this.#navigationService.getCurrentUrl(), {
      fromScan: readValidationNavigationState().fromScan === true,
    });
    this.#backOrigin.set(origin);
    this.showGoBack.set(origin !== undefined);
  }

  #resolveShouldRedirectToMainOrder(order: Order | null): Observable<boolean> {
    return of(order !== null && isSecondaryGroupMember(order));
  }

  #keepScanOriginAsBackOrigin(scanOrigin: string | undefined): void {
    if (scanOrigin === undefined || this.#backOrigin() !== undefined) {
      return;
    }
    this.#backOrigin.set(scanOrigin);
    this.showGoBack.set(true);
  }

  #navigateToMainOrder(mainOrderId: number): void {
    this.#cancelCurrentSearch.next();
    this.#cancelCurrentDetail.next();
    this.#cancelGroupedOrders.next();
    this.#lastRedirectTargetId = mainOrderId;
    this.orders.set([]);
    this.selectedOrder.set(null);
    this.groupedOrders.set([]);
    const queryParams: Params = {
      code: null,
      email: null,
      external_order_id: null,
      id: String(mainOrderId),
      payment_card_number_last_4_digits: null,
      phone_number: null,
      type: ValidationTypeEnum.ORDER,
    };
    void this.#router.navigate([], {
      queryParams,
      queryParamsHandling: 'merge',
      relativeTo: this.#route,
      replaceUrl: true,
    });
    this.onSearchRequest(
      {
        fromCamera: false,
        fromScan: false,
        type: ValidationTypeEnum.ORDER,
        value: mainOrderId,
      },
      { preserveRedirectTarget: true },
    );
  }

  #refreshAfterAction(): void {
    const orderId = this.selectedOrder()?.id;
    if (this.isSummarySearchEnabled() && orderId != null) {
      this.#summaryPageOnlySearch = true;
      this.#summaryRefreshKeepSelection = true;
      this.requestSearchSubject.next(this.#lastSearchQuery);
      this.#loadOrderDetail(orderId);
    } else {
      this.requestSearchSubject.next(this.#lastSearchQuery);
    }
  }

  #searchOrderRequest(searchQuery: SearchOrderQuery | null): Observable<Order[] | null> {
    if (searchQuery === null) {
      return of(null);
    }

    const summaryCursor = this.#summarySearchCursor;
    this.#summarySearchCursor = undefined;
    const currentSearchIndex = ++this.searchCount;
    const preserveSummaryListState = this.isSummarySearchEnabled() && this.#summaryPageOnlySearch;
    this.#summaryPageOnlySearch = false;
    const keepSelectedOrderForSummaryRefresh = this.isSummarySearchEnabled() && this.#summaryRefreshKeepSelection;
    this.#summaryRefreshKeepSelection = false;
    if (this.isSummarySearchEnabled()) {
      this.summaryListSessionActive.set(true);
    }
    this.loadingSearch.set(true);
    this.error = null;
    this.orders.set([]);
    this.#cancelCurrentSearch.next();
    this.#cancelCurrentDetail.next();
    this.#cancelGroupedOrders.next();
    this.groupedOrders.set([]);
    this.groupedOrdersLoading.set(false);
    if (!preserveSummaryListState) {
      this.#summaryPaginationRollback = null;
      this.#orderSummaries.set([]);
      this.summaryTotalCount.set(0);
      this.#summaryNextCursor.set(null);
    }
    if (!keepSelectedOrderForSummaryRefresh) {
      this.selectedOrder.set(null);
    }
    this.showTicketDetails = false;

    if (this.isSummarySearchEnabled()) {
      return this.#purchaseService.searchOrderSummaries(this.#buildSummarySearchQuery({ cursor: summaryCursor }) ?? searchQuery).pipe(
        takeUntil(this.#cancelCurrentSearch),
        map(result => this.mapResult(result) as ValidationOrderSummariesPage),
        tap((page: ValidationOrderSummariesPage) => {
          const summaries = page?.items ?? [];
          this.#orderSummaries.set(summaries);
          this.#summaryNextCursor.set(page?.nextCursor ?? null);
          this.summaryTotalCount.set(page?.totalCount ?? summaries.length);
          this.#summaryPaginationRollback = null;
          if (currentSearchIndex === this.searchCount) {
            this.loadingSearch.set(false);
            this.#tryAutoSelectSingleSummary();
          }
        }),
        map((): null => null),
        catchError(error => {
          if (currentSearchIndex === this.searchCount && this.#summaryPaginationRollback != null) {
            const rollback = this.#summaryPaginationRollback;
            this.summaryCurrentPage.set(rollback.currentPage);
            this.#summaryCursorHistory.set(rollback.cursorHistory);
            this.#summaryPaginationRollback = null;
          }
          return this.#handleSearchError(error);
        }),
        finalize(() => {
          if (currentSearchIndex === this.searchCount) {
            this.loadingSearch.set(false);
          }
        }),
      );
    }

    const handedOffOrders = searchQuery.orderId === undefined ? null : this.#searchHandoff.take(searchQuery.partnerId, searchQuery.orderId);
    if (handedOffOrders !== null) {
      return of(handedOffOrders);
    }

    let searchSucceeded = false;
    return this.#purchaseService.searchOrders(searchQuery).pipe(
      takeUntil(this.#cancelCurrentSearch),
      map(result => {
        const data = this.mapResult(result);
        searchSucceeded = true;
        return data;
      }),
      catchError(error => this.#handleSearchError(error)),
      finalize(() => {
        if (currentSearchIndex === this.searchCount && !searchSucceeded) {
          this.loadingSearch.set(false);
        }
      }),
    );
  }

  #showDepositRefundToast(sentiment: AlertSentiment, errorCode?: number | string): void {
    const suffix = sentiment === AlertSentiment.danger ? resolveDepositRefundErrorSuffix(errorCode) : 'success';
    this.#toastService.add({
      autoHide: false,
      message: this.#translate.instant(`reservation.deposit.refund.toast.${suffix}Message`),
      sentiment,
      title: this.#translate.instant(`reservation.deposit.refund.toast.${suffix}Title`),
    });
  }

  #showStaffNoteToastFromMoveSeatsIfNeeded(): void {
    const state = history.state as { showStaffNoteToast?: boolean } | undefined;
    if (state?.showStaffNoteToast !== true) {
      return;
    }
    history.replaceState({ ...history.state, showStaffNoteToast: false }, '');
    const hasOrders = this.orders().length > 0 || this.#orderSummaries().length > 0;
    if (!hasOrders) {
      return;
    }
    this.#toastService.add({
      autoHide: true,
      message: this.#translate.instant('seatingManagement.messages.staffNoteReflectsSeatChanges'),
      sentiment: AlertSentiment.info,
    });
  }

  #toggleFooter(isActive: boolean): void {
    window.dispatchEvent(new CustomEvent(TOGGLE_FOOTER_EVENT_KEY, { detail: { isActive } }));
  }

  #tryAutoSelectSingleSummary(): void {
    const summaries = this.filteredOrderSummaries();
    if (
      !this.isSummarySearchEnabled() ||
      summaries.length !== 1 ||
      this.summaryTotalCount() !== 1 ||
      this.loadingSearch() ||
      this.loadingDetail() ||
      this.selectedOrder() !== null ||
      this.#autoSelectBlocked() ||
      this.#summarySearchTrigger() !== 'primary'
    ) {
      return;
    }
    this.selectSummary(summaries[0]);
  }
}
