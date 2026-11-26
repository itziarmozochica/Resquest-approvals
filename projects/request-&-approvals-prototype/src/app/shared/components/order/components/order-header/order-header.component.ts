import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  EventEmitter,
  inject,
  input,
  Input,
  Output,
  signal,
  untracked,
  WritableSignal,
} from '@angular/core';

import { OrderPartialRefundFlowService } from '@fz-original/app/modules/partial-refunds/order-partial-refund/services/order-partial-refund-flow.service';
import { CashReceiptComponent } from '@fz-original/app/modules/validation/containers/cash-receipt/cash-receipt.component';
import { ValidationCashReceiptComponentDialogData } from '@fz-original/app/modules/validation/models/validation-cash-receipt.model';
import { CashReceiptService } from '@fz-original/app/modules/validation/services/cash-receipt/cash-receipt.service';
import { OrderAction } from '@fz-original/app/shared/enums/order-action.enum';
import { OrderActionEvent } from '@fz-original/app/shared/models/order/order-action.model';
import { OrderChannelType } from '@fz-original/app/shared/models/order/order-channel-type.model';
import { AgreementGateService } from '@fz-original/app/shared/services/distributor/agreement-gate.service';
import { AGREEMENT_CANCEL_ORDER_PERMISSION } from '@fz-original/app/shared/services/distributor/agreement-permissions';
import { DistributorTargetService } from '@fz-original/app/shared/services/distributor/distributor-target.service';
import { Channel } from '@fz-original/app/shared/services/session-availability/channel.enum';
import { ChannelService } from '@fz-original/app/shared/services/session-availability/channel.service';
import { assetBasedPermissions } from '@fz-original/app/shared/services/user/asset-based-permissions.constants';
import { hasAnyPermission } from '@fz-original/app/shared/services/user/fundraising-permissions.constants';
import {
  getOrderStatusSentiment,
  getOrderStatusVariant,
  isCancelledByCoverGeniusOrderStatus,
} from '@fz-original/app/shared/utils/order-status.util';
import { TicketSelectionState } from '@fz-original/app/shared/utils/ticket-selection-state';
import { IgntDialogService } from '@ignite/common';
import { IgntButtonDropdownOption } from '@ignite/legacy/components/ignt-button-dropdown/ignt-button-dropdown.component';
import type { TagSentiment, TagVariant } from '@ignite/legacy/components/ignt-tag/ignt-tag.component';
import { TranslateService } from '@ngx-translate/core';

