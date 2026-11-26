import { getCurrencySymbol, TitleCasePipe } from '@angular/common';
import {
  afterNextRender,
  Component,
  computed,
  DestroyRef,
  effect,
  ElementRef,
  EventEmitter,
  inject,
  Injector,
  Input,
  input,
  linkedSignal,
  OnChanges,
  OnInit,
  Output,
  output,
  Signal,
  signal,
  SimpleChanges,
  ViewChild,
  viewChild,
  ViewEncapsulation,
  WritableSignal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { RoundingHelpClickEvent } from '@fz-original/app/core/tracking/core/events/rounding-help-click-module';
import { TrackingService } from '@fz-original/app/core/tracking/tracking.service';
import { SeatingMapModalComponent } from '@fz-original/app/modules/attendees/list-attendees/components/seating-map-modal/seating-map-modal.component';
import { PlanDiscountType } from '@fz-original/app/modules/box-office/memberships/models/memberships.model';
import { BaseResponse } from '@fz-original/app/shared/models/base-response';
import { ChannelType } from '@fz-original/app/shared/models/channel/channel-type.enum';
import { SeatingConfiguration } from '@fz-original/app/shared/models/seating-configuration/seating-configuration.model';
import { SeatingMapQuery } from '@fz-original/app/shared/models/seating-map/seating-map-query';
import { SeatingMap } from '@fz-original/app/shared/models/seating-map/seating-map.model';
import { SeatsManagementService } from '@fz-original/app/shared/services/move-customers-seats/seats-management.service';
import { PartnerService } from '@fz-original/app/shared/services/partner/partner.service';
import { SeatingConfigurationService } from '@fz-original/app/shared/services/seating-configuration/seating-configuration.service';
import { SeatingMapService } from '@fz-original/app/shared/services/seating-map/seating-map.service';
import { ToastService, ToastType } from '@fz-original/app/shared/services/toast/toast.service';
import { NgbModal, NgbModalRef } from '@ng-bootstrap/ng-bootstrap';
import { TranslateService } from '@ngx-translate/core';
import { forkJoin, merge, Observable } from 'rxjs';
import { finalize, map, take, takeUntil } from 'rxjs/operators';

import { CartAdjustmentPrice } from '../../cart/models/cart-adjustment-price.model';
import { CartAdjustmentPriceService } from '../../cart/services/cart-adjustment-price.service';
import { CartDetailService } from '../../cart/services/cart-detail.service';
import { ChronologicalCartLines, chronologicalCartLines } from '../../cart/utils/chronological-cart-lines.util';
import { CartSessionGroup, chronologicalSessionGroups } from '../../cart/utils/chronological-session-groups.util';
import {
  getDepositPaidDeductionMoney,
  getOrderSettlementPaymentMoney,
  getReservationValueMoney,
  shouldShowDepositDeductionBreakdown,
  wasDepositPaidForOrderBreakdown,
} from '../../cart/utils/deposit-cart-breakdown.util';
import { planNameForSession as resolvePlanNameForSession } from '../../cart/utils/plan-names.util';
import { getRoundingHelpTranslationParams } from '../../cart/utils/rounding-help.util';
import { canEditServingTimeLine, servingTimeLineLabel } from '../../cart/utils/serving-time.util';
import { CartSessionManualPriceChange } from '../../models/cart/cart-session-manual-price.model';
import { CartSession } from '../../models/cart/cart-session.model';
import { Cart, PRODUCTS_GROUP_KEY } from '../../models/cart/cart.model';
import { Money } from '../../models/money.model';
import { OrderUserCancellationRecord } from '../../models/order/order-cancellation-record.model';
import { OrderPaymentLeg } from '../../models/order/order-payment-leg.model';
import { OrderTransaction } from '../../models/order/order-transaction.model';
import { isTransactionFeeSessionType } from '../../models/session-type/session-type.util';
import { ChannelTranslatePipe } from '../../pipes/channel-translate/channel-translate.pipe';
import { SeatingProviderEnum } from '../../seating-selector/components/seating-selector/__data__/seating-provider.enum';
import { PartnerConfigService } from '../../services/partner-config/partner-config.service';
import { canSetManualPrice, getCatalogLineTotal, getManualPriceChangeTotal, getPricedUnits } from '../../utils/cart-manual-price.util';
import { CartUtil } from '../../utils/cart.util';
import { fixedDecimals, isNonZeroNumber } from '../../utils/number.util';
import {
  hasPaymentLegsBreakdown,
  orderPaymentLegRows,
  orderPaymentLegsTotal,
} from '../../utils/payment-method-display/order-payment-leg-rows.util';
import { shouldShowReferencePrice } from '../../utils/reference-price.util';
import { stepAlignedMax, stepDown, stepUp } from '../../utils/ticket-step.util';
import { MessageModalComponent } from '../message-modal/message-modal.component';
import {
  getOrderDepositRefundedAmount as getOrderDepositRefundedAmountFromRecords,
  getOrderRefundedAmountFromCancellationRecords,
  getOrderRefundedDateFromCancellationRecords,
} from '../order/utils/order-cancellation-refund.util';
import { SeatingModalComponent } from '../seating-modal/seating-modal.component';
import {
  CartLineLimits,
  CartLinePriceChange,
  CartLinePricePending,
  CartLineRef,
  CartSessionSelection,
  CartSessionUnitsChange,
} from './cart-line-actions.model';

@Component({
  encapsulation: ViewEncapsulation.None,
  providers: [TitleCasePipe, ChannelTranslatePipe, CartDetailService, CartAdjustmentPriceService],
  selector: 'cart-detail',
  standalone: false,
  styleUrls: ['./cart-detail.component.scss'],
  templateUrl: './cart-detail.component.html',
})
export class CartDetailComponent implements OnInit, OnChanges {
  readonly #cartDetailService: CartDetailService = inject(CartDetailService);
  #destroyRef = inject(DestroyRef);
  #injector = inject(Injector);
  #modalService = inject(NgbModal);
  #partnerConfigService = inject(PartnerConfigService);
  #partnerService = inject(PartnerService);
  #seatingConfigService = inject(SeatingConfigurationService);
  #seatingMapService = inject(SeatingMapService);
  #seatsManagementService = inject(SeatsManagementService);
  #toastService = inject(ToastService);
  #trackingService = inject(TrackingService);
  readonly #translate = inject(TranslateService);
  readonly #cartAdjustmentPriceService = inject(CartAdjustmentPriceService, { optional: true });

  @ViewChild('adjustmentConceptElement') adjustmentConceptElement!: ElementRef<HTMLParagraphElement>;
  private readonly cartPanel = viewChild<ElementRef<HTMLElement>>('cartPanel');
  #knownLineKeys = new Set<string>();
  adjustmentConceptExpanded = signal(false);
  adjustmentOverTotalCart = computed(() => this.#cartDetailService?.adjustmentOverTotalCart() ?? null);
  cartAdjustmentInitial = computed(() => this.#cartDetailService.cart()?.adjustment ?? null);
  protected cartAdjustmentDraft = signal<CartAdjustmentPrice | null | undefined>(undefined);
  cartAdjustmentErrorKey = computed<string | null>(() => {
    const draft = this.cartAdjustmentDraft();
    if (draft === undefined) {
      return null;
    }
    return this.#cartDetailService.validateAdjustmentPrice(draft ?? undefined) ? null : 'cart.adjustment.error';
  });

  onCartAdjustmentChange(draft: CartAdjustmentPrice | null): void {
    this.cartAdjustmentDraft.set(draft);
    this.#cartAdjustmentPriceService?.apply(draft);
  }
  @Input() canToggleAdjustmentPrice = true;
  @Input() cart: Cart | null = null;
  cartTotal = new Money(0, 'EUR');
  channel: string | null = null;
  channelTranslatePipe = inject(ChannelTranslatePipe);
  @Input() checkCustomerInfo = false;
  @Output() clearAll = new EventEmitter<void>();
  @Input() collapsable = false;
  @Output() couponRemoved = new EventEmitter<void>();
  createdAt = '';
  @Input() fullHeight = false;
  hasAdjustmentPrice = computed(
    () => !!this.#cartDetailService?.cart()?.adjustment && !!this.#cartDetailService?.cart()?.adjustment?.amount,
  );
  hasCoupon = computed(() => !this.#cartDetailService || !!this.#cartDetailService?.hasCoupon());
  hasDiscountsCoupons = computed(() => this.#cartDetailService?.hasDiscountsCoupons() ?? false);
  hasInvoicingEnabled = false;
  hasPromotion = computed(() => !this.#cartDetailService || !!this.#cartDetailService?.hasPromotion());
  hasRounding = computed(() => this.#cartDetailService.getAdjustmentRounding() !== null);
  hasSeating = false;
  isCartUpdating = computed(() => this.#cartDetailService?.updatingCart() ?? false);
  @Input() isCollapsed = false;
  isInvitationChannel = false;
  @Input() isLoading = false;
  isLoadingSeating = false;
  @Input() isRescheduleFlow = false;
  locale: string = this.#translate.currentLang;
  readonly loyaltyPoints = input<number | null>(null);
  @Input() orderId?: number;
  readonly orderCancellationRecords = input<OrderUserCancellationRecord[] | null | undefined>(undefined);
  readonly orderDepositRefundedAmount = input<Money | null | undefined>(undefined);
  readonly orderRefundedAmount = input<Money | null | undefined>(undefined);
  partnerId: number | undefined;
  readonly paymentCardNumberLast4Digits = input<string | undefined>(undefined);
  readonly paymentLegs = input<readonly OrderPaymentLeg[]>([]);
  readonly paymentTransactions = input<readonly OrderTransaction[]>([]);
  readonly showPaymentLegs = computed(() => hasPaymentLegsBreakdown(this.paymentLegs()));
  protected readonly paymentLegRows = computed(() =>
    orderPaymentLegRows(
      this.#translate,
      this.paymentLegs(),
      this.locale ?? 'en-US',
      this.paymentTransactions(),
      this.cart?.timezone ?? null,
    ),
  );
  protected readonly paymentLegsTotal = computed(() => orderPaymentLegsTotal(this.paymentLegs(), this.locale ?? 'en-US'));
  @Input() paymentNotes?: string;
  planNamesByPlanId = input<ReadonlyMap<number, string> | null>(null);
  showPlanNames = input(false);
  productItems: WritableSignal<CartSession[]> = signal<CartSession[]>([]);
  readonly productsGroupKey = PRODUCTS_GROUP_KEY;
  /** Emits the manual price entered in the editor of an expanded line. Only when `linePriceEditable`. */
  readonly cartLinePriceApply = output<CartLinePriceChange>();
  /** Emits the line whose manual price was removed. Only when `linePriceEditable`. */
  readonly cartLinePriceClear = output<CartSessionSelection>();
  /** Emits a new units value chosen with the stepper of an expanded line. Only when `expandableLines`. */
  readonly cartSessionUnitsChange = output<CartSessionUnitsChange>();
  /** `${datetime}|${sessionId}` of the single line whose price editor is open; an update the backend confirms closes it. */
  readonly #editingPriceLineKey = linkedSignal<number, string | null>({ computation: () => null, source: () => this.linePriceSaveCount() });
  /** The last price sent or cleared from a line, kept until the backend confirms it so a refusal reopens the editor from it. */
  readonly #pendingLinePrice = linkedSignal<number, CartLinePricePending | null>({
    computation: () => null,
    source: () => this.linePriceSaveCount(),
  });
  readonly pendingLinePriceChange = computed(() => this.#pendingLinePrice()?.change ?? null);
  /** The refusal of the line price still pending; hidden once the staff member cancels or moves to another line. */
  readonly pendingLinePriceRefusal = computed(() => (this.#pendingLinePrice() !== null ? this.linePriceRefusal() : null));
  /** Makes each cart line expandable (click, Enter or Space) to reveal its stepper and remove action. */
  readonly expandableLines = input(false);
  readonly highlightedLines = input<readonly CartLineRef[]>([]);
  readonly #highlightedLineKeys = computed(
    () => new Set(this.highlightedLines().map(line => this.#lineKey(line.datetime, line.sessionId))),
  );
  /** `${datetime}|${sessionId}` of the single line currently expanded. */
  readonly expandedLineKey = signal<string | null>(null);
  /** Translation key of why "Edit price" is disabled (an order adjustment is set, the cart cannot carry prices); null enables it. */
  readonly linePriceDisabledHint = input<string | null>(null);
  /** Adds "Edit price" to the expanded panel of every line that can carry a manual price (GAME-1722). Needs `expandableLines`. */
  readonly linePriceEditable = input(false);
  /** Translation key of why the backend refused the last line price change; shown on that line until the next change. */
  readonly linePriceRefusal = input<string | null>(null);
  /** Bumped by the parent on every line price update the backend confirms: the open editor closes. */
  readonly linePriceSaveCount = input(0);
  /**
   * True while the parent sends a line price update. The parent's `CartDetailService` is not this component's (it provides its
   * own), so `isCartUpdating` does not see that update.
   */
  readonly linePriceUpdating = input(false);
  /** Edit, Clear and Apply wait while any cart update is in flight: a second change would restore an unconfirmed cart. */
  readonly isLinePriceBusy = computed(() => this.isCartUpdating() || this.linePriceUpdating());
  /** Shows the stepper and the remove action in the expanded panel; the contact step offers only the price. */
  readonly lineUnitActions = input(true);
  /** Quantity rules per session id; a line without an entry (or with seats) offers only the remove action. */
  readonly lineLimitsBySessionId = input<ReadonlyMap<number, CartLineLimits> | null>(null);
  /** Emits the cart line whose remove action was clicked, with its `sessionItemsByDatetime` key. Only when `expandableLines`. */
  readonly removeCartSession = output<CartSessionSelection>();
  @Input() rescheduledSessionDate: Date | null = null;
  roundingTotal = computed(() => this.#cartDetailService.getAdjustmentRounding() ?? null);
  @Input() scope = '';
  @Input() seatingProvider: SeatingProviderEnum | null = null;
  sessionItemsByDatetime: WritableSignal<Map<string, CartSession[]>> = signal<Map<string, CartSession[]>>(new Map<string, CartSession[]>());
  @Input() showBookingFeesWhen0? = true;
  @Input() showClearAll = true;
  @Input() showDiscount = true;
  @Input() showEstimatedEndTime = false;
  showInvoice = false;
  @Input() showInvoiceButton = false;
  showOldPrice = true;
  @Input() showOverridePriceModule = false;
  @Input() showPaymentDetails = false;
  @Input() showPrice = true;
  readonly showReferencePrice = input(false);
  @Input() showSeatingInModal = false;
  @Input() showSeatingMap = false;
  canEditServingTime = input(false);
  servingTimeActionDisabled = input(false);
  servingTimeAnchorDate = input<string | null>(null);
  servingTimesBySessionId = input<ReadonlyMap<number, string> | null>(null);
  showServingTime = input(false);
  readonly chronologicalLines: Signal<ChronologicalCartLines> = computed(() =>
    chronologicalCartLines(this.sessionItemsByDatetime(), this.productItems(), this.servingTimesBySessionId()),
  );
  readonly unscheduledProducts: Signal<CartSession[]> = computed(() =>
    this.showServingTime() ? this.chronologicalLines().productsWithoutServingTime : this.productItems(),
  );
  readonly hasServiceTimeAction = computed(() => this.productItems().some(cartSession => this.canEditServingTimeFor(cartSession)));
  readonly sessionGroups: Signal<CartSessionGroup[]> = computed(() => chronologicalSessionGroups(this.sessionItemsByDatetime()));
  readonly serviceTimeRequested = output<void>();
  showSeeMoreAdjustmentConceptButton = signal(false);
  @Input() showSessionDate = true;
  @Input() showShadow = true;
  /**
   * Fits the cart into a height-capped sticky panel: the header and the price summary stay pinned while the
   * lines scroll, newly added lines are scrolled into view, and a collapsed cart keeps its total visible.
   */
  readonly stickyPanel = input(false);
  @Input() subtitle?: string;
  @Input() title = 'boxOffice.cart.title';
  readonly window = window;

  constructor() {
    effect(() => {
      const highlightedLineKeys = [...this.#highlightedLineKeys()];
      const stickyPanel = this.stickyPanel();
      if (highlightedLineKeys.length === 0) {
        return;
      }
      afterNextRender(
        () => {
          this.#restartLineHighlights();
          if (stickyPanel) {
            this.#scrollLinesIntoView(highlightedLineKeys);
          }
        },
        { injector: this.#injector },
      );
    });
    effect(() => {
      if (this.#cartDetailService?.cart()?.adjustment?.concept) {
        setTimeout(() => this.checkIfOverflow(), 0);
      }
    });
  }

  checkIfOverflow(): void {
    if (!this.adjustmentConceptElement) return;
    const element = this.adjustmentConceptElement.nativeElement;
    const lineHeight = parseFloat(window.getComputedStyle(element).lineHeight);
    const alturaDosLineas = lineHeight * 2;
    this.showSeeMoreAdjustmentConceptButton.set(element.scrollHeight > alturaDosLineas);
  }

  clickOnClearAll(): void {
    this.clearAll.emit();
    this.#cartDetailService.clearCart();
  }

  cartLineKey(cartSession: CartSession, groupKey: string): string {
    return this.#lineKey(groupKey, cartSession.sessionId);
  }

  canDecrease(cartSession: CartSession): boolean {
    const limits = this.lineLimits(cartSession);
    return limits !== null && cartSession.units > limits.min;
  }

  canEditUnits(cartSession: CartSession): boolean {
    return !CartUtil.isCartSessionSeatingLine(cartSession) && this.lineLimits(cartSession) !== null;
  }

  canIncrease(cartSession: CartSession): boolean {
    const limits = this.lineLimits(cartSession);
    return limits !== null && cartSession.units < stepAlignedMax(limits.min, limits.max, limits.step);
  }

  decreaseUnits(cartSession: CartSession, groupKey: string, event: Event): void {
    event.stopPropagation();
    const limits = this.lineLimits(cartSession);
    if (!limits || !this.canDecrease(cartSession)) {
      return;
    }
    // `stepDown` collapses to 0 at the minimum; the stepper never removes a line, that is the remove action's job.
    const next = Math.max(limits.min, stepDown(cartSession.units, limits.min, limits.max, limits.step));
    this.cartSessionUnitsChange.emit({ cartSession, datetime: groupKey, units: next });
  }

  increaseUnits(cartSession: CartSession, groupKey: string, event: Event): void {
    event.stopPropagation();
    const limits = this.lineLimits(cartSession);
    if (!limits || !this.canIncrease(cartSession)) {
      return;
    }
    this.cartSessionUnitsChange.emit({
      cartSession,
      datetime: groupKey,
      units: stepUp(cartSession.units, limits.min, limits.max, limits.step),
    });
  }

  canEditServingTimeFor(cartSession: CartSession): boolean {
    return this.showServingTime() && this.canEditServingTime() && canEditServingTimeLine(cartSession, this.cart?.timezone);
  }

  requestServiceTime(): void {
    this.serviceTimeRequested.emit();
  }

  servingTimeFor(cartSession: CartSession): string {
    if (!this.showServingTime()) {
      return '';
    }
    return servingTimeLineLabel({
      anchorDate: this.servingTimeAnchorDate(),
      cartTimezone: this.cart?.timezone,
      session: cartSession,
      servingTimesBySessionId: this.servingTimesBySessionId(),
    });
  }

  isLineHighlighted(cartSession: CartSession, groupKey: string): boolean {
    return this.#highlightedLineKeys().has(this.cartLineKey(cartSession, groupKey));
  }

  isLineExpanded(cartSession: CartSession, groupKey: string): boolean {
    return this.expandedLineKey() === this.cartLineKey(cartSession, groupKey);
  }

  lineLimits(cartSession: CartSession): CartLineLimits | null {
    return this.lineLimitsBySessionId()?.get(cartSession.sessionId) ?? null;
  }

  onRemoveCartSession(cartSession: CartSession, groupKey: string, event?: Event): void {
    event?.stopPropagation();
    if (!this.expandableLines()) {
      return;
    }
    this.removeCartSession.emit({ cartSession, datetime: groupKey });
  }

  toggleLine(cartSession: CartSession, groupKey: string, event?: Event): void {
    if (!this.expandableLines()) {
      return;
    }
    event?.preventDefault();
    const key = this.cartLineKey(cartSession, groupKey);
    this.expandedLineKey.set(this.expandedLineKey() === key ? null : key);
    this.#editingPriceLineKey.set(null);
    this.#pendingLinePrice.set(null);
  }

  canEditPrice(cartSession: CartSession): boolean {
    return this.linePriceEditable() && canSetManualPrice(cartSession) && this.catalogUnitPrice(cartSession) !== null;
  }

  catalogLineTotal(cartSession: CartSession): Money | null {
    return getCatalogLineTotal(cartSession, this.cart);
  }

  /** The units the line editor totals: a per-individual-ticket add-on is charged once per ticket of the cart for each unit. */
  linePriceUnits(cartSession: CartSession): number {
    return getPricedUnits(cartSession, this.cart);
  }

  catalogUnitPrice(cartSession: CartSession): Money | null {
    return cartSession.catalogUnitPrice ?? cartSession.unitPrice ?? null;
  }

  closePriceEditor(): void {
    this.#editingPriceLineKey.set(null);
    this.#pendingLinePrice.set(null);
  }

  isEditingPrice(cartSession: CartSession, datetimeKey: string | undefined): boolean {
    return !!datetimeKey && this.#editingPriceLineKey() === this.#lineKey(datetimeKey, cartSession.sessionId);
  }

  /** True on the line whose last price change the backend refused, while its editor is closed (a refused clear). */
  isLinePriceRefused(cartSession: CartSession, datetimeKey: string | undefined): boolean {
    return (
      !!datetimeKey &&
      this.pendingLinePriceRefusal() !== null &&
      this.#pendingLinePrice()?.lineKey === this.#lineKey(datetimeKey, cartSession.sessionId) &&
      !this.isEditingPrice(cartSession, datetimeKey)
    );
  }

  linePriceChangeTotal(): Money | null {
    return getManualPriceChangeTotal(this.cart);
  }

  /** Sends the price and keeps the editor open: it closes when the backend confirms the update and stays with the refusal. */
  onApplyLinePrice(cartSession: CartSession, datetimeKey: string | undefined, change: CartSessionManualPriceChange): void {
    if (!datetimeKey || this.isLinePriceBusy()) {
      return;
    }
    this.#pendingLinePrice.set({ change, lineKey: this.#lineKey(datetimeKey, cartSession.sessionId) });
    this.cartLinePriceApply.emit({ ...change, cartSession, datetime: datetimeKey });
  }

  onClearLinePrice(cartSession: CartSession, datetimeKey: string | undefined, event: Event): void {
    event.stopPropagation();
    if (!datetimeKey || this.linePriceDisabledHint() !== null || this.isLinePriceBusy()) {
      return;
    }
    this.#editingPriceLineKey.set(null);
    this.#pendingLinePrice.set({ change: null, lineKey: this.#lineKey(datetimeKey, cartSession.sessionId) });
    this.cartLinePriceClear.emit({ cartSession, datetime: datetimeKey });
  }

  openPriceEditor(cartSession: CartSession, datetimeKey: string | undefined, event: Event): void {
    event.stopPropagation();
    if (!datetimeKey || !this.canEditPrice(cartSession) || this.linePriceDisabledHint() !== null || this.isLinePriceBusy()) {
      return;
    }
    this.#editingPriceLineKey.set(this.#lineKey(datetimeKey, cartSession.sessionId));
    this.#pendingLinePrice.set(null);
  }

  getDepositPaidDeductionMoney(): Money | null {
    return getDepositPaidDeductionMoney(this.cart?.deposit);
  }

  getDiscountInfoText(cartSession: CartSession): string {
    if (!cartSession.autoAppliedPlanDiscountsInfo) {
      return '';
    }

    const discountPercentageTranslationKey = this.#translate.instant(
      'sessions.pricing.priceList.priceEditForm.strikethroughPrice.discountTagText',
    );
    const discountAmountTranslationKey = this.#translate.instant('boxOffice.memberships.discounts.labelAmount');

    switch (cartSession.autoAppliedPlanDiscountsInfo.discountType) {
      case PlanDiscountType.PERCENTAGE:
        return `${cartSession.autoAppliedPlanDiscountsInfo.discount}% ${discountPercentageTranslationKey}`;
      case PlanDiscountType.AMOUNT: {
        const currency = cartSession.unitPrice?.currency ?? '';
        const currencySymbol = currency ? getCurrencySymbol(currency, 'narrow', this.locale) : '';
        return `${cartSession.autoAppliedPlanDiscountsInfo.discount}${currencySymbol} ${discountAmountTranslationKey}`;
      }
    }
  }

  getOrderSettlementPaymentAmount(): Money | null {
    return getOrderSettlementPaymentMoney(this.cart);
  }

  getReservationValueMoney(): Money | null {
    return getReservationValueMoney(this.cart, { fallbackCurrency: this.cartTotal.currency });
  }

  getSessionPrice(cartSession: CartSession): Money | null | undefined {
    const accumulatedTransactionFee = this.#getAccumulatedTransactionFee(cartSession);
    if (accumulatedTransactionFee) {
      return accumulatedTransactionFee;
    }
    return this.hasAdjustmentPrice() ? cartSession.overridePrices?.totalPriceWithOverride : cartSession.price;
  }

  getTotalDiscountByCartSession(cartSession: CartSession): Money {
    const currency = cartSession.unitPrice?.currency ?? '';
    if (!cartSession.autoAppliedPlanDiscountsInfo) {
      return new Money(0, currency);
    }

    const priceWithDiscount = cartSession.autoAppliedPlanDiscountsInfo.unitPriceWithDiscount.amount;
    const priceWithoutDiscount = cartSession.autoAppliedPlanDiscountsInfo.unitPriceWithoutDiscount.amount;
    const totalDiscount = fixedDecimals(Math.max(0, (priceWithoutDiscount - priceWithDiscount) * cartSession.units), 2);

    return new Money(totalDiscount, currency);
  }

  hasDiscountCartSession(cartSession: CartSession): boolean {
    return !!cartSession.autoAppliedPlanDiscountsInfo && cartSession.autoAppliedPlanDiscountsInfo.discount > 0;
  }

  shouldShowLoyaltyPoints(): boolean {
    return isNonZeroNumber(this.loyaltyPoints());
  }

  shouldShowSessionBookingFee(cartSession: CartSession): boolean {
    if (isTransactionFeeSessionType(cartSession.sessionType)) {
      return false;
    }
    return !!this.showBookingFeesWhen0 || (cartSession.surchargePerTicket?.amount ?? 0) > 0;
  }

  shouldShowSessionLoyaltyPrice(cartSession: CartSession): boolean {
    return isNonZeroNumber(cartSession.loyaltyTotalPrice);
  }

  shouldShowSessionReferencePrice(cartSession: CartSession): boolean {
    if (!this.showReferencePrice() || this.#isLinePricedBeforePromotion(cartSession)) {
      return false;
    }
    return this.#hasReferencePriceForLine(cartSession);
  }

  /**
   * The promotion row subtracts its discount from the lines above it, so a line whose charged price already includes
   * that discount shows its pre-discount reference price instead: the summary keeps reading price − discount = total.
   */
  getSessionLinePrice(cartSession: CartSession): Money | null | undefined {
    return this.#isLinePricedBeforePromotion(cartSession) ? cartSession.referencePrice?.price : this.getSessionPrice(cartSession);
  }

  #isLinePricedBeforePromotion(cartSession: CartSession): boolean {
    return this.isPromotionShown() && this.#hasReferencePriceForLine(cartSession);
  }

  /**
   * Keyed on the amount because that is the quantity UOX-471 is about: `discount` only ever counts what the partner
   * funded (`get_total_promotion_discount_paid_by_partner` behind the single serializer that emits it), so a
   * Fever-funded promotion arrives as 0 and stays hidden on every host, while anything above 0 is the partner's own
   * money to see. The payer cannot be used instead: `discountPaidBy` is read off the first discounted item while
   * `discount` is summed over all of them, so an order whose first item Fever paid reports a Fever payer with a
   * partner-funded amount, and hiding that row would drop a discount the lines above still subtract.
   */
  isPromotionShown(): boolean {
    const promotion = this.cart?.appliedPromotion;
    return this.showDiscount && this.hasPromotion() && !!promotion && isNonZeroNumber(promotion.discount?.amount);
  }

  #hasReferencePriceForLine(cartSession: CartSession): boolean {
    if (this.hasAdjustmentPrice() || isTransactionFeeSessionType(cartSession.sessionType)) {
      return false;
    }
    return shouldShowReferencePrice(
      cartSession.referencePrice?.price,
      this.getSessionPrice(cartSession),
      cartSession.referencePrice?.provenance,
    );
  }

  ngOnChanges(changes: SimpleChanges): void {
    const cart = changes.cart?.currentValue || this.cart;
    this.hasSeating = this.#getAllCartSessions(cart).some(session => session.seats?.length ?? 0 > 0);
    const showDiscount = changes.showDiscount?.currentValue ?? this.showDiscount;
    if (cart && showDiscount !== undefined) {
      this.cartTotal = this.#getCartTotal(cart, showDiscount);
    }
    if (changes.cart?.currentValue) {
      this.#cartDetailService.setCart(changes.cart?.currentValue);
      this.createdAt = this.#getCreatedAt(cart);
      this.orderDepositPaymentBreakdownVisible.set(true);
      this.#splitProductAndSessionItems(this.#cartDetailService?.cart() ?? this.cart);
    }
    if (changes.cart) {
      this.#collapseExpandedLineIfGone();
      this.#revealNewLines();
    }
  }

  ngOnInit(): void {
    const partnerId: number | undefined = this.#partnerService.getPartner()?.id;
    if (partnerId) {
      this.partnerId = partnerId;
    }
    this.hasInvoicingEnabled = this.#partnerConfigService.config?.features?.invoicingView ?? false;
    if (this.cart !== null) {
      const firstSession: CartSession | null = this.#getFirstSession(this.cart);
      this.showInvoice =
        this.showInvoiceButton &&
        this.hasInvoicingEnabled &&
        firstSession !== null &&
        firstSession.status === 'active' &&
        firstSession.sessionStartAt !== undefined &&
        new Date() > new Date(firstSession.sessionStartAt);
      this.isInvitationChannel = this.cart?.channel?.type === ChannelType.Invitation;
      this.channel = this.cart?.channel?.id ?? null;
    }
  }

  openRoundingModal(): void {
    this.#trackingService.track(
      new RoundingHelpClickEvent({
        rounding_quantity: this.#cartDetailService?.cart()?.adjustment?.rounded?.amount.amount,
        scope: this.scope,
        time: new Date().toISOString(),
      }),
    );
    const roundingHelpParams = getRoundingHelpTranslationParams(
      this.#cartDetailService.cart(),
      this.#cartDetailService.getAdjustmentRounding(),
      this.locale,
    );
    const modal = this.#modalService.open(MessageModalComponent);
    modal.componentInstance.title = this.#translate.instant('cart.adjustment.modalRounding.priceDifferenceTitle');
    modal.componentInstance.messages = [
      this.#translate.instant('cart.adjustment.modalRounding.roundingExplanation'),
      this.#translate.instant('cart.adjustment.modalRounding.chargedPriceWithRounding', roundingHelpParams),
      this.#translate.instant('cart.adjustment.modalRounding.exactTotalTip'),
    ];
    modal.componentInstance.acceptButtonLabel = this.#translate.instant('cart.adjustment.modalRounding.acceptButton');
  }

  openSeatingModal(): void {
    if (this.cart === null) {
      return;
    }
    const sessions = this.#getAllCartSessions(this.cart);
    if (sessions.length === 0) {
      return;
    }
    const modal = this.#openSeatingModalBase(sessions);
    const firstSeatedSession = sessions.find(s => s.seats?.length && s.mainPlanId && s.sessionId);
    if (firstSeatedSession && this.partnerId) {
      this.#loadSeatingMapData(modal, sessions, firstSeatedSession, this.partnerId);
    }
  }

  removeCoupon() {
    this.couponRemoved.emit();
  }

  shouldShowDepositDeductionBreakdown(): boolean {
    return !this.orderId && shouldShowDepositDeductionBreakdown(this.cart);
  }

  showAdjustmentConcept(): void {
    this.adjustmentConceptExpanded.set(!this.adjustmentConceptExpanded());
  }

  orderDepositPaymentBreakdownVisible = signal(true);

  hasOrderDepositPaidAmount(): boolean {
    return wasDepositPaidForOrderBreakdown(this.cart);
  }

  showOrderDepositPaymentSummary(): boolean {
    if (!this.orderId) {
      return false;
    }
    return (
      this.hasOrderDepositPaidAmount() ||
      this.hasOrderSettlementPaymentAmount() ||
      this.hasOrderRefundedAmount() ||
      this.hasOrderDepositRefundedAmount()
    );
  }

  hasOrderSettlementPaymentAmount(): boolean {
    const settlement = this.getOrderSettlementPaymentAmount();
    return settlement != null && settlement.amount > 0;
  }

  hasOrderRefundedAmount(): boolean {
    return this.getOrderRefundedAmount() !== null;
  }

  getOrderRefundedAmount(): Money | null {
    const explicit = this.orderRefundedAmount();
    if (explicit !== undefined) {
      return explicit != null && explicit.amount !== 0 ? explicit : null;
    }

    const records = this.orderCancellationRecords();
    if (records === undefined) {
      return null;
    }

    const refundedAmount = getOrderRefundedAmountFromCancellationRecords(records);
    return refundedAmount != null && refundedAmount.amount !== 0 ? this.#toRefundMoney(refundedAmount) : null;
  }

  getOrderRefundedDate(): string | null {
    return getOrderRefundedDateFromCancellationRecords(this.orderCancellationRecords());
  }

  getOrderDepositRefundedDate(): string | null {
    return this.cart?.deposit?.refundedAt ?? null;
  }

  hasOrderDepositRefundedAmount(): boolean {
    return this.getOrderDepositRefundedAmount() !== null;
  }

  getOrderDepositRefundedAmount(): Money | null {
    const explicit = this.orderDepositRefundedAmount();
    if (explicit !== undefined) {
      return explicit;
    }
    const records = this.orderCancellationRecords();
    if (records === undefined) {
      return null;
    }
    const refunded = getOrderDepositRefundedAmountFromRecords(records, this.cart?.deposit);
    return refunded ? new Money(-Math.abs(refunded.amount), refunded.currency) : null;
  }

  toggleOrderDepositPaymentBreakdown(): void {
    this.orderDepositPaymentBreakdownVisible.update(visible => !visible);
  }

  #toRefundMoney(amount: Money): Money {
    return new Money(-Math.abs(amount.amount), amount.currency);
  }

  showSeatingMapModal(): void {
    if (this.isLoadingSeating || this.cart === null) {
      return;
    }
    this.isLoadingSeating = true;
    this.#seatingMapService
      .getSeatingMap(this.#getSeatingMapQuery(this.cart))
      .pipe(
        map(this.#mapBaseResponse),
        finalize(() => (this.isLoadingSeating = false)),
        takeUntilDestroyed(this.#destroyRef),
      )
      .subscribe({
        error: error => this.#displayError(error),
        next: (response: SeatingMap | null) => {
          if (response !== null) {
            this.#openSeatingMapModal(response);
          }
        },
      });
  }

  protected getSeatLabels(cartSession: CartSession) {
    return CartUtil.getSessionSeatLabelsForUi(cartSession);
  }

  shouldShowDateForSessionGroup(sessions: CartSession[]): boolean {
    return !sessions.every(session => session.sessionType?.isTimeless === true);
  }

  #displayError(error: { message: string }) {
    this.#toastService.add({
      autoHide: true,
      translationKey: this.#translate.instant(error.message),
      type: ToastType.ERROR,
    });
  }

  #getAccumulatedTransactionFee(cartSession: CartSession): Money | null | undefined {
    return isTransactionFeeSessionType(cartSession.sessionType) ? cartSession.accumulatedTransactionFee : undefined;
  }

  #getAccumulatedTransactionFeesExcess(cartSessions: CartSession[], getChargedAmount: (cartSession: CartSession) => number): number {
    const excess = cartSessions.reduce((total, cartSession) => {
      const accumulatedTransactionFee = this.#getAccumulatedTransactionFee(cartSession);
      return accumulatedTransactionFee ? total + accumulatedTransactionFee.amount - getChargedAmount(cartSession) : total;
    }, 0);
    return fixedDecimals(excess, 2);
  }

  #getAllCartSessionIds(cart: Cart) {
    return Array.from(cart?.sessionItemsByDatetime.values() ?? [])
      .reduce((prev, curr) => [...prev, ...curr], [])
      .map(cartSession => cartSession.sessionId);
  }

  #getAllCartSessions(cart: Cart): CartSession[] {
    return Array.from(cart?.sessionItemsByDatetime.values() ?? []).reduce((prev, curr) => [...prev, ...curr], []);
  }

  #getCartTotal(cart: Cart, showDiscount: boolean): Money {
    const currency = cart?.total?.currency ?? 'EUR';
    const cartSessions = this.#getAllCartSessions(cart);

    if (cartSessions?.find(cartSession => !!cartSession.autoAppliedPlanDiscountsInfo)) {
      return this.#getCartTotalWithDiscounts(cartSessions, currency);
    }

    let amount = cart?.total?.amount ?? 0;
    if (!showDiscount && cart?.appliedCoupon) {
      amount += cart.appliedCoupon.discount.amount;
    }
    const hasAdjustmentPrice = !!cart?.adjustment?.amount;
    return new Money(
      amount +
        this.#getAccumulatedTransactionFeesExcess(cartSessions, cartSession => this.#getChargedPrice(cartSession, hasAdjustmentPrice)),
      currency,
    );
  }

  #getCartTotalWithDiscounts(cartSessions: CartSession[], currency: string): Money {
    let amount = 0;
    cartSessions.forEach(cartSession => {
      if (cartSession.autoAppliedPlanDiscountsInfo) {
        amount +=
          cartSession.autoAppliedPlanDiscountsInfo.unitPriceWithDiscount.amount * cartSession.units +
          (cartSession.totalSurchargePerTicket?.amount ?? 0);
      } else {
        amount += (cartSession.price?.amount ?? 0) + (cartSession.totalSurchargePerTicket?.amount ?? 0);
      }
    });
    return new Money(
      amount + this.#getAccumulatedTransactionFeesExcess(cartSessions, cartSession => cartSession.price?.amount ?? 0),
      currency,
    );
  }

  #getChargedPrice(cartSession: CartSession, hasAdjustmentPrice: boolean): number {
    return (hasAdjustmentPrice ? cartSession.overridePrices?.totalPriceWithOverride : cartSession.price)?.amount ?? 0;
  }

  #getCreatedAt(cart: Cart): string {
    const firstSession: CartSession | null = this.#getFirstSession(cart);
    return cart.createdAt ?? firstSession?.createdAt ?? '';
  }

  #getFirstSession(cart: Cart): CartSession | null {
    return cart.sessionItemsByDatetime.entries().next().value?.[1]?.[0] ?? null;
  }

  #getSeatingMapQuery(cart: Cart): SeatingMapQuery {
    return {
      channel: this.channel,
      partnerId: this.partnerId,
      readonly: true,
      sessionIds: this.#getAllCartSessionIds(cart),
    };
  }

  #loadSeatingMapData(modal: NgbModalRef, sessions: CartSession[], firstSeatedSession: CartSession, partnerId: number): void {
    const planId = firstSeatedSession.mainPlanId;
    if (!planId) {
      return;
    }
    const sessionId = firstSeatedSession.sessionId;
    const modalClosed$ = merge(modal.closed, modal.dismissed).pipe(take(1));
    const seatingConfig$ = this.#seatingConfigService.getSeatingConfiguration({ partnerId, planId, sessionId });
    if (this.orderId) {
      this.#loadSeatingMapWithOrder(modal, seatingConfig$, modalClosed$, planId, sessionId, this.orderId);
    } else {
      this.#loadSeatingMapWithoutOrder(modal, sessions, seatingConfig$, modalClosed$);
    }
  }

  #loadSeatingMapWithOrder(
    modal: NgbModalRef,
    seatingConfig$: Observable<BaseResponse<SeatingConfiguration | null>>,
    modalClosed$: Observable<unknown>,
    planId: number,
    sessionId: number,
    orderId: number,
  ): void {
    const seatsByOrder$ = this.#seatsManagementService.getSeatsByOrder(planId, sessionId, 1, 100, orderId);
    forkJoin([seatingConfig$, seatsByOrder$])
      .pipe(takeUntil(modalClosed$), takeUntilDestroyed(this.#destroyRef))
      .subscribe({
        error: () => {},
        next: ([configResponse, seatsResponse]) => {
          if (seatsResponse.data) {
            const refs = seatsResponse.data.orders
              .flatMap(o => o.tickets)
              .flatMap(t => t.seats)
              .map(s => s.currentSeatReference)
              .filter(Boolean);
            modal.componentInstance.highlightedSeats = refs;
          }
          if (configResponse.data) {
            modal.componentInstance.mapConfig = {
              eventKey: configResponse.data.eventKey,
              secretKey: configResponse.data.providerSecretKey,
            };
          } else if (configResponse.error) {
            this.#displayError({ message: configResponse.error.message ?? 'errors.generic' });
          }
        },
      });
  }

  #loadSeatingMapWithoutOrder(
    modal: NgbModalRef,
    sessions: CartSession[],
    seatingConfig$: Observable<BaseResponse<SeatingConfiguration | null>>,
    modalClosed$: Observable<unknown>,
  ): void {
    modal.componentInstance.highlightedSeats = sessions.flatMap(s => s.seats ?? []);
    seatingConfig$.pipe(takeUntil(modalClosed$), takeUntilDestroyed(this.#destroyRef)).subscribe({
      error: () => {},
      next: response => {
        if (response.data) {
          modal.componentInstance.mapConfig = { eventKey: response.data.eventKey, secretKey: response.data.providerSecretKey };
        } else if (response.error) {
          this.#displayError({ message: response.error.message ?? 'errors.generic' });
        }
      },
    });
  }

  #mapBaseResponse<T>({ data, error }: BaseResponse<T>): T | null {
    if (error) throw error;
    return data;
  }

  protected planNameForSession(session: CartSession): string | null {
    return resolvePlanNameForSession(this.planNamesByPlanId(), session, this.showPlanNames());
  }

  #openSeatingModalBase(sessions: CartSession[]): NgbModalRef {
    const sessionsSeats = sessions.map((session: CartSession) => {
      const { units, sessionName } = session;
      const seats = this.getSeatLabels(session);
      return { units, sessionName, seats };
    });
    const modal: NgbModalRef = this.#modalService.open(SeatingModalComponent, { size: 'lg' });
    modal.componentInstance.sessionsSeats = sessionsSeats;
    modal.componentInstance.closeEmitter.pipe(take(1), takeUntilDestroyed(this.#destroyRef)).subscribe(() => modal.close());
    return modal;
  }

  #openSeatingMapModal(seatingResponse: SeatingMap): void {
    const sessions: CartSession[] = this.#getAllCartSessions(this.cart as Cart);
    if (sessions.length > 0) {
      const modal: NgbModalRef = this.#modalService.open(SeatingMapModalComponent, { size: 'lg' });
      modal.componentInstance.seatingEvent = seatingResponse.id;
      modal.componentInstance.workspacePublicKey = seatingResponse.providerPublicKey;
      modal.componentInstance.availableChannels = seatingResponse.channels;
    }
  }

  /** A units change keeps the same key (line still there); a removal or a cleared cart collapses the panel. */
  #collapseExpandedLineIfGone(): void {
    const key = this.expandedLineKey();
    if (key === null) {
      return;
    }
    const separator = key.lastIndexOf('|');
    const datetime = key.slice(0, separator);
    const sessionId = Number(key.slice(separator + 1));
    const stillThere = this.cart?.sessionItemsByDatetime?.get(datetime)?.some(session => session.sessionId === sessionId) ?? false;
    if (!stillThere) {
      this.expandedLineKey.set(null);
      this.#editingPriceLineKey.set(null);
    }
  }

  #lineKeysInCart(): Set<string> {
    const keys = new Set<string>();
    if (!this.cart) {
      return keys;
    }
    this.sessionItemsByDatetime().forEach((cartSessions, datetime) =>
      cartSessions.forEach(cartSession => keys.add(this.cartLineKey(cartSession, datetime))),
    );
    this.productItems().forEach(cartSession => keys.add(this.cartLineKey(cartSession, this.productsGroupKey)));
    return keys;
  }

  #restartLineHighlights(): void {
    this.cartPanel()
      ?.nativeElement.querySelectorAll<HTMLElement>('.ticket--highlighted')
      .forEach(line =>
        line.getAnimations?.().forEach(animation => {
          animation.currentTime = 0;
        }),
      );
  }

  #revealNewLines(): void {
    const lineKeys = this.#lineKeysInCart();
    const newLineKeys = [...lineKeys].filter(key => !this.#knownLineKeys.has(key));
    this.#knownLineKeys = lineKeys;
    if (!this.stickyPanel() || newLineKeys.length === 0) {
      return;
    }
    afterNextRender(() => this.#scrollLinesIntoView(newLineKeys), { injector: this.#injector });
  }

  #scrollLinesIntoView(lineKeys: string[]): void {
    const panel = this.cartPanel()?.nativeElement;
    if (!panel) {
      return;
    }
    const lineRects = Array.from(panel.querySelectorAll<HTMLElement>('[data-cart-line-key]'))
      .filter(line => lineKeys.includes(line.dataset['cartLineKey'] ?? ''))
      .map(line => line.getBoundingClientRect());
    if (lineRects.length === 0) {
      return;
    }
    const linesTop = Math.min(...lineRects.map(rect => rect.top));
    const linesBottom = Math.max(...lineRects.map(rect => rect.bottom));
    const panelRect = panel.getBoundingClientRect();
    const visibleTop = panelRect.top + (panel.querySelector<HTMLElement>(':scope > .header')?.offsetHeight ?? 0);
    const visibleBottom = panelRect.bottom - (panel.querySelector<HTMLElement>('.price-summary')?.offsetHeight ?? 0);
    if (linesTop < visibleTop) {
      panel.scrollTop -= visibleTop - linesTop;
    } else if (linesBottom > visibleBottom) {
      panel.scrollTop += Math.min(linesBottom - visibleBottom, linesTop - visibleTop);
    }
  }

  #lineKey(datetimeKey: string, sessionId: number): string {
    return `${datetimeKey}|${sessionId}`;
  }

  #splitProductAndSessionItems(cart: Cart | null): void {
    if (cart === null) {
      return;
    }
    const productItems: CartSession[] = [];
    const sessionItemsByDatetime: Map<string, CartSession[]> = new Map<string, CartSession[]>();
    cart.sessionItemsByDatetime.forEach((cartSessions: CartSession[], datetime: string) => {
      cartSessions.forEach((cartSession: CartSession) => {
        if (cartSession.sessionType?.isShopProduct) {
          productItems.push(cartSession);
          return;
        }
        if (!sessionItemsByDatetime.has(datetime)) {
          sessionItemsByDatetime.set(datetime, [cartSession]);
          return;
        }
        sessionItemsByDatetime.get(datetime)?.push(cartSession);
      });
    });
    this.productItems.set(productItems);
    this.sessionItemsByDatetime.set(sessionItemsByDatetime);
  }
}