import { OnsiteSetupsStorageService } from '../../../../../modules/box-office/shared/services/onsite-setups/onsite-setups-storage.service';
import { PaymentConfigStorageService } from '../../../../../modules/box-office/shared/services/payment/payment-config-storage.service';
import { canPrintOnAdyenTerminal } from '../../../../../modules/box-office/shared/utils/adyen-terminal-printing.util';
import { ProformaInvoiceService } from '../../../../../modules/reservation/proforma-invoice/services/proforma-invoice.service';
import { ValidationStatus } from '../../../../../modules/validation/enums/validation-status.enum';
import { ticketTypeIdsOf } from '../../../../cart/utils/ticket-type-ids.util';
import { CartSession } from '../../../../models/cart/cart-session.model';
import { AccessTicket } from '../../../../models/order/access-ticket.model';
import { Order } from '../../../../models/order/order.model';
import { isCancellationInsuranceSessionType, isTransactionFeeSessionType } from '../../../../models/session-type/session-type.util';
import { FeatureFlags } from '../../../../optimizely/feature-flags';
import { OptimizelyService } from '../../../../optimizely/optimizely.service';
import { UserService } from '../../../../services/user/user.service';
import { BookingTagTarget } from '../../../../tags/models/tag.model';
import { canAccessBookingTags } from '../../../../tags/utils/booking-tags-access.util';
import { OrderValidatedCount } from '../../models/order-validated-count.model';
import { reservationIdOf } from '../../utils/order-reservation.util';
import { isValidatableAccessTicket } from '../../utils/pending-validation.util';
import { getTicketProtectionAccessTicketIds } from '../../utils/ticket-protection.util';
import { LabelType } from '../validation-label/validation-label.component';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-order-header',
  standalone: false,
  styleUrl: './order-header.component.scss',
  templateUrl: './order-header.component.html',
})
export class OrderHeaderComponent {
  readonly #cashReceiptService = inject(CashReceiptService);
  readonly #dialogService = inject(IgntDialogService);
  readonly #optimizelyService = inject(OptimizelyService);
  readonly #orderPartialRefundFlowService = inject(OrderPartialRefundFlowService);
  activeTabOrder = input<Order | undefined>(undefined);
  cancellationPartnerId = input<number | undefined>(undefined);
  hasGroupedOrders = input(false);
  hiddenReschedule = input(false);
  isEntitlementOrder = input(false);
  readonly isValidatingAll = input(false);
  orderHistoryRecordsCount = input<number | null>(null);
  orderPartnerId = input<number | undefined>(undefined);
  planNamesDisplay = input<string | null>(null);
  rescheduleEvaluationOrder = input<Order>();
  readonly showExternalReservationId = input(false);
  readonly showTags = input(false);
  readonly showValidatedCount = input(true);
  readonly ticketSelection = input<TicketSelectionState | undefined>(undefined);
  viewOrder = input<Order>();
  readonly #sessionSourceOrder = computed(() => this.activeTabOrder() ?? this.viewOrder());
  #isOrderActive = computed(() => this.#sessionSourceOrder()?.status === 'active');
  readonly #orderSessions = computed(() => {
    const sessionsMap: Map<string, CartSession[]> | undefined = this.#sessionSourceOrder()?.cart?.sessionItemsByDatetime;
    const allSessions = sessionsMap ? Array.from(sessionsMap.values()).flat() : [];

    return allSessions;
  });
  readonly #countableSessions = computed(() =>
    this.#orderSessions().filter(
      session => !isTransactionFeeSessionType(session.sessionType) && !isCancellationInsuranceSessionType(session.sessionType),
    ),
  );
  readonly #countableAccessTickets = computed(() => {
    const ticketProtectionAccessTicketIds = getTicketProtectionAccessTicketIds(this.#orderSessions());

    return Array.from(this.#sessionSourceOrder()?.accessTickets?.entries() ?? [])
      .filter(([id, accessTicket]) => !accessTicket.isTransactionFee && !ticketProtectionAccessTicketIds.has(id))
      .map(([, accessTicket]) => accessTicket);
  });
  readonly #validatableAccessTickets = computed<AccessTicket[]>(() => this.#countableAccessTickets().filter(isValidatableAccessTicket));
  readonly validatedCount = computed<OrderValidatedCount>(() => {
    const { total, validated } = this.#getTotalCounts(this.#countableSessions());
    const cancelledTickets = this.#countableAccessTickets().filter(ticket => ticket.status === ValidationStatus.CANCELLED).length;

    return { total: total - cancelledTickets, validated };
  });
  protected readonly selectableTicketCount = computed<number>(() => this.ticketSelection()?.selectableKeys().size ?? 0);
  protected readonly selectedTicketCount = computed<number>(() => this.ticketSelection()?.selectedCount() ?? 0);
  protected readonly isNoTicketSelected = computed<boolean>(() => this.ticketSelection()?.isNoneSelected() ?? false);
  protected readonly validateAllTotal = computed<number>(() =>
    this.ticketSelection() ? this.selectableTicketCount() : this.#validatableAccessTickets().length,
  );
  protected readonly validateAllSelectedCount = computed<number>(() =>
    this.ticketSelection() ? this.selectedTicketCount() : this.#validatableAccessTickets().length,
  );
  protected readonly shouldShowValidateAllButton = computed<boolean>(
    () => this.#isOrderActive() && !this.isEntitlementOrder() && this.validateAllTotal() > 0,
  );
  readonly #onsiteSetupsStorageService = inject(OnsiteSetupsStorageService);
  readonly #paymentConfigStorageService = inject(PaymentConfigStorageService);
  readonly #proformaInvoice = inject(ProformaInvoiceService);
  readonly #translateService = inject(TranslateService);
  readonly #userService = inject(UserService);
  readonly #agreementGate = inject(AgreementGateService);
  readonly #distributorTarget = inject(DistributorTargetService);
  @Output() action = new EventEmitter<OrderActionEvent>();
  @Input() channelType: OrderChannelType | undefined = undefined;
  hasAddTicketsEnabled = computed<boolean>(
    () => this.#isCancelOrderEnabled(this.#sessionSourceOrder()?.planId) && this.#userService.hasPermission('can_view_box_office'),
  );
  hasCancellationEnabled = computed<boolean>(() => this.#isCancelOrderEnabled(this.#sessionSourceOrder()?.planId));
  protected readonly isCancellationBlockedByPendingModification = computed<boolean>(
    () => (this.#sessionSourceOrder()?.pendingModification ?? this.viewOrder()?.pendingModification ?? null) !== null,
  );
  protected readonly isCancelledByCoverGenius = computed<boolean>(() =>
    isCancelledByCoverGeniusOrderStatus(this.#sessionSourceOrder()?.status),
  );
  protected readonly orderStatusSentiment = computed<TagSentiment>(() => getOrderStatusSentiment(this.#sessionSourceOrder()?.status));
  protected readonly orderStatusVariant = computed<TagVariant>(() => getOrderStatusVariant(this.#sessionSourceOrder()?.status));
  protected readonly ticketTypeIds = computed<readonly number[]>(() => ticketTypeIdsOf(this.viewOrder()?.cart));
  protected readonly tagsTarget = computed<BookingTagTarget | null>(() => {
    const orderId = this.viewOrder()?.id;

    return this.showTags() && orderId !== undefined ? { orderId } : null;
  });
  hasReassignEnabled: boolean =
    this.#optimizelyService.isFeatureEnabled({ optimizelyFeatureKey: FeatureFlags.REASSIGN_SEATS_FROM_ORDERS, team: 'b2b-onsite' }) ??
    false;
  hasPrintReceiptEnabled = false;
  @Input({ required: true }) hasReschedule!: boolean;
  hasRescheduleEnabled = computed<boolean>(() => this.#isCancelOrderEnabled(this.#sessionSourceOrder()?.planId));
  @Input() hiddenCancellation = false;
  @Input() hiddenValidation = false;
  @Output() isCollapsed = new EventEmitter<boolean>();
  @Output() navigateToBoxOfficeUpgrade = new EventEmitter<void>();
  isCollapsedValue = false;
  isGettingDeliveryNote = false;
  isGettingPartySummary = false;
  isMobilePos: boolean = this.#paymentConfigStorageService.isMobilePos();
  isPartialRefundInProgress = false;
  isPrinting = false;
  isPrintingAdyenTicket = false;
  isPrintingReceipt = false;
  isReschedule = false;
  orderHasDiscounts = computed<boolean>(() => !!this.#sessionSourceOrder()?.cart?.coupons?.discounts?.length);
  rescheduleLabel: LabelType | null = null;
  shouldShowDeliveryNoteButton = computed<boolean>(() => this.#isOrderActive() && !!this.#sessionSourceOrder()?.reservationId);
  shouldShowPartySummaryButton = computed<boolean>(() => {
    const order = this.#sessionSourceOrder();
    if (reservationIdOf(order) !== null) {
      return true;
    }

    return (
      order?.hasPartySummary === true &&
      !this.#userService.isBusiness() &&
      !this.#distributorTarget.isDistributorSession() &&
      this.#userService.hasPermission('can_view_reservations')
    );
  });
  shouldShowDownloadDropdown = computed<boolean>(() => this.shouldShowDeliveryNoteButton() || this.shouldShowPartySummaryButton());
  downloadOptions = computed<IgntButtonDropdownOption<'delivery_note' | 'party_summary'>[]>(() => {
    const options: IgntButtonDropdownOption<'delivery_note' | 'party_summary'>[] = [];
    if (this.shouldShowDeliveryNoteButton()) {
      options.push({
        label: this.#translateService.instant(
          this.#usesProformaInvoice() ? 'reservations.proformaInvoice.label' : 'validateTicketsNew.orderHeader.deliveryNote',
        ),
        leadingIcon: ['fal', 'file-pdf'],
        value: 'delivery_note',
      });
    }
    if (this.shouldShowPartySummaryButton()) {
      options.push({
        label: this.#translateService.instant('reservations.partySummary'),
        leadingIcon: ['fal', 'file-pdf'],
        value: 'party_summary',
      });
    }
    return options;
  });
  shouldShowOrderHistoryButton = computed<boolean>(() => {
    const orderHistoryRecordsCount = this.orderHistoryRecordsCount();
    return (orderHistoryRecordsCount ?? this.viewOrder()?.userCancellationRecords?.length ?? 0) > 0;
  });
  shouldShowPartialRefundButton = computed<boolean>(() =>
    this.#orderPartialRefundFlowService.isEnabledForOrder(this.#sessionSourceOrder()),
  );
  shouldShowPrintOrderButton = computed<boolean>(() => this.#isOrderActive() && !this.hasPrintOrderDisabled && !this.isMobilePos);
  targetRescheduleOrderNavigationIds = computed<number[]>(() => {
    const order = this.#sessionSourceOrder();
    if (!order?.targetRescheduleOrderIds?.length) {
      return [];
    }
    return [...order.targetRescheduleOrderIds];
  });
  rescheduleSourceOrderId = computed<number | undefined>(() => this.#sessionSourceOrder()?.sourceRescheduleOrderId);
  hasRescheduleNavigation = computed<boolean>(
    () => Boolean(this.rescheduleSourceOrderId()) || this.targetRescheduleOrderNavigationIds().length > 0,
  );
  shouldShowResendOrderButton = computed<boolean>(
    () =>
      this.#isOrderActive() && this.#userService.hasPermission('can_resend_purchase_confirmation_email') && this.#hasResendableTickets(),
  );
  protected readonly viewCalendarPermissions = assetBasedPermissions.calendar;

  shouldShowViewCalendarButton = computed<boolean>(
    () =>
      hasAnyPermission(this.#userService, assetBasedPermissions.calendar) &&
      this.#sessionSourceOrder()?.hasAssetBasedBooking === true &&
      this.#sessionSourceOrder()?.cart?.id != null,
  );
  @Output() showDetails = new EventEmitter<void>();
  @Input() showPrintReceipt = false;
  @Input() isEpsonReceiptPrinter = false;
  @Input() isFiscalReprintEnabled = false;
  @Input() isReprintingFiscalReceipt = false;
  viewCartSession: WritableSignal<CartSession | undefined> = signal<CartSession | undefined>(undefined);
  constructor() {
    effect(() => {
      this.viewOrder();
      this.activeTabOrder();
      untracked(() => {
        this.#updateView();
      });
    });

    effect(() => {
      const partnerOrganizationId = this.cancellationPartnerId();
      if (partnerOrganizationId === undefined || !this.#distributorTarget.isDistributorSession()) {
        return;
      }
      this.#agreementGate.askAbout(partnerOrganizationId);
    });
  }
  @Input() set actionResolved(value: OrderActionEvent | undefined) {
    if (value != null) {
      this.#updateActionResolved(value);
    }
  }
  orderExternalId = computed<string | undefined>(() => this.#sessionSourceOrder()?.externalId);
  planName = computed(() => {
    const tabPlanName = this.activeTabOrder()?.effectivePlanName;
    if (tabPlanName != null) {
      return tabPlanName;
    }

    const groupedPlanNames = this.planNamesDisplay();
    if (groupedPlanNames) {
      return groupedPlanNames;
    }

    return this.viewOrder()?.effectivePlanName ?? null;
  });

  addTickets(): void {
    this.action.emit({
      action: OrderAction.ADD_TICKETS,
    });
  }

  canCancel(): boolean {
    if (this.#distributorTarget.isDistributorSession()) {
      return this.#distributorGrantsCancelOrder() && this.#hasResellerCancellationFlag();
    }
    if (this.#userService.hasPermission('can_cancel_orders')) {
      return true;
    }
    return this.#userService.hasPermission('can_cancel_my_orders') && this.#hasResellerCancellationFlag();
  }

  cancelOrder(): void {
    if (this.isCancellationBlockedByPendingModification()) {
      return;
    }
    this.action.emit({
      action: OrderAction.CANCEL_ORDER,
    });
  }
  clickCashReceipt(): void {
    const cashReceiptComponentDialogData: ValidationCashReceiptComponentDialogData = {
      orderId: this.#sessionSourceOrder()?.id ?? Number.NaN,
      orderPartnerId: this.orderPartnerId(),
    };
    this.#dialogService.openModal(CashReceiptComponent, {
      data: cashReceiptComponentDialogData,
    });
  }

  clickOnPrintAdyenTicket(): void {
    this.isPrintingAdyenTicket = true;
    this.action.emit({ action: OrderAction.PRINT_ADYEN_TICKET });
  }

  getDeliveryNote(): void {
    this.isGettingDeliveryNote = true;
    this.action.emit({
      action: OrderAction.GET_DELIVERY_NOTE,
    });
  }

  getPartySummary(): void {
    this.isGettingPartySummary = true;
    this.action.emit({
      action: OrderAction.GET_PARTY_SUMMARY,
    });
  }

  goToOrder(orderId: number): void {
    this.action.emit({
      action: OrderAction.NAVIGATE_TO_ORDER,
      data: {
        orderId: orderId,
      },
    });
  }

  get hasPrintOrderDisabled(): boolean {
    return (
      this.#optimizelyService.isFeatureEnabled('do_not_print_tickets_after_selling') ||
      !this.#userService.hasPermission('can_reprint') ||
      !this.#hasTickets()
    );
  }

  isRescheduleAllowedForChannelType(): boolean {
    const allowedChannelTypes: OrderChannelType[] = [OrderChannelType.INVITATION];
    return this.channelType !== undefined ? allowedChannelTypes.includes(this.channelType) : false;
  }

  onDownloadOptionClick(value: 'delivery_note' | 'party_summary'): void {
    if (value === 'delivery_note') {
      this.getDeliveryNote();
    } else {
      this.getPartySummary();
    }
  }

  openOrderHistory(): void {
    this.action.emit({
      action: OrderAction.ORDER_HISTORY,
    });
  }

  partialRefund(): void {
    this.isPartialRefundInProgress = true;
    this.action.emit({ action: OrderAction.PARTIAL_REFUND });
  }

  printOrder(): void {
    this.isPrinting = true;
    this.action.emit({
      action: OrderAction.PRINT_ORDER,
    });
  }

  printReceipt(): void {
    this.isPrintingReceipt = true;
    this.action.emit({
      action: OrderAction.PRINT_RECEIPT,
    });
  }

  reassignSeats(): void {
    this.action.emit({
      action: OrderAction.REASSIGN_SEATS,
    });
  }

  rescheduleOrder(): void {
    const evaluationOrder = this.#getRescheduleEvaluationOrder();
    const hasCancelledCodes = this.#hasCancelledCodesForOrder(evaluationOrder);
    const hasSeating = evaluationOrder?.cart?.hasSeating ?? false;

    if (hasCancelledCodes && hasSeating && this.#isFixedPriceUpgradeEnabled()) {
      // Navigate to box office upgrade flow
      this.navigateToBoxOfficeUpgrade.emit();
    } else {
      // Existing reschedule logic
      this.action.emit({
        action: OrderAction.RESCHEDULE_ORDER,
      });
    }
  }

  resendOrder(): void {
    this.action.emit({
      action: OrderAction.RESEND_ORDER,
    });
  }

  shouldShowAddTicketsButton(): boolean {
    return (
      this.viewCartSession()?.status === 'active' &&
      !this.viewCartSession()?.isExpired &&
      !this.viewCartSession()?.isGuest &&
      this.hasAddTicketsEnabled()
    );
  }

  shouldShowCancellationButton(): boolean {
    return this.#isOrderActive() && this.hasCancellationEnabled();
  }

  shouldShowCashReceiptButton(): boolean {
    return this.#cashReceiptService.isAvailable(this.#sessionSourceOrder()?.planId ?? -1);
  }

  shouldShowPrintReceiptButton(): boolean {
    if (this.isFiscalReprintEnabled) {
      return !this.#userService.isBusiness();
    }
    // Epson-only setups (even legacy orders without Adyen terminal config) must show the receipt button.
    if (this.isEpsonReceiptPrinter) {
      return !this.#userService.isBusiness();
    }
    const paymentConfiguration = this.#paymentConfigStorageService.getConfiguration();
    return (
      !this.#userService.isBusiness() &&
      Boolean(paymentConfiguration?.deviceId) &&
      canPrintOnAdyenTerminal(paymentConfiguration, this.#onsiteSetupsStorageService.getConfiguration())
    );
  }

  shouldShowReassignButton(): boolean {
    return this.#isOrderActive() && this.hasReassignEnabled && this.#orderSessions().some(session => !!session.seats?.length);
  }

  shouldShowRescheduleButton(): boolean {
    const evaluationOrder = this.#getRescheduleEvaluationOrder();
    const evaluationCartSession = this.#getFirstNotTransferredCartSession(this.#countableSessionsForOrder(evaluationOrder));
    const hasCancelledCodes = this.#hasCancelledCodesForOrder(evaluationOrder);
    const hasSeating = evaluationOrder?.cart?.hasSeating ?? false;

    // Special case: Allow reschedule for cancelled codes + seating + feature flag
    if (hasCancelledCodes && hasSeating && this.#isFixedPriceUpgradeEnabled()) {
      const channel: Channel = evaluationOrder?.channelId as Channel;
      return (
        evaluationCartSession?.status === ValidationStatus.ACTIVE &&
        !ChannelService.isInvitation(channel) &&
        this.#isCancelOrderEnabled(evaluationOrder?.planId) &&
        !this.isRescheduleAllowedForChannelType()
      );
    }

    // Original logic for other cases
    const hasInactiveTickets = this.#hasInactiveTicketsForOrder(evaluationOrder);
    const channel: Channel = evaluationOrder?.channelId as Channel;
    return (
      evaluationCartSession?.status === ValidationStatus.ACTIVE &&
      !ChannelService.isInvitation(channel) &&
      this.#isCancelOrderEnabled(evaluationOrder?.planId) &&
      !hasInactiveTickets &&
      !this.isRescheduleAllowedForChannelType()
    );
  }

  toggleIsCollapsed(eventValue: boolean): void {
    this.isCollapsed.emit(eventValue);
  }

  validateAll(): void {
    if (this.isValidatingAll() || this.validateAllSelectedCount() === 0) {
      return;
    }

    this.action.emit({
      action: OrderAction.VALIDATE_ALL,
    });
  }

  viewCalendar(): void {
    const cartId = this.#sessionSourceOrder()?.cart?.id;
    if (cartId == null) {
      return;
    }

    this.action.emit({
      action: OrderAction.VIEW_CALENDAR,
      data: { cartId },
    });
  }

  protected hasBookingTagsAccess(): boolean {
    return canAccessBookingTags(this.#optimizelyService, this.#userService);
  }

  #countableAccessTicketsForOrder(order: Order | undefined): AccessTicket[] {
    return Array.from(order?.accessTickets?.values() ?? []).filter(accessTicket => !accessTicket.isTransactionFee);
  }

  #countableSessionsForOrder(order: Order | undefined): CartSession[] {
    const sessionsMap: Map<string, CartSession[]> | undefined = order?.cart?.sessionItemsByDatetime;
    const allSessions = sessionsMap ? Array.from(sessionsMap.values()).flat() : [];

    return allSessions.filter(session => !isTransactionFeeSessionType(session.sessionType));
  }

  #distributorGrantsCancelOrder(): boolean {
    return this.#agreementGate.grantsFor(this.cancellationPartnerId(), AGREEMENT_CANCEL_ORDER_PERMISSION);
  }

  #getFirstNotTransferredCartSession(allSessions: Array<CartSession>): CartSession | undefined {
    return allSessions.find(session => session.getTransfer() === undefined);
  }

  #getRescheduleEvaluationOrder(): Order | undefined {
    return this.rescheduleEvaluationOrder() ?? this.viewOrder();
  }

  #getRescheduleLabel(): LabelType | null {
    const hasSource = Boolean(this.rescheduleSourceOrderId());
    const hasTarget = this.targetRescheduleOrderNavigationIds().length > 0;

    if (hasSource && hasTarget) {
      return 'reschedule-transition';
    }
    if (hasSource) {
      return 'reschedule-new';
    }
    if (hasTarget) {
      return 'reschedule-original';
    }

    return null;
  }

  #getTotalCounts(sessions: Array<CartSession>): { total: number; validated: number } {
    return sessions.reduce(
      (previous, session) => ({
        total: previous.total + (session.accessTicketIds?.length ?? 0),
        validated: previous.validated + (session.validatedCount ?? 0),
      }),
      { total: 0, validated: 0 },
    );
  }

  #hasCancelledCodesForOrder(order: Order | undefined): boolean {
    return this.#countableAccessTicketsForOrder(order).some(ticket => ticket.status === ValidationStatus.CANCELLED);
  }

  #hasInactiveTicketsForOrder(order: Order | undefined): boolean {
    return this.#countableAccessTicketsForOrder(order).some(ticket => ticket.status !== ValidationStatus.ACTIVE);
  }

  #hasResellerCancellationFlag(): boolean {
    return this.#optimizelyService.isFeatureEnabled(FeatureFlags.RESELLER_ORDER_CANCELLATION) ?? false;
  }

  #hasResendableTickets(): boolean {
    if (!this.#hasTickets()) {
      return false;
    }
    return this.#countableSessions().some(session => this.#isResendableSession(session));
  }

  #hasTickets(): boolean {
    const order = this.#sessionSourceOrder();
    return !!(order?.accessTickets && order.accessTickets.size > 0);
  }

  #isCancelOrderEnabled(planId: number | undefined): boolean {
    if (planId == null) {
      return this.#optimizelyService.isFeatureEnabled('cancel_order') ?? false;
    }

    return (
      this.#optimizelyService.isFeatureEnabled('cancel_order', {
        plan_id: planId.toString(),
      }) ?? false
    );
  }

  #isFixedPriceUpgradeEnabled(): boolean {
    return (
      this.#optimizelyService.isFeatureEnabled({
        optimizelyFeatureKey: FeatureFlags.MODIFY_ORDER_WITH_SEATING_THROUGH_NEW_POS,
        team: 'b2b-shops',
      }) ?? false
    );
  }

  #isResendableSession(session: CartSession): boolean {
    return !session.isExpired && !session.hasBeenFullyTransferred() && session.getTransfer() === undefined;
  }

  #updateActionResolved(orderAction: OrderActionEvent) {
    switch (orderAction.action) {
      case OrderAction.PRINT_ADYEN_TICKET:
        this.isPrintingAdyenTicket = false;
        break;
      case OrderAction.PRINT_ORDER:
        this.isPrinting = false;
        break;
      case OrderAction.PRINT_RECEIPT:
        this.isPrintingReceipt = false;
        break;
      case OrderAction.GET_DELIVERY_NOTE:
        this.isGettingDeliveryNote = false;
        break;
      case OrderAction.GET_PARTY_SUMMARY:
        this.isGettingPartySummary = false;
        break;
      case OrderAction.PARTIAL_REFUND:
        this.isPartialRefundInProgress = false;
        break;
    }
  }

  #updateView() {
    this.viewCartSession.set(this.#getFirstNotTransferredCartSession(this.#countableSessions()));
    this.rescheduleLabel = this.#getRescheduleLabel();
  }

  #usesProformaInvoice(): boolean {
    const reservationId = this.#sessionSourceOrder()?.reservationId;
    return !!reservationId && !this.#userService.isBusiness() && this.#proformaInvoice.isAvailableFor(reservationId);
  }
}
