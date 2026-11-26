import { Dialog } from '@angular/cdk/dialog';
import {
  ChangeDetectorRef,
  Component,
  computed,
  DestroyRef,
  ElementRef,
  EventEmitter,
  inject,
  Inject,
  input,
  Input,
  OnChanges,
  OnDestroy,
  OnInit,
  Output,
  QueryList,
  signal,
  SimpleChanges,
  TemplateRef,
  viewChild,
  ViewChild,
  ViewChildren,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NavigationExtras, Router } from '@angular/router';

import { AssetBasedCalendarNavigateService } from '@fz-original/app/modules/asset-based/asset-based-calendar-view/services/asset-based-calendar-navigate.service';
import {
  getPrintableOrdersFromCart,
  hasGroupedOrderIds,
  toPrintableOrderByGroupKind,
} from '@fz-original/app/modules/box-office/purchased-cart/prepare-orders-for-print.util';
import { InvitationService } from '@fz-original/app/modules/invitations/shared/services/invitation.service';
import { OrderPartialRefundFlowService } from '@fz-original/app/modules/partial-refunds/order-partial-refund/services/order-partial-refund-flow.service';
import { buildNotePayload } from '@fz-original/app/shared/components/notes/note-history.util';
import { noteAction, NoteActionEvent } from '@fz-original/app/shared/components/notes/notes.component';
import { OrderAction } from '@fz-original/app/shared/enums/order-action.enum';
import { OrderActionEvent } from '@fz-original/app/shared/models/order/order-action.model';
import { OrderChannelType } from '@fz-original/app/shared/models/order/order-channel-type.model';
import { DownloadFilesService } from '@fz-original/app/shared/services/download/download-files.service';
import { IgntDialogService } from '@ignite/common';
import { AlertSentiment } from '@ignite/legacy/components/ignt-alert/ignt-alert.component';
import { NgbModal, NgbModalRef } from '@ng-bootstrap/ng-bootstrap';
import { TranslateService } from '@ngx-translate/core';
import { BehaviorSubject, EMPTY, from, merge, Observable, of, Subject, throwError, timer } from 'rxjs';
import { catchError, concatMap, filter, finalize, map, mergeMap, switchMap, take, takeUntil, tap, toArray } from 'rxjs/operators';

import { ClickConfirmUnvalidationEvent } from '../../../../../core/tracking/core/events/click-confirm-unvalidation';
import { ClickGetDeliveryNoteData, ClickGetDeliveryNoteEvent } from '../../../../../core/tracking/core/events/click-get-delivery-note';
import { ClickGetPartySummaryData, ClickGetPartySummaryEvent } from '../../../../../core/tracking/core/events/click-get-party-summary';
import { ClickSplitPackEvent } from '../../../../../core/tracking/core/events/click-split-pack';
import { ClickUnvalidateCtaEvent } from '../../../../../core/tracking/core/events/click-unvalidate-cta';
import { CreateOrderNoteEvent } from '../../../../../core/tracking/core/events/create-order-note';
import { DeleteOrderNoteEvent } from '../../../../../core/tracking/core/events/delete-order-note';
import { EditOrderNoteEvent } from '../../../../../core/tracking/core/events/edit-order-note';
import { OpenReassignTicketSeatingEvent } from '../../../../../core/tracking/core/events/open-reassign-ticket-seating';
import { ViewOrderHistoryEvent } from '../../../../../core/tracking/core/events/view-order-history';
import { TrackingService } from '../../../../../core/tracking/tracking.service';
import { FranceFiscalDuplicateReasonPopupComponent } from '../../../../../modules/box-office/shared/components/france-fiscal-duplicate-reason-popup/france-fiscal-duplicate-reason-popup.component';
import { OboPrinterTypeEnum, OnsiteSetup } from '../../../../../modules/box-office/shared/models/onsite-setup';
import type { AdyenPrinterService } from '../../../../../modules/box-office/shared/services/adyen-printer/adyen-printer.service';
import { AdyenPrinterNotAcceptableConditionsError } from '../../../../../modules/box-office/shared/services/adyen-printer/errors/adyen-printer-not-acceptable-conditions.error';
import { AdyenPrinterRejectedError } from '../../../../../modules/box-office/shared/services/adyen-printer/errors/adyen-printer-rejected.error';
import { AdyenPrinterTimeoutError } from '../../../../../modules/box-office/shared/services/adyen-printer/errors/adyen-printer-timeout.error';
import { isFiscalReprintEnabled } from '../../../../../modules/box-office/shared/services/efsta-fiscal/efsta-fiscal.util';
import type { EfstaReprintResult } from '../../../../../modules/box-office/shared/services/efsta-fiscal/efsta-reprint.service';
import { resolveFiscalReprintVariant } from '../../../../../modules/box-office/shared/services/efsta-fiscal/fiscal-country-profile.util';
import { isOrderWithoutTillSale } from '../../../../../modules/box-office/shared/services/efsta-fiscal/fiscal-sale-chain.util';
import type { EpsonReceiptService } from '../../../../../modules/box-office/shared/services/epson-receipt/epson-receipt.service';
import { OnsiteSetupsStorageService } from '../../../../../modules/box-office/shared/services/onsite-setups/onsite-setups-storage.service';
import { OrderPrintingService } from '../../../../../modules/box-office/shared/services/order-printing/order-printing.service';
import { PaymentConfiguration } from '../../../../../modules/box-office/shared/services/payment-configuration.model';
import { PaymentConfigStorageService } from '../../../../../modules/box-office/shared/services/payment/payment-config-storage.service';
import { canPrintOnAdyenTerminal } from '../../../../../modules/box-office/shared/utils/adyen-terminal-printing.util';
import { OnsiteSetupModalComponent } from '../../../../../modules/box-office/ticketing/components/onsite-setup-modal/onsite-setup-modal.component';
import { SplitPackService } from '../../../../../modules/cancellation/services/split-pack/split-pack.service';
import { FiscalTag, PrinterDocumentType } from '../../../../../modules/kiosk/services/printer/models/printer-instruction.model';
import { ClickGetDeliveryNoteSourceEnum } from '../../../../../modules/reservation/models/click-get-delivery-note-source.enum';
import { ReservationStatus } from '../../../../../modules/reservation/models/reservation-status.enum';
import { ProformaInvoiceService } from '../../../../../modules/reservation/proforma-invoice/services/proforma-invoice.service';
import { ReservationsService } from '../../../../../modules/reservation/services/reservations.service';
import { ValidationStatus } from '../../../../../modules/validation/enums/validation-status.enum';
import { UnvalidateCodesResponseData } from '../../../../../modules/validation/models/unvalidate-codes-response.model';
import { ValidationResponse, ValidationResponseWarning } from '../../../../../modules/validation/models/validation-response.model';
import { ERROR_CODES } from '../../../../../modules/validation/services/access-control/access-control.constants';
import { AccessControlService } from '../../../../../modules/validation/services/access-control/access-control.service';
import { ScrollAndHighlightService } from '../../../../../modules/validation/services/scroll-and-highlight/scroll-and-highlight.service';
import { SpinnerService } from '../../../../layout/spinner/spinner.service';
import { AccessControlProfile } from '../../../../models/access-control/access-control.model';
import { BookingAnswer } from '../../../../models/booking-questions/booking-answer.model';
import { CartSession } from '../../../../models/cart/cart-session.model';
import { Cart } from '../../../../models/cart/cart.model';
import { Journey } from '../../../../models/journey/journey.model';
import { hasOrderReleaseConditions } from '../../../../models/order/order-agreement-gate.util';
import { OrderUserCancellationRecord } from '../../../../models/order/order-cancellation-record.model';
import { isEntitlementGroupOrder } from '../../../../models/order/order-group-kind.util';
import { Order } from '../../../../models/order/order.model';
import { isTransactionFeeSessionType } from '../../../../models/session-type/session-type.util';
import { FeatureFlags } from '../../../../optimizely/feature-flags';
import { OptimizelyService } from '../../../../optimizely/optimizely.service';
import { ForwardOrderPurchaseConfirmationService } from '../../../../services/order/forward-order-purchase-confirmation/forward-order-purchase-confirmation.service';
import { OrderNotesService } from '../../../../services/order/order-notes/order-notes.service';
import { SetOrderNoteQuery } from '../../../../services/order/order-notes/set-order-note-query';
import { OrderPartySummaryService } from '../../../../services/order/order-party-summary/order-party-summary.service';
import { PurchaseConfirmationResendService } from '../../../../services/order/purchase-confirmation-resend/purchase-confirmation-resend';
import { PURCHASE_CONFIRMATION_RESEND_SERVICE } from '../../../../services/order/purchase-confirmation-resend/purchase-confirmation-resend.token';
import { SendWalletPassesService } from '../../../../services/order/send-wallet-passes/send-wallet-passes.service';
import { PartnerService } from '../../../../services/partner/partner.service';
import {
  PrintDocumentType,
  PrintEntryPoint,
  PrintPrinterType,
  toPrintDocumentType,
} from '../../../../services/print-facade/print-facade.enums';
import { PrintFacadeService } from '../../../../services/print-facade/print-facade.service';
import { PurchaseService } from '../../../../services/purchase/purchase.service';
import { ToastService } from '../../../../services/toast/toast.service';
import { Permissions } from '../../../../services/user/permissions';
import { UserService } from '../../../../services/user/user.service';
import { CartUtil } from '../../../../utils/cart.util';
import { isCancelledOrderStatus, showsCoveredByFeverAsInactive } from '../../../../utils/order-status.util';
import { TicketSelectionState } from '../../../../utils/ticket-selection-state';
import { ExportTypeEnum } from '../../../export-list-button/export-option.model';
import { MessageModalComponent } from '../../../message-modal/message-modal.component';
import { latestCancellationRequestedRefund } from '../../utils/order-cancellation-refund.util';
import { reservationIdOf } from '../../utils/order-reservation.util';
import { packConstituentsOf } from '../../utils/pack-constituents.util';
import { getPendingOrderValidation, getSelectedOrderValidation } from '../../utils/pending-validation.util';
import { isSessionCollapsedByDefault } from '../../utils/session-collapse.util';
import {
  filterTicketProtectionAccessTickets,
  getTicketProtectionAccessTicketIds,
  hasCodedTicketProtectionAccessTickets,
} from '../../utils/ticket-protection.util';
import { getTransactionFeeAccessTicketIds } from '../../utils/transaction-fee.util';
import { ModifyOrderStrategyModalComponent } from '../modify-order-strategy-modal/modify-order-strategy-modal.component';
import { ModifyOrderStrategyModalResult } from '../modify-order-strategy-modal/modify-order-strategy-modal.model';
import { OrderHeaderComponent } from '../order-header/order-header.component';
import { FAKE_IDS } from '../order.constants';
import { ResendOrderModalComponent } from '../resend-order-modal/resend-order-modal.component';
import { ResendOrderModalData, ResendOrderModalResult } from '../resend-order-modal/resend-order-modal.model';
import { ResendTicketsModalComponent } from '../resend-tickets-modal/resend-tickets-modal.component';
import { ResendTicketsModalData, ResendTicketsModalResult } from '../resend-tickets-modal/resend-tickets-modal.model';
import { SplitPackSelectorModalComponent } from '../split-pack-selector-modal/split-pack-selector-modal.component';
import { ValidationErrorComponent } from '../validation-fail/validation-error.component';
import { LabelType } from '../validation-label/validation-label.component';
import { ValidationProfileSelectionModalComponent } from '../validation-profile-selection-modal/validation-profile-selection-modal.component';
import {
  ValidationProfileSelectionModalData,
  ValidationProfileSelectionModalResult,
} from '../validation-profile-selection-modal/validation-profile-selection-modal.model';
import { ValidationSuccessComponent } from '../validation-success/validation-success.component';
import { getDaysLeftToSchedule } from './days-left-to-schedule.util';
import {
  buildTicketSessionGroups,
  groupAndSortSessionsByDatetime,
  OrderTicketSessionGroup,
  splitSessionsByProducts,
} from './sessions-by-datetime.util';

interface SessionWithTransfers {
  isCollapsed: boolean;
  session: CartSession;
  transfers: Array<CartSession>;
}

interface GroupedOrderTab {
  order: Order;
  productSessionsWithTransfers: SessionWithTransfers[];
  sessions: CartSession[];
  sessionsByDatetime: Map<string, SessionWithTransfers[]>;
  sessionsWithTransfers: SessionWithTransfers[];
  ticketSessionGroups: OrderTicketSessionGroup<SessionWithTransfers>[];
}

/** How long Validate all waits for a refresh to reflect a validated no-code ticket before it unlocks anyway. */
const VALIDATE_ALL_REFRESH_GRACE_MS = 5000;

@Component({
  selector: 'app-order-card',
  standalone: false,
  styleUrls: ['./order-card.component.scss', '../../styles/hightlight-animation.scss'],
  templateUrl: './order-card.component.html',
})
export class OrderCardComponent implements OnInit, OnDestroy, OnChanges {
  protected readonly FAKE_IDS = FAKE_IDS;
  protected readonly isCancelledOrderStatus = isCancelledOrderStatus;
  static readonly WHATSAPP_PURCHASE_CONFIRMATION_COUNTRY_CODE = 'IN';
  readonly #assetBasedCalendarNavigateService = inject(AssetBasedCalendarNavigateService);
  readonly #destroyRef = inject(DestroyRef);
  readonly #dialog = inject(Dialog);
  readonly #igntDialogService = inject(IgntDialogService);
  readonly #downloadFilesService = inject(DownloadFilesService);
  readonly #proformaInvoice = inject(ProformaInvoiceService);
  readonly #forwardOrderPurchaseConfirmationService = inject(ForwardOrderPurchaseConfirmationService);
  readonly #printFacadeService = inject(PrintFacadeService);
  readonly #purchaseService = inject(PurchaseService);
  readonly #orderPrintingService = inject(OrderPrintingService);
  readonly #orderPartialRefundFlowService = inject(OrderPartialRefundFlowService);
  readonly #orderPartySummaryService = inject(OrderPartySummaryService);
  readonly #sendWalletPassesService = inject(SendWalletPassesService);
  readonly #toastService = inject(ToastService);
  @Input({ required: true }) channelType!: OrderChannelType;
  @Input({ required: true }) order!: Order;
  @Input({ required: true }) searchedTicketId!: number;
  @Input({ required: true }) searchedQRCode!: string;
  @Input() cartSessions: CartSession[] = [];
  @Input() hiddenValidation = false;
  @Input() hiddenCancellation = false;
  @Input() reservationId?: string;
  @Input() businessId?: string;
  @Input() orderPartnerId?: number;
  @Input() cancellationPartnerId?: number;
  @Input() depositCart: Cart | null = null;
  @Input() showDepositRefundButton = false;
  @Input() depositReservationStatus: ReservationStatus | null = null;
  @Input() onDepositRefund: (() => Observable<boolean>) | null = null;
  @Input() groupedOrders: Order[] = [];
  groupedOrdersLoading = input(false);
  hiddenReschedule = input(false);
  planNamesByPlanId = input<ReadonlyMap<number, string> | null>(null);
  planNamesDisplay = input<string | null>(null);
  showPlanNames = input(false);
  readonly showReferencePrice = input(false);

  /**
   * A box-office adjustment already rewrites the ticket total, so a struck reference price would mix both. Read from the
   * active tab's order: grouped tabs render that order's ticket rows.
   */
  protected showTicketsReferencePrice(): boolean {
    return this.showReferencePrice() && !this.#activeOrder?.cart?.adjustment?.amount;
  }

  /** Opt-in: the card is shared with Reservations, and the agreements panel belongs to Validation only. */
  readonly showAgreements = input(false);
  readonly showCustomerNotes = input(false);
  readonly notesCollapsed = input(true);
  readonly showTags = input(false);
  readonly showExternalReservationId = input(false);
  readonly showActivityJourney = input(false);
  readonly separateHeaderCard = input(false);
  protected readonly header = viewChild(OrderHeaderComponent);
  protected readonly validatedCount = computed(() => this.header()?.validatedCount() ?? null);
  protected isEntitlementOrder = false;
  protected hasGroupedOrders = false;
  protected cartMergesSeveralOrders = false;

  constructor(
    private partnerService: PartnerService,
    private reservationsService: ReservationsService,
    private accessControlService: AccessControlService,
    private modalService: NgbModal,
    private spinnerService: SpinnerService,
    private translate: TranslateService,
    private changeDetectorRef: ChangeDetectorRef,
    private scrollAndHighlight: ScrollAndHighlightService,
    private router: Router,
    private paymentConfigStorageService: PaymentConfigStorageService,
    protected trackingService: TrackingService,
    private userService: UserService,
    private optimizelyService: OptimizelyService,
    private onsiteSetupsStorageService: OnsiteSetupsStorageService,
    private orderNotesService: OrderNotesService,
    private invitationService: InvitationService,
    @Inject(PURCHASE_CONFIRMATION_RESEND_SERVICE) private purchaseConfirmationResendService: PurchaseConfirmationResendService,
    private splitPackService: SplitPackService,
  ) {
    this.onsiteSetupStorage = this.onsiteSetupsStorageService.getConfiguration();
    this.isFiscalReprintEnabled = isFiscalReprintEnabled(this.optimizelyService, this.onsiteSetupStorage?.place?.country_iso_code_2);
  }

  get orderCountryCode(): string | undefined {
    for (const ticket of this.#activeOrder?.ticketsAndProducts?.values() ?? []) {
      if (ticket.sessionIsoCountryCode) {
        return ticket.sessionIsoCountryCode.toUpperCase();
      }
    }
    return undefined;
  }

  @Output() orderAction = new EventEmitter<OrderActionEvent>();
  @ViewChildren('tickets', { read: ElementRef }) tickets!: QueryList<ElementRef>;
  @ViewChild('cancellingModal', { static: true }) cancellingModal!: TemplateRef<unknown>;
  sessionsWithTransfers: Array<SessionWithTransfers> = [];
  productSessionsWithTransfers: SessionWithTransfers[] = [];
  ticketSessionGroups: OrderTicketSessionGroup<SessionWithTransfers>[] = [];
  groupedOrderTabs: GroupedOrderTab[] = [];
  activeTabId = 0;
  sessionsByDatetime: Map<string, SessionWithTransfers[]> = new Map();
  isCollapsed = false;
  readonly #isValidatingAll = signal(false);
  protected readonly isValidatingAll = this.#isValidatingAll.asReadonly();
  #validateAllRequestsInFlight = 0;
  #validateAllAwaitingRefresh: Record<number, number> = {};
  #validateAllRefreshGrace?: ReturnType<typeof setTimeout>;
  #spinnerHolds = 0;
  #lastSearchedTicketId?: number;
  adyenDeviceId?: string;
  showPrintReceipt = false;
  onsiteSetupStorage: OnsiteSetup | null;
  isFiscalReprintEnabled = false;
  isReprintingFiscalReceipt = false;
  #pendingFranceFiscalDuplicate: { fiscalNumber: string; fiscalTags: FiscalTag[]; orderId: number } | null = null;
  hasShiftsEnabled = false;
  private partnerId!: number;
  private destroy$ = new Subject<void>();
  protected ticketAction$: Subject<OrderActionEvent> = new Subject<OrderActionEvent>();
  hideNoteDetailsSubject = new BehaviorSubject(false);
  showErrorSubject = new BehaviorSubject<{ code: string; message: string } | null>(null);

  hasReschedule = false;
  isOrderHistoryVisible = false;
  ticketSelection = new TicketSelectionState();
  private currentSetupId?: string;
  private currentProfileIds?: string[];

  #activeTabIdSignal = signal(0);
  #groupedOrderTabsSignal = signal<GroupedOrderTab[]>([]);
  readonly #isEntitlementOrderSignal = signal(false);
  readonly #orderSignal = signal<Order | undefined>(undefined);
  readonly #ticketSessionGroupsSignal = signal<OrderTicketSessionGroup<SessionWithTransfers>[]>([]);
  readonly #visitGroups = computed(() => {
    const tabs = this.#groupedOrderTabsSignal();

    return (tabs.length > 0 ? tabs[this.#activeTabIdSignal()]?.ticketSessionGroups : this.#ticketSessionGroupsSignal()) ?? [];
  });
  protected readonly visitGroup = computed(() => {
    const visitGroups = this.#visitGroups();

    return visitGroups.length === 1 ? visitGroups[0] : null;
  });
  protected readonly visitDate = computed(() => {
    const visitGroup = this.visitGroup();

    return visitGroup?.showDate ? visitGroup.datetimeKey : null;
  });
  protected readonly visitTimezone = computed(() => {
    const tabs = this.#groupedOrderTabsSignal();

    return tabs.length > 0 ? tabs[this.#activeTabIdSignal()]?.order?.cart?.timezone : this.#orderSignal()?.cart?.timezone;
  });
  protected readonly canSelectAll = computed(() => this.ticketSelection.selectableKeys().size > 0 && !this.#isEntitlementOrderSignal());
  protected aggregatedSessionForPendingSchedule = computed(() => {
    const tabs = this.#groupedOrderTabsSignal();
    const activeTab = tabs[this.#activeTabIdSignal()];
    if (!activeTab?.sessions?.length) {
      return null;
    }
    const totalUnits = activeTab.sessions.reduce((sum, session) => sum + (session.units ?? 0), 0);
    const firstSession = activeTab.sessions[0];
    return new CartSession(firstSession.sessionId, totalUnits);
  });
  protected aggregatedSessionForLegacyPendingSchedule: CartSession | null = null;

  deleteNote(): void {
    const targetOrder = this.perTabOrder;
    if (!targetOrder?.id) {
      return;
    }

    const orderId = targetOrder.id;
    this.orderNotesService.deleteOrderNote(orderId).subscribe({
      error: (error: { code: string; message: string }) => {
        this.showErrorSubject.next(error);
      },
      next: () => {
        this.trackingService.track(
          new DeleteOrderNoteEvent({
            order_id: orderId,
          }),
        );

        this.noteActions({
          action: OrderAction.DELETE_NOTE,
          data: {
            orderId: orderId,
          },
        });
        this.hideNoteDetailsSubject.next(true);
      },
    });
  }

  getLabelsForDatetime(datetime: string): Array<{ type: LabelType }> {
    const labels: Array<{ type: LabelType }> = [];
    const sessionsForDatetime = this.sessionsByDatetime.get(datetime) ?? [];

    const hasExpiredSession = sessionsForDatetime.some(s => s.session.isExpired && !s.session.sessionType?.isShopProduct);
    if (hasExpiredSession) {
      labels.push({ type: 'expired' });
    }

    const sessionStartAt = this.sessionsWithTransfers[0]?.session.sessionStartAt ?? '';
    if (datetime === sessionStartAt) {
      const rescheduleLabel = this.#getRescheduleLabel();
      if (rescheduleLabel) {
        labels.push({ type: rescheduleLabel });
      }
    }

    return labels;
  }

  hideOrderHistory(): void {
    this.isOrderHistoryVisible = false;
  }

  ngOnChanges(changes: SimpleChanges): void {
    const newSessions: Array<CartSession> = changes.cartSessions?.currentValue;
    const newSearchedQRCode = changes.searchedQRCode?.currentValue;
    let newSearchedTicketId = changes.searchedTicketId?.currentValue;

    if (newSearchedQRCode) {
      const codeOwnerSession = this.#findTicketIdQRCodeOwner(this.cartSessions, newSearchedQRCode);
      newSearchedTicketId = codeOwnerSession?.ticketId;
    }

    const searchChanged = !!(changes.searchedTicketId || changes.searchedQRCode);
    if (searchChanged) {
      this.#lastSearchedTicketId = newSearchedTicketId || undefined;
      this.#applyCollapseDefaultsToGroupedTabs();
    }

    if (newSessions || newSearchedTicketId) {
      const previousCollapse = searchChanged ? new Map<string, boolean>() : this.#collapseStateByKey(this.sessionsWithTransfers);
      this.sessionsWithTransfers = this.cartSessions.map((session, _, allSessions) => ({
        isCollapsed:
          previousCollapse.get(session.orderListKey) ?? isSessionCollapsedByDefault(session, allSessions, this.#lastSearchedTicketId),
        session,
        transfers: this.#findTransfers(session, allSessions),
      }));
      this.#updateSessionsByDatetime();
    }

    if (newSearchedTicketId && !newSearchedQRCode) {
      this.changeDetectorRef.detectChanges();
      this.#goToTicket(newSearchedTicketId);
    }

    if (changes.order) {
      this.#orderSignal.set(this.order);
    }

    if (changes.order?.currentValue) {
      this.#checkShowPrintReceipt();
    }

    if (changes.groupedOrders || changes.order) {
      this.#syncEntitlementGroupedCartState();
      this.#updateTicketSelection();
    }

    if (changes.cartSessions || changes.order || changes.groupedOrders) {
      this.aggregatedSessionForLegacyPendingSchedule = this.#buildAggregatedSessionForLegacyPendingSchedule();
      this.#reconcileValidateAllAfterRefresh();
    }
  }

  ngOnDestroy(): void {
    clearTimeout(this.#validateAllRefreshGrace);
    this.destroy$.next();
  }

  ngOnInit(): void {
    this.partnerId = this.partnerService.getPartner()!.id;
    this.hasReschedule = Boolean(this.#getTargetRescheduleOrderNavigationIds().length > 0 || this.order.sourceRescheduleOrderId);
  }

  noteActions(event: OrderActionEvent): void {
    if (!this.order || !event?.action) {
      return;
    }
    const targetOrder = this.perTabOrder;
    const shouldSyncGroupedTabs = this.hasGroupedOrders && !this.isEntitlementOrder;

    switch (event.action) {
      case OrderAction.ADD_NOTE:
      case OrderAction.UPDATE_NOTE: {
        const date = event.data?.noteCreatedAt ?? new Date().toISOString();
        const message = event.data?.serializedNoteMessage ?? event.data?.noteDescription ?? '';

        targetOrder.note = {
          createdAt: targetOrder.note?.createdAt ?? date,
          id: targetOrder.note?.id ?? '',
          message,
          modifiedAt: date,
          title: event.data?.noteTitle ?? '',
          updatedAt: date,
          userEmail: this.userService.getUserEmail() ?? '',
          userId: this.userService.getUserId() ?? 0,
          username: this.userService.getUserEmail() ?? '',
        };

        if (shouldSyncGroupedTabs) {
          this.#buildGroupedOrderTabs();
        } else {
          this.order = this.order.clone();
        }
        break;
      }
      case OrderAction.DELETE_NOTE:
        targetOrder.note = undefined;
        if (shouldSyncGroupedTabs) {
          this.#buildGroupedOrderTabs();
        }
        break;
    }

    this.orderAction.emit(event);
  }

  onActiveTabChanged(tabId: number): void {
    this.activeTabId = tabId;
    this.#activeTabIdSignal.set(tabId);
    this.#updateTicketSelection();
  }

  onNavigateToBoxOfficeUpgrade(): void {
    this.#navigateToBoxOfficeForFixedPrice();
  }

  refreshOrder(): void {
    this.orderAction.emit({ action: OrderAction.TICKET_UPDATED });
  }

  showOrderHistory(): void {
    this.isOrderHistoryVisible = true;
    const targetOrder = this.perTabOrder;
    if (targetOrder?.id === undefined) {
      return;
    }
    this.trackingService.track(
      new ViewOrderHistoryEvent({
        cancellation_record_count: targetOrder.userCancellationRecords?.length ?? 0,
        order_id: targetOrder.id,
      }),
    );
  }

  ticketAction(event: OrderActionEvent): void {
    const isAdyenPrinter = this.onsiteSetupsStorageService.getConfiguration()?.obo_printer_type === OboPrinterTypeEnum.adyen_printer;
    switch (event.action) {
      case OrderAction.PRINT_TICKET:
        if (isAdyenPrinter) {
          this.#printAdyen(PrinterDocumentType.ticket, OrderAction.PRINT_TICKET);
        } else {
          this.#printTicket(event.data!.ticketId!);
        }
        break;
      case OrderAction.PRINT_ORDER:
        if (isAdyenPrinter) {
          this.#printAdyen(PrinterDocumentType.ticket, OrderAction.PRINT_ORDER);
        } else {
          this.#printOrder();
        }
        break;
      case OrderAction.PRINT_RECEIPT:
        // Keep the fiscal-reprint-first ordering consistent with the OSS purchased-cart flow.
        if (this.isFiscalReprintEnabled) {
          this.#reprintFiscalReceipt();
        } else {
          this.#printNonFiscalReceipt();
        }
        break;
      case OrderAction.VALIDATE_TICKET:
        this.#validateTicket(event.data!.ticketId!, event.data!.ticketCount!);
        break;
      case OrderAction.VALIDATE_CODE:
        this.#validateCodes(event.data!.codes!, undefined, undefined, undefined, event.data!.setupId!, event.data!.profileIds);
        break;
      case OrderAction.VALIDATE_ALL:
        this.#validateAll();
        break;
      case OrderAction.GO_TO_TICKET:
        this.#goToTicket(event.data!.ticketId!);
        break;
      case OrderAction.CANCEL_ORDER:
        this.#cancelOrder();
        break;
      case OrderAction.PARTIAL_REFUND:
        this.#partialRefund();
        break;
      case OrderAction.RESCHEDULE_ORDER:
        if (this.#shouldModifyOrderThroughOss()) {
          this.#modifyOrderThroughOss();
        } else if (
          this.optimizelyService.isFeatureEnabled({
            optimizelyFeatureKey: FeatureFlags.MODIFY_ORDER_WITH_SEATING_THROUGH_NEW_POS,
            team: 'b2b-shops',
          }) ??
          false
        ) {
          this.#openModifyOrderStrategyModal();
        } else {
          this.#rescheduleOrder();
        }
        break;
      case OrderAction.GET_DELIVERY_NOTE:
        this.#getDeliveryNote();
        break;
      case OrderAction.GET_PARTY_SUMMARY:
        this.#getPartySummary();
        break;
      case OrderAction.OPEN_RESEND_MODAL:
        this.#openResendModal(event.data!.ticketId!);
        break;
      case OrderAction.ADD_TICKETS:
        this.#addTickets();
        break;
      case OrderAction.REASSIGN_SEATS:
        this.#reassignSeats(event.data?.ticketId);
        break;
      case OrderAction.RESEND_ORDER:
        this.#openResendOrderModal();
        break;
      case OrderAction.PRINT_ADYEN_TICKET:
        this.#printAdyen(PrinterDocumentType.ticket, OrderAction.PRINT_ADYEN_TICKET);
        break;
      case OrderAction.NAVIGATE_TO_ORDER:
        this.#navigateToOrder(event.data!.orderId!);
        break;
      case OrderAction.VIEW_CALENDAR:
        this.#viewCalendar(event.data?.cartId);
        break;
      case OrderAction.ORDER_HISTORY:
        this.showOrderHistory();
        break;
      case OrderAction.SPLIT_PACK: {
        const ticketId = event.data?.ticketId;
        if (ticketId == null) {
          this.#showModalError();
          break;
        }
        this.#openSplitPackModal(ticketId);
        break;
      }
      case OrderAction.UNVALIDATE_CODES:
        this.#confirmAndUnvalidateCodes(event);
        break;
      case OrderAction.TICKET_UPDATED:
        this.orderAction.emit(event);
        break;
    }
  }

  toggleSessionIsCollapse(isCollapsed: boolean, toggledSession: SessionWithTransfers): void {
    if (this.sessionsWithTransfers.includes(toggledSession)) {
      this.sessionsWithTransfers = this.sessionsWithTransfers.map(session =>
        session === toggledSession ? { ...toggledSession, isCollapsed } : session,
      );
      this.#updateSessionsByDatetime();
      return;
    }

    this.groupedOrderTabs = this.groupedOrderTabs.map(tab => {
      if (!tab.sessionsWithTransfers.includes(toggledSession)) {
        return tab;
      }

      const sessionsWithTransfers = tab.sessionsWithTransfers.map(session =>
        session === toggledSession ? { ...toggledSession, isCollapsed } : session,
      );

      return this.#buildGroupedOrderTabDisplay(tab.order, tab.sessions, sessionsWithTransfers);
    });
  }

  trackByDateTime(_: number, item: { key: string; value: SessionWithTransfers[] }): string {
    return item.key;
  }

  trackByTicketGroup(_: number, group: OrderTicketSessionGroup<SessionWithTransfers>): string {
    return group.datetimeKey;
  }

  trackSessionByFn(_: number, { session }: SessionWithTransfers): number {
    return session.sessionId;
  }

  updatedNote(event: NoteActionEvent): void {
    switch (event.action) {
      case noteAction.UPDATE:
      case noteAction.CREATE:
        this.#updateNote(event);
        break;
      case noteAction.DELETE:
        this.deleteNote();
        break;
    }
  }

  #getAllSessionsFromOrder(order: Order): CartSession[] {
    return Array.from(order.cart?.sessionItemsByDatetime?.entries() ?? []).reduce(
      (previous, [, sessions]) => [...previous, ...sessions],
      [] as CartSession[],
    );
  }

  #buildAggregatedSessionForLegacyPendingSchedule(): CartSession | null {
    if (!this.isEntitlementOrder || this.order?.entitlementsInfo?.status !== 'pending_to_schedule') {
      return null;
    }
    const sessions = this.cartSessions?.length ? this.cartSessions : this.order ? this.#getAllSessionsFromOrder(this.order) : [];
    if (!sessions.length) {
      return null;
    }
    const totalUnits = sessions.reduce((sum, session) => sum + (session.units ?? 0), 0);
    const firstSession = sessions[0];
    return new CartSession(firstSession.sessionId, totalUnits);
  }

  #getPrintableGroupedOrders(): Order[] {
    if (!this.hasGroupedOrders) {
      return [];
    }

    const orders = this.groupedOrders.length > 0 ? this.groupedOrders : this.order ? [this.order] : [];

    const mainOrder = hasGroupedOrderIds(this.order) ? this.order : orders.find(hasGroupedOrderIds);

    const printableOrders = hasGroupedOrderIds(mainOrder)
      ? getPrintableOrdersFromCart(orders, [mainOrder])
      : orders.map(toPrintableOrderByGroupKind).filter((order): order is Order => order !== null);

    return printableOrders.map(filterTicketProtectionAccessTickets);
  }

  #groupHoldsOrdersBeyondThisOne(): boolean {
    const shownOrderId = this.order?.id;
    return (
      this.groupedOrders.some(({ id }) => id !== shownOrderId) ||
      (this.order?.groupedOrders ?? []).some(groupedOrderId => groupedOrderId !== shownOrderId)
    );
  }

  #hasRealGroupEvidence(orders: Order[] = this.groupedOrders): boolean {
    return orders.length > 0 || (this.order?.groupedOrders?.length ?? 0) > 0;
  }

  #syncEntitlementGroupedCartState(): void {
    this.isEntitlementOrder =
      (this.order != null && isEntitlementGroupOrder(this.order)) || this.groupedOrders.some(isEntitlementGroupOrder);
    this.#isEntitlementOrderSignal.set(this.isEntitlementOrder);
    this.hasGroupedOrders = this.#hasRealGroupEvidence(this.groupedOrders);
    this.cartMergesSeveralOrders = this.isEntitlementOrder && this.#groupHoldsOrdersBeyondThisOne();
    if (this.hasGroupedOrders) {
      this.#buildGroupedOrderTabs();
    } else {
      this.groupedOrderTabs = [];
      this.activeTabId = 0;
      this.#activeTabIdSignal.set(0);
      this.#groupedOrderTabsSignal.set([]);
    }
  }

  #printAllGroupedOrders(): void {
    const printableOrders = this.#getPrintableGroupedOrders();

    if (!printableOrders.length) {
      this.ticketAction$.next({ action: OrderAction.PRINT_ORDER });
      this.orderAction.emit({ action: OrderAction.PRINT_ORDER, data: { orderId: this.order?.id } });
      return;
    }

    const printPayloads = printableOrders.map(order => ({
      isUnifiedTicket: this.#orderPrintingService.isUnifiedTicket(this.onsiteSetupStorage, order.planId!),
      order,
    }));

    this.#printOrders$(printPayloads)
      .pipe(
        takeUntilDestroyed(this.#destroyRef),
        finalize(() => {
          this.ticketAction$.next({ action: OrderAction.PRINT_ORDER });
          this.orderAction.emit({ action: OrderAction.PRINT_ORDER, data: { orderId: this.order?.id } });
        }),
      )
      .subscribe();
  }

  protected getDaysLeftToSchedule(order: Order): number {
    return getDaysLeftToSchedule(order.entitlementsInfo);
  }

  protected canShowEntitlementRescheduleButton(order: Order | undefined): boolean {
    return !!order?.entitlementsInfo;
  }

  #printOrders$(orders: { order: Order; isUnifiedTicket?: boolean }[]): Observable<void> {
    return this.#printFacadeService.dispatch({
      documentType: PrintDocumentType.ticket,
      entryPoint: PrintEntryPoint.order_card_print_orders,
      printerType: this.#printFacadeService.resolveTicketPrinterType(),
      target: { args: [orders], method: 'print' },
    });
  }

  #printAdyen$(
    documentType: PrintDocumentType,
    args: Parameters<AdyenPrinterService['printAdyen']>,
  ): ReturnType<AdyenPrinterService['printAdyen']> {
    return this.#printFacadeService.dispatch({
      documentType,
      entryPoint: PrintEntryPoint.order_card_print_adyen,
      printerType: PrintPrinterType.adyen,
      target: { args, method: 'printAdyen' },
    });
  }

  protected isEpsonReceiptPrinter(): boolean {
    return this.#printFacadeService.isEpsonReceiptPrinter();
  }

  protected printAllAttractionTickets(): void {
    const activeTab = this.groupedOrderTabs[this.activeTabId];
    if (!activeTab) {
      return;
    }

    const order = activeTab.order;
    const printableOrder = toPrintableOrderByGroupKind(order);

    if (!printableOrder) {
      this.ticketAction$.next({ action: OrderAction.PRINT_ORDER });
      this.orderAction.emit({ action: OrderAction.PRINT_ORDER, data: { orderId: order.id } });
      return;
    }

    const isUnifiedTicket = this.#orderPrintingService.isUnifiedTicket(this.onsiteSetupStorage, order.planId!);
    filterTicketProtectionAccessTickets(printableOrder);

    this.#printOrders$([{ isUnifiedTicket, order: printableOrder }])
      .pipe(
        takeUntilDestroyed(this.#destroyRef),
        finalize(() => {
          this.ticketAction$.next({ action: OrderAction.PRINT_ORDER });
          this.orderAction.emit({ action: OrderAction.PRINT_ORDER, data: { orderId: order.id } });
        }),
      )
      .subscribe();
  }

  protected rescheduleEntitlementOrder(order: Order): void {
    const mainOrder: Order = this.groupedOrders.find(order => (order.groupedOrders?.length ?? 0) > 0) ?? order;
    const activeSessions = this.groupedOrderTabs[this.activeTabId]?.sessions ?? this.cartSessions;
    const navigationExtras: NavigationExtras = {
      queryParams: {
        cityId: activeSessions[0]?.sessionAddressCityStandardId,
        mainOrderId: mainOrder.id,
        planId: order.planId,
        venueId: activeSessions[0]?.sessionAddressId,
      },
      state: { order },
    };
    this.orderAction.emit({
      action: OrderAction.RESCHEDULE_ORDER,
      data: {
        orderId: order.id,
        paymentGateway: order.paymentGateway,
      },
    });
    this.router.navigate(['/reschedule/order/', order.id], navigationExtras);
  }

  get #activeOrder(): Order {
    if (!this.hasGroupedOrders) {
      return this.order;
    }
    return this.groupedOrderTabs[this.activeTabId]?.order ?? this.order;
  }

  protected get isSuperuser(): boolean {
    return this.userService.getUser()?.isStaff() ?? false;
  }

  protected get showsCoveredByFeverAsInactive(): boolean {
    return showsCoveredByFeverAsInactive(this.perTabOrder?.status, this.isSuperuser);
  }

  protected get locale(): string {
    return this.translate.currentLang;
  }

  protected get activityJourney(): Journey | undefined {
    if (!this.showActivityJourney()) {
      return undefined;
    }

    return this.purchaseInfoOrder?.journey;
  }

  protected get purchaseInfoOrder(): Order {
    return this.perTabOrder;
  }

  protected get headerActiveTabOrder(): Order | undefined {
    if (!this.hasGroupedOrders || this.isEntitlementOrder) {
      return undefined;
    }

    return this.groupedOrderTabs[this.activeTabId]?.order;
  }

  protected get canOpenOrderResponses(): boolean {
    return (this.perTabOrder?.bookingQuestions?.length ?? 0) > 0 || (this.bookingAnswersForDisplay?.length ?? 0) > 0;
  }

  protected get bookingAnswersForDisplay(): BookingAnswer[] | undefined {
    const activeOrder = this.perTabOrder;
    const bookingAnswers = activeOrder?.bookingAnswers;
    const activePlanId = activeOrder?.effectivePlanId;

    if (!bookingAnswers || activePlanId == null || activePlanId <= 0) {
      return bookingAnswers;
    }

    const filteredAnswers = bookingAnswers.filter(answer => answer.mainPlanId == null || answer.mainPlanId === activePlanId);
    return filteredAnswers.length === bookingAnswers.length ? bookingAnswers : filteredAnswers;
  }

  protected get perTabOrder(): Order {
    return this.isEntitlementOrder ? this.order : this.#activeOrder;
  }

  protected get hasReleaseConditions(): boolean {
    return hasOrderReleaseConditions(this.perTabOrder);
  }

  protected get activeOrderForRescheduleEvaluation(): Order {
    return this.#activeOrder;
  }

  #addTickets(): void {
    const activeOrder = this.#activeOrder;
    const activeSessions = this.hasGroupedOrders
      ? (this.groupedOrderTabs[this.activeTabId]?.sessions ?? this.cartSessions)
      : this.cartSessions;
    const navigationExtras: NavigationExtras = {
      queryParams: {
        cityId: activeSessions[0]?.sessionAddressCityStandardId,
        mode: 'add_tickets',
        modified_order_id: activeOrder.id,
        planId: activeOrder.planId,
        venueId: activeSessions[0]?.sessionAddressId,
      },
      state: { order: activeOrder },
    };
    this.router.navigate(['/box-office'], navigationExtras);
  }

  #buildGroupedOrderTabDisplay(order: Order, sessions: CartSession[], sessionsWithTransfers: SessionWithTransfers[]): GroupedOrderTab {
    const listableSessions = this.#getListableSessions(sessionsWithTransfers);
    const { productSessions, ticketSessions } = splitSessionsByProducts(listableSessions);

    return {
      order,
      productSessionsWithTransfers: productSessions,
      sessions,
      sessionsByDatetime: groupAndSortSessionsByDatetime(listableSessions),
      sessionsWithTransfers,
      ticketSessionGroups: buildTicketSessionGroups(ticketSessions),
    };
  }

  #buildGroupedOrderTabs(): void {
    const orders = this.groupedOrders;
    if (!orders.length) {
      this.groupedOrderTabs = [];
      this.#groupedOrderTabsSignal.set([]);
      this.activeTabId = 0;
      this.#activeTabIdSignal.set(0);
      return;
    }

    const previousActiveOrderId = this.groupedOrderTabs[this.activeTabId]?.order?.id;
    const previousCollapse = new Map<string, boolean>(
      this.groupedOrderTabs.flatMap(tab =>
        Array.from(this.#collapseStateByKey(tab.sessionsWithTransfers), ([key, isCollapsed]) => [`${tab.order.id}:${key}`, isCollapsed]),
      ),
    );

    this.groupedOrderTabs = orders.map(groupedOrder => {
      const sessions = this.#getAllSessionsFromOrder(groupedOrder);
      const sessionsWithTransfers: SessionWithTransfers[] = sessions.map((session, _, allSessions) => ({
        isCollapsed:
          previousCollapse.get(`${groupedOrder.id}:${session.orderListKey}`) ??
          isSessionCollapsedByDefault(session, allSessions, this.#lastSearchedTicketId),
        session,
        transfers: allSessions.filter(
          other => other !== session && session.transfers?.find(transfer => transfer.receivedTicketId === other.ticketId),
        ),
      }));

      return this.#buildGroupedOrderTabDisplay(groupedOrder, sessions, sessionsWithTransfers);
    });

    const preservedTabId = previousActiveOrderId == null ? -1 : orders.findIndex(order => order.id === previousActiveOrderId);
    const nextActiveTabId = preservedTabId >= 0 ? preservedTabId : 0;
    this.activeTabId = nextActiveTabId;
    this.#activeTabIdSignal.set(nextActiveTabId);
    this.#groupedOrderTabsSignal.set(this.groupedOrderTabs);
  }

  #buildUnvalidateSkippedCodesLabel(payload: UnvalidateCodesResponseData, idToCode: Map<number, string>): string {
    const fromStrings = payload.skipped_not_validated_codes ?? [];
    const fromIds = (payload.not_unvalidated_code_ids ?? []).map(id => idToCode.get(id) ?? `#${id}`);
    return [...fromStrings, ...fromIds].join(', ');
  }

  #cancelOrder(): void {
    const useActiveTab = !this.isEntitlementOrder && this.hasGroupedOrders;
    const cancelOrder = useActiveTab ? this.#activeOrder : this.order;
    const cancelSessions = useActiveTab ? (this.groupedOrderTabs[this.activeTabId]?.sessions ?? this.cartSessions) : this.cartSessions;

    const navigationExtras: NavigationExtras = {
      queryParams: {
        cityId: cancelSessions[0]?.sessionAddressCityStandardId,
        planId: cancelOrder?.planId,
        venueId: cancelSessions[0]?.sessionAddressId,
      },
    };
    this.router.navigate(['/cancellation/order/', cancelOrder?.id], navigationExtras);
  }

  #partialRefund(): void {
    const useActiveTab = !this.isEntitlementOrder && this.hasGroupedOrders;
    const order = useActiveTab ? this.#activeOrder : this.order;
    if (order?.id === undefined) {
      this.ticketAction$.next({ action: OrderAction.PARTIAL_REFUND });
      return;
    }
    this.#orderPartialRefundFlowService
      .start({ orderId: order.id, partnerId: this.orderPartnerId ?? this.partnerId })
      .pipe(
        takeUntilDestroyed(this.#destroyRef),
        finalize(() => this.ticketAction$.next({ action: OrderAction.PARTIAL_REFUND })),
      )
      .subscribe({
        next: ({ completed }) => {
          if (completed) {
            this.orderAction.emit({ action: OrderAction.TICKET_UPDATED });
          }
        },
        error: () => {
          this.#toastService.add({
            autoHide: true,
            message: this.translate.instant('orders.partialRefund.loadFailed'),
            sentiment: AlertSentiment.danger,
          });
        },
      });
  }

  #canPrintFranceFiscalReceipt(order: Order | undefined): boolean {
    return Boolean(this.adyenDeviceId && order?.id && order.planId);
  }

  #checkShowPrintReceipt(): void {
    const isEpson = this.isEpsonReceiptPrinter();
    if (isEpson) {
      this.showPrintReceipt = true;
    }
    const paymentConfiguration: PaymentConfiguration | undefined = this.paymentConfigStorageService.getConfiguration();
    if (canPrintOnAdyenTerminal(paymentConfiguration, this.onsiteSetupStorage)) {
      this.adyenDeviceId = paymentConfiguration?.deviceId;
      // Do not let the Adyen branch clear the Epson-driven visibility: Epson-only setups may carry
      // Adyen payment metadata without a terminal deviceId, and the receipt button must still show.
      this.showPrintReceipt = isEpson || Boolean(this.adyenDeviceId);
    }
  }

  #clearFranceFiscalReprintGuard(): void {
    this.isReprintingFiscalReceipt = false;
    this.ticketAction$.next({ action: OrderAction.PRINT_RECEIPT });
    this.changeDetectorRef.markForCheck();
  }

  #confirmAndUnvalidateCodes(event: OrderActionEvent): void {
    const codeIds = event.data?.codeIds ?? [];
    const codes = event.data?.codes ?? [];
    const ticketId = event.data?.ticketId;
    const totalCodes = event.data?.ticketCount ?? codeIds.length;

    if (codeIds.length === 0) {
      return;
    }

    const activeOrder = this.#activeOrder;
    const trackingData = {
      codes,
      order_id: activeOrder?.id ?? 0,
      partner_id: this.partnerId,
      partner_name: this.partnerService.getPartner()?.name ?? '',
      plan_id: activeOrder?.planId ?? 0,
      ticket_id: ticketId ?? 0,
      user_id: this.userService.getUserId() ?? 0,
    };

    this.trackingService.track(new ClickUnvalidateCtaEvent(trackingData));

    const modal = this.modalService.open(MessageModalComponent);
    modal.componentInstance.title = this.translate.instant('validateTicketsNew.unvalidate.confirmTitle');
    modal.componentInstance.messages = [
      this.translate.instant('validateTicketsNew.unvalidate.confirmMessage', {
        count: codeIds.length,
        ticketId,
        total: totalCodes,
      }),
    ];
    modal.componentInstance.acceptButtonLabel = this.translate.instant('validateTicketsNew.unvalidate.confirmButton');
    modal.componentInstance.cancelButtonLabel = this.translate.instant('common.cancel');
    modal.componentInstance.showWarningIcon = true;

    modal.componentInstance.responseEmitter.pipe(take(1), takeUntilDestroyed(this.#destroyRef)).subscribe((confirmed: boolean) => {
      if (!confirmed) {
        return;
      }

      this.trackingService.track(new ClickConfirmUnvalidationEvent(trackingData));

      this.spinnerService.show();
      this.accessControlService
        .unvalidateCodes(this.partnerId, codeIds)
        .pipe(
          finalize(() => this.spinnerService.hide()),
          takeUntilDestroyed(this.#destroyRef),
        )
        .subscribe(response => {
          if (response.error) {
            this.#showModalError(response.error.message);
            return;
          }

          const payload = response.data;
          if (!payload) {
            this.#showModalError('validateTicketsNew.unvalidate.genericError');
            return;
          }

          const idToCode = this.#mapUnvalidateCodeIdToCodeString(codeIds, codes);

          if (payload.unvalidated_code_ids.length === 0 && codeIds.length > 0) {
            this.#toastService.add({
              autoHide: true,
              message: this.translate.instant('validateTicketsNew.unvalidate.genericError'),
              sentiment: AlertSentiment.warning,
            });
            this.changeDetectorRef.detectChanges();
            return;
          }

          const codesUnvalidatedInUi = payload.unvalidated_code_ids.map(id => idToCode.get(id)).filter((c): c is string => !!c);

          this.#updateUnvalidatedOrderTickets(codesUnvalidatedInUi);

          if (payload.partial) {
            const skippedList = this.#buildUnvalidateSkippedCodesLabel(payload, idToCode);
            this.#toastService.add({
              autoHide: true,
              message: this.translate.instant('validateTicketsNew.unvalidate.partialToast', { codes: skippedList }),
              sentiment: AlertSentiment.warning,
            });
          } else {
            this.#toastService.add({
              autoHide: true,
              message: this.translate.instant('validateTicketsNew.unvalidate.successToast'),
              sentiment: AlertSentiment.positive,
            });
          }

          this.changeDetectorRef.detectChanges();

          this.orderAction.emit({
            action: OrderAction.TICKET_UPDATED,
          });
        });
    });
  }

  #displayMessageModal(titleKey: string, messageKeys: Array<string>): NgbModalRef {
    const modal = this.modalService.open(MessageModalComponent);
    modal.componentInstance.title = this.translate.instant(titleKey);
    modal.componentInstance.messages = messageKeys.map(key => this.translate.instant(key));
    return modal;
  }

  #executeSplitPack(ticketId: number, count?: number): void {
    if (!this.partnerId || !ticketId) {
      return;
    }
    this.spinnerService.show();
    this.splitPackService
      .splitPackTicket(this.partnerId, ticketId, count)
      .pipe(
        catchError(() => {
          this.#showModalError();
          return EMPTY;
        }),
        finalize(() => this.spinnerService.hide()),
        takeUntilDestroyed(this.#destroyRef),
      )
      .subscribe(() => {
        if (this.order?.planId) {
          this.trackingService.track(new ClickSplitPackEvent({ plan_id: this.order.planId, ticket_id: ticketId }));
        }
        this.orderAction.emit({ action: OrderAction.TICKET_UPDATED });
      });
  }

  #findTicketIdQRCodeOwner(sessions: Array<CartSession>, code: string): CartSession {
    return sessions.find(session => (session.accessTicketIds || []).some(id => this.order?.accessTickets?.get(id)?.code === code))!;
  }

  /** A new search replaces whatever the user had opened in the grouped tabs: only the searched ticket stays open. */
  #applyCollapseDefaultsToGroupedTabs(): void {
    if (this.groupedOrderTabs.length === 0) {
      return;
    }

    this.groupedOrderTabs = this.groupedOrderTabs.map(tab =>
      this.#buildGroupedOrderTabDisplay(
        tab.order,
        tab.sessions,
        tab.sessionsWithTransfers.map(entry => ({
          ...entry,
          isCollapsed: isSessionCollapsedByDefault(entry.session, tab.sessions, this.#lastSearchedTicketId),
        })),
      ),
    );
    this.#groupedOrderTabsSignal.set(this.groupedOrderTabs);
  }

  /** The collapse state each session row currently has, so a rebuild keeps what the user or a search already opened. */
  #collapseStateByKey(sessionsWithTransfers: readonly SessionWithTransfers[]): Map<string, boolean> {
    return new Map(sessionsWithTransfers.map(({ isCollapsed, session }) => [session.orderListKey, isCollapsed]));
  }

  #findTransfers(session: CartSession, allSessions: Array<CartSession>): Array<CartSession> {
    return (allSessions ?? []).filter(other => {
      return other !== session && session.transfers?.find(transfer => transfer.receivedTicketId === other.ticketId);
    });
  }

  #getAccessTicketKeysForTicketId(ticketId: number): Set<string> {
    const keys = new Set<string>();
    for (const [key, ticket] of this.#activeOrder?.accessTickets?.entries() ?? []) {
      if (ticket.ticketId === ticketId && ticket.status !== ValidationStatus.CANCELLED && ticket.status !== ValidationStatus.TRANSFERRED) {
        keys.add(key);
      }
    }
    return keys;
  }

  #getCodeIdsForInvitationResend(ticketId: number): number[] | undefined {
    const ticketKeys = this.#getAccessTicketKeysForTicketId(ticketId);
    if (ticketKeys.size === 0) {
      return undefined;
    }
    const selectedKeys = this.ticketSelection.selectedKeys();
    const selectedForTicket = [...ticketKeys].filter(k => selectedKeys.has(k));
    const keysForResend = selectedForTicket.length > 0 ? selectedForTicket : [...ticketKeys];
    const ids = keysForResend.map(k => Number(k)).filter(n => !Number.isNaN(n));
    return ids.length > 0 ? ids : undefined;
  }

  #getCodeIdsForPurchaseConfirmationResend(ticketId: number): number[] | undefined {
    const ticketKeys = this.#getAccessTicketKeysForTicketId(ticketId);
    if (ticketKeys.size === 0) {
      return undefined;
    }
    const selectedKeys = this.ticketSelection.selectedKeys();
    const selectedForTicket = [...ticketKeys].filter(k => selectedKeys.has(k));
    if (selectedForTicket.length === 0 || selectedForTicket.length === ticketKeys.size) {
      return undefined;
    }
    const ids = selectedForTicket.map(k => Number(k)).filter(n => !Number.isNaN(n));
    return ids.length > 0 ? ids : undefined;
  }

  #getDeliveryNote(): void {
    const activeOrder = this.#activeOrder;
    const activeSessions = this.hasGroupedOrders
      ? (this.groupedOrderTabs[this.activeTabId]?.sessions ?? this.cartSessions)
      : this.cartSessions;
    const fileName = `reservation.${activeOrder?.reservationId}.pdf`;
    this.trackingService.track(
      new ClickGetDeliveryNoteEvent({
        channel: activeOrder?.cart?.channel?.id,
        place_id: activeSessions[0]?.sessionAddressId,
        place_name: activeSessions[0]?.sessionAddress,
        plan_id: activeOrder?.planId,
        plan_name: activeOrder?.planName,
        reservation_id: activeOrder?.reservationId,
        reservation_locator: activeOrder?.reservationLocator,
        source: ClickGetDeliveryNoteSourceEnum.ORDER_DETAIL,
      } as ClickGetDeliveryNoteData),
    );
    const reservationId = activeOrder?.reservationId;
    if (reservationId && !this.userService.isBusiness() && this.#proformaInvoice.isAvailableFor(reservationId)) {
      this.#proformaInvoice
        .openForReservationId(reservationId, this.translate.currentLang)
        .pipe(
          switchMap(dialogRef => dialogRef.closed$.pipe(take(1))),
          finalize(() => this.ticketAction$.next({ action: OrderAction.GET_DELIVERY_NOTE })),
          takeUntilDestroyed(this.#destroyRef),
        )
        .subscribe();
      return;
    }
    if (this.userService.isBusiness()) {
      this.reservationsService
        .exportUserPDFDeliveryNote(activeOrder?.reservationId as string, this.translate.currentLang)
        .pipe()
        .subscribe(
          (buffer: Blob) => {
            this.#downloadFilesService.downloadFile(buffer, ExportTypeEnum.PDF, fileName);
            this.ticketAction$.next({ action: OrderAction.GET_DELIVERY_NOTE });
          },
          () => {
            this.ticketAction$.next({ action: OrderAction.GET_DELIVERY_NOTE });
            this.#showModalError();
          },
        );

      this.orderAction.emit({
        action: OrderAction.GET_DELIVERY_NOTE,
        data: { orderId: activeOrder?.id, reservationId: activeOrder?.reservationId },
      });
      return;
    }
    this.reservationsService
      .exportPDFDeliveryNote(activeOrder?.reservationId as string, this.translate.currentLang)
      .pipe()
      .subscribe(
        (buffer: Blob) => {
          this.#downloadFilesService.downloadFile(buffer, ExportTypeEnum.PDF, fileName);
          this.ticketAction$.next({ action: OrderAction.GET_DELIVERY_NOTE });
        },
        () => {
          this.ticketAction$.next({ action: OrderAction.GET_DELIVERY_NOTE });
          this.#showModalError();
        },
      );

    this.orderAction.emit({
      action: OrderAction.GET_DELIVERY_NOTE,
      data: { orderId: activeOrder?.id, reservationId: activeOrder?.reservationId },
    });
  }

  #getPartySummary(): void {
    const activeOrder = this.#activeOrder;
    const activeSessions = this.hasGroupedOrders
      ? (this.groupedOrderTabs[this.activeTabId]?.sessions ?? this.cartSessions)
      : this.cartSessions;
    const fileName = `party-summary.${reservationIdOf(activeOrder) ?? activeOrder.id}.pdf`;
    this.trackingService.track(
      new ClickGetPartySummaryEvent({
        channel: activeOrder?.cart?.channel?.id,
        place_id: activeSessions[0]?.sessionAddressId,
        place_name: activeSessions[0]?.sessionAddress,
        plan_id: activeOrder?.planId,
        plan_name: activeOrder?.planName,
        reservation_id: activeOrder?.reservationId,
        reservation_locator: activeOrder?.reservationLocator,
        source: ClickGetDeliveryNoteSourceEnum.ORDER_DETAIL,
      } as ClickGetPartySummaryData),
    );
    const timezone = activeSessions[0]?.sessionTimezone ?? activeOrder?.cart?.timezone;
    const partySummary$ = this.#exportPartySummary(activeOrder, timezone);

    partySummary$.pipe().subscribe(
      (buffer: Blob) => {
        this.#downloadFilesService.downloadFile(buffer, ExportTypeEnum.PDF, fileName);
        this.ticketAction$.next({ action: OrderAction.GET_PARTY_SUMMARY });
      },
      () => {
        this.ticketAction$.next({ action: OrderAction.GET_PARTY_SUMMARY });
        this.#showModalError();
      },
    );

    this.orderAction.emit({
      action: OrderAction.GET_PARTY_SUMMARY,
      data: { orderId: activeOrder?.id, reservationId: activeOrder?.reservationId },
    });
  }

  #exportPartySummary(order: Order, timezone: string | undefined): Observable<Blob> {
    const language = this.translate.currentLang;
    const reservationId = reservationIdOf(order);
    if (reservationId !== null) {
      return this.userService.isBusiness()
        ? this.reservationsService.exportUserPDFPartySummary(reservationId, language, timezone)
        : this.reservationsService.exportPDFPartySummary(reservationId, language, timezone);
    }
    if (order.id === undefined) {
      return throwError(() => new Error('A party summary needs the id of the order it prints'));
    }

    return this.#orderPartySummaryService.exportPDF(order.id, language, timezone);
  }

  #getPendingFranceFiscalDuplicate(order: Order): { fiscalNumber: string; fiscalTags: FiscalTag[] } | null {
    if (this.#pendingFranceFiscalDuplicate?.orderId === order.id) {
      return this.#pendingFranceFiscalDuplicate;
    }

    return null;
  }

  #getReceiptEmailForTicketResend(ticketId: number): string {
    const activeOrder = this.#activeOrder;
    const purchaserEmail = activeOrder?.user?.email?.trim() ?? '';
    const activeSessions = this.hasGroupedOrders
      ? (this.groupedOrderTabs[this.activeTabId]?.sessions ?? this.cartSessions)
      : this.cartSessions;
    const session = activeSessions.find(s => s.ticketId === ticketId);
    if (session == null) {
      return purchaserEmail;
    }
    const hasPendingTransfer = (session.ticketTransferIntents ?? []).some(
      intent => intent.status === 'pending' && intent.ticketId === ticketId,
    );
    if (hasPendingTransfer) {
      const ticketOwnerEmail = session.ticketUserEmail?.trim() ?? '';
      return ticketOwnerEmail || purchaserEmail;
    }
    const holderEmail = session.ownerEmail?.trim() ?? '';
    return holderEmail || purchaserEmail;
  }

  #getReceiptPhoneForTicketResend(ticketId: number): string {
    const activeSessions = this.hasGroupedOrders
      ? (this.groupedOrderTabs[this.activeTabId]?.sessions ?? this.cartSessions)
      : this.cartSessions;
    const session = activeSessions.find(s => s.ticketId === ticketId);
    return session?.ownerPhone?.trim() ?? '';
  }

  #getRescheduleLabel(): LabelType | null {
    const hasSource = Boolean(this.order?.sourceRescheduleOrderId);
    const hasTarget = this.#getTargetRescheduleOrderNavigationIds().length > 0;

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

  #getSelectedCodeIds(): number[] | undefined {
    const selectedKeys = this.ticketSelection.selectedKeys();
    const isWholeOrderSelected = selectedKeys.size === 0 || selectedKeys.size === this.ticketSelection.selectableKeys().size;
    if (isWholeOrderSelected && !hasCodedTicketProtectionAccessTickets(this.#activeOrder)) {
      return undefined;
    }
    return [...selectedKeys].map(Number).filter(id => !isNaN(id));
  }

  #getTargetRescheduleOrderNavigationIds(): number[] {
    if (!this.order?.targetRescheduleOrderIds?.length) {
      return [];
    }
    return [...this.order.targetRescheduleOrderIds];
  }

  #goToTicket(ticketId: number): void {
    if (this.hasGroupedOrders) {
      for (let i = 0; i < this.groupedOrderTabs.length; i++) {
        const tab = this.groupedOrderTabs[i];
        const tabSessions = tab.sessionsWithTransfers;
        const target = tabSessions.find(s => s.session.ticketId === ticketId);
        if (target) {
          this.onActiveTabChanged(i);
          target.isCollapsed = false;
          break;
        }
      }
      this.changeDetectorRef.detectChanges();
      setTimeout(() => {
        this.scrollAndHighlight.scrollAndHighlight(this.tickets, 'data-ticketId', ticketId.toString(), 'highlight', 'start');
      });
    } else {
      const targetSessionWithTransfers = this.sessionsWithTransfers.find(
        sessionWithTransfer => sessionWithTransfer.session.ticketId === ticketId,
      );
      if (targetSessionWithTransfers) {
        targetSessionWithTransfers.isCollapsed = false;
      }
      this.scrollAndHighlight.scrollAndHighlight(this.tickets, 'data-ticketId', ticketId.toString(), 'highlight', 'start');
    }
  }

  #isAppendOnlyHistoryEnabled(): boolean {
    return this.optimizelyService.isFeatureEnabled(FeatureFlags.APPEND_ONLY_NOTE_HISTORY) === true;
  }

  #isWhatsappPurchaseConfirmationEnabled(ticketId: number): boolean {
    if (!this.userService.hasPermission(Permissions.CAN_SEND_WA_MESSAGES)) {
      return false;
    }
    const accessTicket = Array.from(this.#activeOrder?.accessTickets?.values() ?? []).find(ticket => ticket.ticketId === ticketId);
    return accessTicket?.sessionIsoCountryCode?.toUpperCase() === OrderCardComponent.WHATSAPP_PURCHASE_CONFIRMATION_COUNTRY_CODE;
  }

  #mapUnvalidateCodeIdToCodeString(codeIds: number[], codes: string[]): Map<number, string> {
    const map = new Map<number, string>();
    for (let i = 0; i < codeIds.length; i++) {
      const id = codeIds[i];
      const code = codes[i];
      if (code !== undefined) {
        map.set(id, code);
      }
    }
    return map;
  }

  #navigateToBoxOfficeForFixedPrice(): void {
    const activeOrder = this.#activeOrder;
    const orderId = activeOrder?.id;
    if (orderId == null) {
      return;
    }
    const activeSessions = this.hasGroupedOrders
      ? (this.groupedOrderTabs[this.activeTabId]?.sessions ?? this.cartSessions)
      : this.cartSessions;
    this.router.navigate(['/box-office'], {
      queryParams: {
        cityId: activeSessions[0]?.sessionAddressCityStandardId,
        mode: 'upgrade_seating',
        modified_order_id: orderId,
        planId: activeOrder.planId,
        venueId: activeSessions[0]?.sessionAddressId,
      },
      state: {
        order: activeOrder,
      },
    });
  }

  #navigateToOrder(orderId: number): void {
    this.router.navigate(['/validation'], { queryParams: { id: orderId, type: 'order' } });
  }

  #viewCalendar(cartId: string | undefined): void {
    if (cartId == null) {
      return;
    }

    this.#assetBasedCalendarNavigateService.navigateToBooking(cartId);
  }

  #modifyOrderThroughOss(): void {
    const activeOrder = this.#activeOrder;
    const activeSessions = this.hasGroupedOrders
      ? (this.groupedOrderTabs[this.activeTabId]?.sessions ?? this.cartSessions)
      : this.cartSessions;
    this.router.navigate(['/box-office'], {
      queryParams: {
        cityId: activeSessions[0]?.sessionAddressCityStandardId,
        mode: 'modify_order',
        modified_order_id: activeOrder.id,
        planId: activeOrder.effectivePlanId,
        venueId: activeSessions[0]?.sessionAddressId,
      },
      state: { order: activeOrder },
    });
  }

  #shouldModifyOrderThroughOss(): boolean {
    const activeOrder = this.#activeOrder;
    const isOrderModificationWithOssEnabled =
      this.optimizelyService.isFeatureEnabled({
        optimizelyFeatureKey: FeatureFlags.ORDER_MODIFICATION_WITH_OSS,
        team: 'game-centers',
      }) ?? false;

    return (
      isOrderModificationWithOssEnabled && activeOrder?.id != null && !activeOrder.cart?.hasSeating && activeOrder.entitlementsInfo == null
    );
  }

  #openModifyOrderStrategyModal(): void {
    if (this.#activeOrder?.id == null) {
      return;
    }

    this.#igntDialogService
      .openModal<ModifyOrderStrategyModalResult>(ModifyOrderStrategyModalComponent, { size: 'sm' })
      .closed$.pipe(take(1), takeUntilDestroyed(this.#destroyRef))
      .subscribe((result: ModifyOrderStrategyModalResult | undefined) => {
        if (result?.strategy === 'dynamic') {
          this.#rescheduleOrder();
        } else if (result?.strategy === 'fixed') {
          this.#navigateToBoxOfficeForFixedPrice();
        }
      });
  }

  #openOnsiteSetupModal(): void {
    try {
      const setupModal = this.modalService.open(OnsiteSetupModalComponent);
      setupModal.componentInstance.selectedOnsiteSetup = this.onsiteSetupStorage ?? undefined;
      setupModal.componentInstance.isActiveShift = false;
      setupModal.componentInstance.manual = true;
      const response$ = setupModal.componentInstance.response.pipe(
        take(1),
        finalize(() => setupModal.close()),
      );
      merge(
        response$,
        setupModal.dismissed.pipe(
          take(1),
          map((): undefined => undefined),
        ),
      )
        .pipe(takeUntil(this.destroy$), take(1))
        .subscribe((value: unknown) => {
          const onsiteSetup = value as OnsiteSetup | undefined;
          if (onsiteSetup) {
            this.onsiteSetupsStorageService.setConfiguration(onsiteSetup);
            this.onsiteSetupStorage = onsiteSetup;
            this.currentSetupId = onsiteSetup.id;
            this.isFiscalReprintEnabled = isFiscalReprintEnabled(this.optimizelyService, onsiteSetup.place?.country_iso_code_2);
            this.changeDetectorRef.markForCheck();
            this.orderAction.emit({ action: OrderAction.ONSITE_SETUP_CHANGED });
          }
        });
    } catch (e) {
      console.error('openOnsiteSetupModal failed', e);
    }
  }

  #openProfileSelectionModalAndRevalidate(
    profiles: AccessControlProfile[],
    failedValidations: ValidationResponse[],
    count: number,
    validatedCount: number,
    force: Record<string, string[]> | undefined,
    setupId?: string,
    onSettled?: () => void,
    alreadyValidatedCodes: string[] = [],
  ): void {
    const ambiguousCodes = failedValidations.map(v => v.code);

    this.#igntDialogService
      .openModal<ValidationProfileSelectionModalResult, ValidationProfileSelectionModalData>(ValidationProfileSelectionModalComponent, {
        data: { profiles },
        size: 'sm',
      })
      .closed$.pipe(take(1), takeUntilDestroyed(this.#destroyRef))
      .subscribe((result: ValidationProfileSelectionModalResult | undefined) => {
        if (!result) {
          this.#reportValidatedCodes(alreadyValidatedCodes, this.#activeOrder?.id);
          onSettled?.();
          return;
        }
        this.#validateCodes(ambiguousCodes, count, validatedCount, force, setupId, [result.profileId], onSettled, alreadyValidatedCodes);
      });
  }

  #openResendModal(ticketId: number): void {
    const dialogRef = this.#dialog.open(ResendTicketsModalComponent, {
      data: {
        canEditEmail: this.userService.hasPermission('can_resend_tickets_to_different_email_than_owner'),
        isWalletPassesEnabled:
          this.optimizelyService.isFeatureEnabled({ optimizelyFeatureKey: FeatureFlags.ENABLE_SEND_WALLET_PASSES, team: 'b2b-platform' }) ??
          false,
        isWhatsappPurchaseConfirmationEnabled: this.#isWhatsappPurchaseConfirmationEnabled(ticketId),
        orderEmail: this.#getReceiptEmailForTicketResend(ticketId),
        orderPhone: this.#getReceiptPhoneForTicketResend(ticketId),
      } satisfies ResendTicketsModalData,
      maxWidth: '90vw',
      width: '500px',
    });
    dialogRef.closed
      .pipe(
        takeUntilDestroyed(this.#destroyRef),
        filter((result): result is ResendTicketsModalResult => !!result),
        switchMap(result => {
          const { email, includeQrCodes, type } = result;
          if (type === 'pdf') {
            try {
              this.#resendPurchaseConfirmationEmail(ticketId, email);
              return EMPTY;
            } catch {
              this.#toastService.add({
                autoHide: true,
                message: this.translate.instant('validateTicketsNew.resendPurchaseConfirmationEmailModal.error'),
                sentiment: AlertSentiment.danger,
                title: this.translate.instant('common.errorTitle'),
              });
              return EMPTY;
            }
          }
          if (type === 'wallet_passes') {
            this.spinnerService.show();
            return this.#sendWalletPassesService
              .sendWalletPasses({
                email,
                includeQrCodes,
                partnerId: this.partnerId,
                ticketId,
              })
              .pipe(
                tap(() => {
                  this.orderAction.emit({
                    action: OrderAction.SEND_WALLET_PASSES,
                    data: {
                      originalTicketEmail: this.#getReceiptEmailForTicketResend(ticketId),
                      recipientEmail: email ?? this.#getReceiptEmailForTicketResend(ticketId),
                      ticketId,
                    },
                  });
                  this.#toastService.add({
                    autoHide: true,
                    message: this.translate.instant('validateTicketsNew.sendWalletPassesModal.success'),
                    sentiment: AlertSentiment.positive,
                    title: this.translate.instant('validateTicketsNew.ticketResent'),
                  });
                }),
                catchError(response => {
                  this.#toastService.add({
                    autoHide: true,
                    message: this.translate.instant(response?.error?.message ?? 'validateTicketsNew.sendWalletPassesModal.error'),
                    sentiment: AlertSentiment.danger,
                    title: this.translate.instant('common.errorTitle'),
                  });
                  return of(undefined);
                }),
                finalize(() => {
                  this.spinnerService.hide();
                  this.ticketAction$.next({ action: OrderAction.SEND_WALLET_PASSES });
                }),
              );
          }
          if (type === 'whatsapp_purchase_confirmation') {
            this.spinnerService.show();
            return this.purchaseConfirmationResendService
              .resendWhatsappPurchaseConfirmation({
                partnerId: this.partnerId,
                ticketId,
              })
              .pipe(
                mergeMap(response => (response?.data ? of(response) : throwError(response))),
                tap(() => {
                  this.orderAction.emit({
                    action: OrderAction.RESEND_WHATSAPP_PURCHASE_CONFIRMATION,
                    data: {
                      ticketId,
                    },
                  });
                  this.#toastService.add({
                    autoHide: true,
                    message: this.translate.instant('validateTicketsNew.resendWhatsappPurchaseConfirmationModal.success'),
                    sentiment: AlertSentiment.positive,
                    title: this.translate.instant('validateTicketsNew.ticketResent'),
                  });
                }),
                catchError(response => {
                  this.#toastService.add({
                    autoHide: true,
                    message: this.translate.instant(
                      response?.error?.message ?? 'validateTicketsNew.resendWhatsappPurchaseConfirmationModal.error',
                    ),
                    sentiment: AlertSentiment.danger,
                    title: this.translate.instant('common.errorTitle'),
                  });
                  return of(undefined);
                }),
                finalize(() => {
                  this.spinnerService.hide();
                  this.ticketAction$.next({ action: OrderAction.RESEND_WHATSAPP_PURCHASE_CONFIRMATION });
                }),
              );
          }

          return EMPTY;
        }),
      )
      .subscribe();
  }

  #openResendOrderModal(): void {
    const activeOrder = this.#activeOrder;
    const activeSessions = this.hasGroupedOrders
      ? (this.groupedOrderTabs[this.activeTabId]?.sessions ?? this.cartSessions)
      : this.cartSessions;
    const dialogRef = this.#dialog.open(ResendOrderModalComponent, {
      data: {
        canEditEmail: this.userService.hasPermission('can_resend_tickets_to_different_email_than_owner'),
        orderEmail: activeOrder?.user?.email ?? '',
        ticketSessions: activeSessions,
      } satisfies ResendOrderModalData,
      maxWidth: '90vw',
      width: '500px',
    });
    dialogRef.closed
      .pipe(
        takeUntilDestroyed(this.#destroyRef),
        filter((result): result is ResendOrderModalResult => !!result),
        switchMap(result => {
          this.spinnerService.show();
          return this.#forwardOrderPurchaseConfirmationService
            .forwardOrderPurchaseConfirmation(this.partnerId, activeOrder.id!, result.recipientEmail)
            .pipe(
              tap(() => {
                this.#toastService.add({
                  autoHide: true,
                  message: this.translate.instant('validateTicketsNew.resendOrderModal.success'),
                  sentiment: AlertSentiment.positive,
                  title: this.translate.instant('validateTicketsNew.resendOrderModal.title'),
                });
                this.orderAction.emit({
                  action: OrderAction.RESEND_ORDER,
                  data: {
                    orderId: activeOrder?.id,
                    originalTicketEmail: activeOrder.user?.email ?? '',
                    recipientEmail: result.recipientEmail ?? activeOrder.user?.email ?? '',
                  },
                });
              }),
              catchError(() => {
                this.#toastService.add({
                  autoHide: true,
                  message: this.translate.instant('validateTicketsNew.resendOrderModal.error'),
                  sentiment: AlertSentiment.danger,
                  title: this.translate.instant('common.errorTitle'),
                });
                return of(undefined);
              }),
              finalize(() => this.spinnerService.hide()),
            );
        }),
      )
      .subscribe();
  }

  #openSplitPackModal(ticketId: number): void {
    if (!ticketId) {
      this.#showModalError();
      return;
    }

    const activeSessionsWithTransfers = this.hasGroupedOrders
      ? [...(this.groupedOrderTabs[this.activeTabId]?.sessionsByDatetime.values() ?? [])].flat()
      : this.sessionsWithTransfers;
    const sessionWithTransfer = activeSessionsWithTransfers.find(s => s.session.ticketId === ticketId);
    const session = sessionWithTransfer?.session;

    if (!session) {
      this.#showModalError();
      return;
    }

    const splittableUnits = CartUtil.getSplittablePackUnitCount(session);
    if (splittableUnits < 1) {
      this.#showModalError();
      return;
    }

    if (session.units === 1 && splittableUnits === 1) {
      this.#openSplitPackModalForSingleUnit(ticketId);
      return;
    }

    this.#openSplitPackModalForMultipleUnits(ticketId, session, splittableUnits);
  }

  #openSplitPackModalForMultipleUnits(ticketId: number, session: CartSession, maxSelectableUnits: number): void {
    const dialogRef = this.#dialog.open(SplitPackSelectorModalComponent, {
      data: {
        maxCount: maxSelectableUnits,
        packName: session.sessionName ?? '',
      },
      maxWidth: '480px',
      panelClass: 'split-pack-modal',
      width: 'calc(100vw - 1rem)',
    });
    dialogRef.closed
      .pipe(
        take(1),
        takeUntilDestroyed(this.#destroyRef),
        filter((count): count is number => typeof count === 'number'),
      )
      .subscribe((count: number) => this.#executeSplitPack(ticketId, count));
  }

  #openSplitPackModalForSingleUnit(ticketId: number): void {
    const modal = this.modalService.open(MessageModalComponent, {
      windowClass: 'split-pack-modal',
    });
    modal.componentInstance.title = this.translate.instant('cancellation.splitPack.modalTitle');
    modal.componentInstance.acceptButtonLabel = this.translate.instant('cancellation.splitPack.button');
    modal.componentInstance.cancelButtonLabel = this.translate.instant('common.cancel');
    modal.componentInstance.messages = [
      `<img src="assets/images/shared/caution.png" />`,
      this.translate.instant('cancellation.splitPack.modalDescription'),
    ];
    modal.componentInstance.responseEmitter.pipe(take(1), takeUntilDestroyed(this.#destroyRef)).subscribe((response: boolean) => {
      if (response) {
        this.#executeSplitPack(ticketId, 1);
      }
    });
  }

  #printAdyen(documentType: PrinterDocumentType, action: OrderAction): void {
    const activeOrder = this.#activeOrder;
    const hasTicketsOrProducts = !!(activeOrder?.ticketsAndProducts && activeOrder.ticketsAndProducts.size > 0);
    if (!hasTicketsOrProducts) {
      this.ticketAction$.next({ action });
      return;
    }
    if (!this.adyenDeviceId) {
      if (documentType === PrinterDocumentType.ticket) {
        this.#printOrder();
      } else {
        this.ticketAction$.next({ action });
      }
      return;
    }

    const selectedKeys = this.ticketSelection.selectedKeys();
    const selectableCount = this.ticketSelection.selectableKeys().size;
    if (documentType === PrinterDocumentType.ticket && selectableCount > 0 && selectedKeys.size === 0) {
      this.ticketAction$.next({ action });
      return;
    }

    const codeIds = documentType === PrinterDocumentType.ticket ? this.#getSelectedCodeIds() : undefined;
    if (documentType === PrinterDocumentType.ticket && codeIds !== undefined && codeIds.length === 0) {
      this.ticketAction$.next({ action });
      return;
    }
    const isUnifyTicket = this.#orderPrintingService.isUnifiedTicket(this.onsiteSetupStorage, activeOrder!.planId!);
    const placeId = this.#resolveAdyenPrinterPlaceId();
    this.#printAdyen$(toPrintDocumentType(documentType), [
      this.partnerId,
      activeOrder!.planId!,
      placeId,
      activeOrder.id!,
      this.adyenDeviceId,
      documentType,
      undefined,
      isUnifyTicket,
      codeIds,
    ])
      .pipe(
        takeUntil(this.destroy$),
        finalize(() => this.ticketAction$.next({ action })),
      )
      .subscribe(
        () => {},
        error => {
          let message: string;
          if (error instanceof AdyenPrinterNotAcceptableConditionsError) {
            message = 'boxOffice.order.adyenPrinter.errors.messages.notAcceptablePreconditions';
          } else if (error instanceof AdyenPrinterRejectedError) {
            message = 'boxOffice.order.adyenPrinter.errors.messages.rejected';
          } else if (error instanceof AdyenPrinterTimeoutError) {
            message = 'boxOffice.order.adyenPrinter.errors.messages.timeout';
          } else {
            message = 'boxOffice.order.adyenPrinter.errors.messages.uknown';
          }
          this.#showModalError(message);
        },
      );
  }

  #printEpsonReceipt$(order: Order, documentType: PrinterDocumentType = PrinterDocumentType.receipt): Observable<unknown> {
    const partnerId = this.partnerId;
    const planId = order.planId;
    const orderId = order.id;
    if (partnerId === undefined || planId == null || orderId == null) {
      return of(null);
    }
    const placeId = this.#resolveAdyenPrinterPlaceId();
    // A reprint the operator asked for prints something: when fever2 has no refund slip after all, the purchase receipt.
    const args: Parameters<EpsonReceiptService['printReceipt$']> = [
      partnerId,
      planId,
      placeId,
      orderId,
      documentType,
      { printReceiptOnEmptyRefund: true },
    ];
    return this.#printFacadeService
      .dispatch({
        documentType: toPrintDocumentType(documentType),
        entryPoint: PrintEntryPoint.order_card_print_epson_receipt,
        printerType: PrintPrinterType.epson,
        target: { args, method: 'printReceipt$' },
      })
      .pipe(
        tap(printed => {
          if (!printed) {
            this.#showEpsonReceiptError();
          }
        }),
      );
  }

  #printFranceFiscalReceipt(activeOrder: Order, fiscalNumber: string, fiscalTags: FiscalTag[]) {
    if (!this.#canPrintFranceFiscalReceipt(activeOrder)) {
      this.#showModalError('boxOffice.order.adyenPrinter.errors.messages.notSetup');
      this.#clearFranceFiscalReprintGuard();
      return EMPTY;
    }

    return this.#printAdyen$(PrintDocumentType.france_duplicate, [
      this.partnerId,
      activeOrder.planId!,
      this.#resolveAdyenPrinterPlaceId(),
      activeOrder.id!,
      this.adyenDeviceId!,
      PrinterDocumentType.receipt,
      undefined,
      false,
      undefined,
      undefined,
      fiscalNumber,
      fiscalTags,
    ]).pipe(
      tap(() => {
        this.#pendingFranceFiscalDuplicate = null;
        this.#clearFranceFiscalReprintGuard();
      }),
      catchError(error => {
        this.#showRetryableFranceFiscalPrintAdyenError(activeOrder, error, fiscalNumber, fiscalTags);
        return EMPTY;
      }),
    );
  }

  #printOrder(): void {
    if (this.hasGroupedOrders && this.isEntitlementOrder) {
      this.#printAllGroupedOrders();
      return;
    }

    this.#printSingleOrder(this.#activeOrder);
  }

  #printSingleOrder(order: Order): void {
    if (order?.planId == null) {
      this.ticketAction$.next({ action: OrderAction.PRINT_ORDER });
      this.orderAction.emit({ action: OrderAction.PRINT_ORDER, data: { orderId: order?.id } });
      return;
    }

    const selectedKeys = this.ticketSelection.selectedKeys();
    const selectableCount = this.ticketSelection.selectableKeys().size;
    if (selectableCount > 0 && selectedKeys.size === 0) {
      this.ticketAction$.next({ action: OrderAction.PRINT_ORDER });
      this.orderAction.emit({ action: OrderAction.PRINT_ORDER, data: { orderId: order?.id } });
      return;
    }

    const printableOrder = toPrintableOrderByGroupKind(order);
    if (!printableOrder) {
      this.ticketAction$.next({ action: OrderAction.PRINT_ORDER });
      this.orderAction.emit({ action: OrderAction.PRINT_ORDER, data: { orderId: order.id } });
      return;
    }

    const isUnifiedTicket = this.#orderPrintingService.isUnifiedTicket(this.onsiteSetupStorage, order.planId!);
    this.optimizelyService.setPlanId(String(order.planId));

    if (selectedKeys.size > 0 && selectedKeys.size < selectableCount) {
      printableOrder.filterAccessTicketsByKeys(selectedKeys);
    }
    filterTicketProtectionAccessTickets(printableOrder);

    this.#printOrders$([{ isUnifiedTicket, order: printableOrder }])
      .pipe(
        takeUntilDestroyed(this.#destroyRef),
        finalize(() => {
          this.ticketAction$.next({ action: OrderAction.PRINT_ORDER });
          this.orderAction.emit({ action: OrderAction.PRINT_ORDER, data: { orderId: order.id } });
        }),
      )
      .subscribe();
  }

  #printTicket(ticketId: number): void {
    const activeOrder = this.#activeOrder;
    const selectedKeys = this.ticketSelection.selectedKeys();
    const selectableCount = this.ticketSelection.selectableKeys().size;
    if (selectableCount > 0 && selectedKeys.size === 0) {
      this.ticketAction$.next({ action: OrderAction.PRINT_TICKET });
      this.orderAction.emit({
        action: OrderAction.PRINT_TICKET,
        data: { orderId: activeOrder?.id, ticketId: ticketId },
      });
      return;
    }

    const orderCloned: Order = activeOrder.clone();
    orderCloned.filterAccessTicketsByTicketIdAndCode(ticketId);
    if (selectedKeys.size > 0 && selectedKeys.size < selectableCount) {
      orderCloned.filterAccessTicketsByKeys(selectedKeys);
    }
    orderCloned.filterAccessTicketsCancelled();
    filterTicketProtectionAccessTickets(orderCloned);

    this.#printOrders$([{ order: orderCloned }])
      .pipe(
        takeUntilDestroyed(this.#destroyRef),
        finalize(() => {
          this.ticketAction$.next({ action: OrderAction.PRINT_TICKET });
          this.orderAction.emit({
            action: OrderAction.PRINT_TICKET,
            data: { orderId: activeOrder?.id, ticketId: ticketId },
          });
        }),
      )
      .subscribe();
  }

  #reassignSeats(ticketId?: number): void {
    const activeOrder = this.#activeOrder;
    const activeSessions = this.hasGroupedOrders
      ? (this.groupedOrderTabs[this.activeTabId]?.sessions ?? this.cartSessions)
      : this.cartSessions;
    const session =
      ticketId !== undefined ? activeSessions.find(s => s.ticketId === ticketId) : activeSessions.find(s => !!s.seats?.length);

    if (!session) {
      return;
    }

    const source = ticketId !== undefined ? 'order_detail_single_ticket' : 'order_detail_whole_order';
    this.trackingService.track(new OpenReassignTicketSeatingEvent({ orderId: activeOrder.id, source: source, ticketId: ticketId }));

    const queryParams: Record<string, number | undefined> = {
      orderId: activeOrder.id,
      planId: activeOrder.planId,
      sessionId: session.sessionId,
    };

    if (ticketId !== undefined) {
      queryParams['ticketId'] = ticketId;
    }

    this.router.navigate(['/sessions/move-customers-seats'], { queryParams });
  }

  #reprintFiscalReceipt(): void {
    if (this.isReprintingFiscalReceipt) {
      return;
    }

    if (isOrderWithoutTillSale(this.#activeOrder)) {
      this.#printNonFiscalReceipt();
      return;
    }

    this.isReprintingFiscalReceipt = true;

    const countryCode = this.onsiteSetupStorage?.place?.country_iso_code_2;
    const reprintVariant = resolveFiscalReprintVariant(this.optimizelyService, countryCode);
    if (reprintVariant === 'france') {
      this.#reprintFranceFiscalReceipt();
      return;
    }
    if (reprintVariant === 'hungary' || reprintVariant === 'poland') {
      this.#reprintEfstaFiscalReceipt();
      return;
    }

    this.isReprintingFiscalReceipt = false;
    this.ticketAction$.next({ action: OrderAction.PRINT_RECEIPT });
    this.changeDetectorRef.markForCheck();
  }

  #reprintFranceFiscalReceipt(): void {
    const activeOrder = this.#activeOrder;
    const pendingDuplicate = this.#getPendingFranceFiscalDuplicate(activeOrder);
    if (pendingDuplicate) {
      this.isReprintingFiscalReceipt = true;
      this.#printFranceFiscalReceipt(activeOrder, pendingDuplicate.fiscalNumber, pendingDuplicate.fiscalTags)
        .pipe(takeUntilDestroyed(this.#destroyRef))
        .subscribe();
      return;
    }

    this.isReprintingFiscalReceipt = true;

    this.#printFacadeService
      .dispatchUntracked({
        args: [
          {
            channelType: activeOrder.channelType,
            orderId: activeOrder.id,
            partnerId: this.partnerId,
            sourceRescheduleOrderId: activeOrder.sourceRescheduleOrderId,
          },
        ],
        method: 'findFranceFiscalSale',
      })
      .pipe(
        switchMap(lookup => {
          if (lookup.kind === 'no-fiscal') {
            this.isReprintingFiscalReceipt = false;
            this.changeDetectorRef.markForCheck();
            this.#printNonFiscalReceipt();
            return EMPTY;
          }
          if (lookup.kind !== 'found') {
            this.#clearFranceFiscalReprintGuard();
            return EMPTY;
          }

          return this.#registerFranceFiscalDuplicate(activeOrder, lookup.saleOrderId);
        }),
        takeUntilDestroyed(this.#destroyRef),
      )
      .subscribe();
  }

  #registerFranceFiscalDuplicate(activeOrder: Order, saleOrderId: number): ReturnType<AdyenPrinterService['printAdyen']> {
    if (!this.#canPrintFranceFiscalReceipt(activeOrder)) {
      this.#showModalError('boxOffice.order.adyenPrinter.errors.messages.notSetup');
      this.#clearFranceFiscalReprintGuard();
      return EMPTY;
    }

    const dialogRef = this.#igntDialogService.openModal<string | undefined>(FranceFiscalDuplicateReasonPopupComponent, {
      disableCloseShortcuts: true,
      size: 'md',
    });

    return dialogRef.closed$.pipe(
      take(1),
      switchMap(reason => {
        if (!reason) {
          this.#clearFranceFiscalReprintGuard();
          return EMPTY;
        }

        if (!this.#canPrintFranceFiscalReceipt(activeOrder)) {
          this.#showModalError('boxOffice.order.adyenPrinter.errors.messages.notSetup');
          this.#clearFranceFiscalReprintGuard();
          return EMPTY;
        }

        const registerInput = {
          channelType: activeOrder.channelType,
          orderId: saleOrderId,
          partnerId: this.partnerId,
          reason,
        };
        return this.#printFacadeService.dispatchUntracked({ args: [registerInput], method: 'registerDuplicate' });
      }),
      switchMap(result => {
        if (result.kind === 'no-fiscal') {
          this.isReprintingFiscalReceipt = false;
          this.changeDetectorRef.markForCheck();
          this.#printNonFiscalReceipt();
          return EMPTY;
        }
        if (result.kind !== 'success') {
          this.#clearFranceFiscalReprintGuard();
          return EMPTY;
        }

        this.#pendingFranceFiscalDuplicate = {
          fiscalNumber: result.fiscalNumber,
          fiscalTags: result.fiscalTags,
          orderId: activeOrder.id!,
        };

        return this.#printFranceFiscalReceipt(activeOrder, result.fiscalNumber, result.fiscalTags);
      }),
    );
  }

  #reprintEfstaFiscalReceipt(): void {
    this.isReprintingFiscalReceipt = true;

    const reprintInput = {
      countryCode: this.onsiteSetupStorage?.place?.country_iso_code_2,
      onsiteSetupId: this.onsiteSetupStorage?.id,
      order: this.#activeOrder,
      partnerId: this.partnerId,
    };
    this.#printFacadeService
      .dispatch({
        documentType: PrintDocumentType.fiscal_receipt,
        entryPoint: PrintEntryPoint.order_card_reprint_efsta,
        printerType: PrintPrinterType.efsta_efr,
        target: { args: [reprintInput], method: 'reprintReceipt' },
      })
      .pipe(
        finalize(() => {
          this.isReprintingFiscalReceipt = false;
          this.changeDetectorRef.markForCheck();
        }),
        takeUntilDestroyed(this.#destroyRef),
      )
      .subscribe((result: EfstaReprintResult) => {
        if (result.kind === 'no-fiscal') {
          this.#printNonFiscalReceipt();
          return;
        }
        this.ticketAction$.next({ action: OrderAction.PRINT_RECEIPT });
      });
  }

  #printNonFiscalReceipt(): void {
    if (!this.isEpsonReceiptPrinter()) {
      this.#printAdyen(PrinterDocumentType.receipt, OrderAction.PRINT_RECEIPT);
      return;
    }
    const activeOrder = this.#activeOrder;
    this.#resolveEpsonReceiptDocumentType$(activeOrder)
      .pipe(
        switchMap(documentType => this.#printEpsonReceipt$(activeOrder, documentType)),
        takeUntilDestroyed(this.#destroyRef),
        finalize(() => this.ticketAction$.next({ action: OrderAction.PRINT_RECEIPT })),
      )
      .subscribe();
  }

  #rescheduleOrder(): void {
    const activeOrder = this.#activeOrder;
    const activeSessions = this.hasGroupedOrders
      ? (this.groupedOrderTabs[this.activeTabId]?.sessions ?? this.cartSessions)
      : this.cartSessions;
    const navigationExtras: NavigationExtras = {
      queryParams: {
        cityId: activeSessions[0]?.sessionAddressCityStandardId,
        planId: activeOrder.planId,
        venueId: activeSessions[0]?.sessionAddressId,
      },
      state: { order: activeOrder },
    };
    this.orderAction.emit({
      action: OrderAction.RESCHEDULE_ORDER,
      data: {
        orderId: activeOrder?.id,
        paymentGateway: activeOrder?.paymentGateway,
      },
    });
    this.router.navigate(['/reschedule/order/', activeOrder?.id], navigationExtras);
  }

  #resendPurchaseConfirmationEmail(ticketId: number, email?: string): void {
    const activeOrder = this.#activeOrder;
    const ticket = Array.from(activeOrder!.accessTickets!.values()).find(accessTicket => accessTicket.ticketId === ticketId)!;
    const partnerId = this.partnerService.getPartner()!.id;
    const activeSessions = this.hasGroupedOrders
      ? (this.groupedOrderTabs[this.activeTabId]?.sessions ?? this.cartSessions)
      : this.cartSessions;

    const resendObservable =
      ticket.isInvitation === true
        ? this.invitationService
            .resend(partnerId, ticket.invitationId?.toString() as string, email, this.#getCodeIdsForInvitationResend(ticketId))
            .pipe(mergeMap(response => (response?.data ? of(response) : throwError(response))))
        : (() => {
            const codeIds = this.#getCodeIdsForPurchaseConfirmationResend(ticketId);
            return this.purchaseConfirmationResendService.resendPurchaseConfirmationEmail({
              ...(codeIds !== undefined && codeIds.length > 0 ? { codeIds } : {}),
              email,
              partnerId: this.partnerId,
              placeId: activeSessions[0]?.sessionAddressId ?? 0,
              planId: activeOrder.planId!,
              reservationId: this.reservationId,
              ticketId: ticketId,
            });
          })();

    this.spinnerService.show();
    resendObservable
      .pipe(
        mergeMap(response => (response?.data ? of(response) : throwError(response))),
        tap(() =>
          this.orderAction.emit({
            action: OrderAction.RESEND_PURCHASE_CONFIRMATION_EMAIL,
            data: {
              originalTicketEmail: this.#getReceiptEmailForTicketResend(ticketId),
              recipientEmail: email ?? this.#getReceiptEmailForTicketResend(ticketId),
              ticketId,
            },
          }),
        ),
        finalize(() => {
          this.spinnerService.hide();
          this.ticketAction$.next({ action: OrderAction.RESEND_PURCHASE_CONFIRMATION_EMAIL });
        }),
      )
      .subscribe(
        () => {
          this.#toastService.add({
            autoHide: true,
            message: this.translate.instant('validateTicketsNew.resendPurchaseConfirmationEmailModal.success'),
            sentiment: AlertSentiment.positive,
            title: this.translate.instant('validateTicketsNew.ticketResent'),
          });
        },
        response => {
          this.#toastService.add({
            autoHide: true,
            message: this.translate.instant(response?.error?.message ?? 'validateTicketsNew.resendPurchaseConfirmationEmailModal.error'),
            sentiment: AlertSentiment.danger,
            title: this.translate.instant('common.errorTitle'),
          });
        },
      );
  }

  // fever2 builds the refund slip from the latest cancellation only: when that one did not request a refund (voucher, exchange or
  // no refund), reprint the purchase receipt.
  #documentTypeForCancellationRecords(records: OrderUserCancellationRecord[]): PrinterDocumentType {
    return records.length === 0 || latestCancellationRequestedRefund(records) ? PrinterDocumentType.refund : PrinterDocumentType.receipt;
  }

  #resolveAdyenPrinterPlaceId(): number {
    const onsite = this.onsiteSetupsStorageService.getConfiguration();
    const activeSessions = this.hasGroupedOrders
      ? (this.groupedOrderTabs[this.activeTabId]?.sessions ?? this.cartSessions)
      : this.cartSessions;
    return onsite?.place?.id ?? onsite?.place_id ?? activeSessions[0]?.sessionAddressId ?? 0;
  }

  // A cancelled order without cancellation records was most likely loaded without them (they are opt-in): fetch them before choosing.
  // When there are still none (an order cancelled without a record, or a failed load, which `getOrder` answers with no data), ask for
  // the refund slip: fever2 decides, and the print falls back to the purchase receipt when it has nothing.
  #resolveEpsonReceiptDocumentType$(order: Order): Observable<PrinterDocumentType> {
    if (!isCancelledOrderStatus(order.status)) {
      return of(PrinterDocumentType.receipt);
    }
    const records = order.userCancellationRecords ?? [];
    const partnerId = this.partnerId;
    if (records.length > 0 || partnerId === undefined || order.id == null) {
      return of(this.#documentTypeForCancellationRecords(records));
    }
    return this.#purchaseService
      .getOrder(partnerId, order.id, { includeUserCancellationRecords: true })
      .pipe(map(response => this.#documentTypeForCancellationRecords(response.data?.userCancellationRecords ?? [])));
  }

  #showEpsonReceiptError(): void {
    this.#showModalError();
  }

  #showFinalResult(validated: number, total: number): void {
    this.#showModalSuccess(`${validated}/${total}`);
  }

  #showModalError(message?: string): void {
    const modal = this.modalService.open(MessageModalComponent);
    modal.componentInstance.title = this.translate.instant('common.errorTitle');
    modal.componentInstance.messages = [this.translate.instant(message ?? 'errors.generic')];
  }

  #showModalSuccess(ticketCount: string): void {
    const modalRef = this.modalService.open(ValidationSuccessComponent);
    modalRef.componentInstance.tickets = ticketCount;
    timer(3000).subscribe(() => modalRef.close());
  }

  #showProfilesRequiredModalAndRedirectToSetup(): void {
    const modalRef = this.#displayMessageModal('validateTicketsNew.profilesRequiredForPlan.title', [
      'validateTicketsNew.profilesRequiredForPlan.message',
    ]);
    merge(modalRef.closed, modalRef.dismissed)
      .pipe(takeUntil(this.destroy$), take(1))
      .subscribe(() => this.#openOnsiteSetupModal());
  }

  #showRetryableFranceFiscalPrintAdyenError(activeOrder: Order, error: unknown, fiscalNumber: string, fiscalTags: FiscalTag[]): void {
    let message: string;
    if (error instanceof AdyenPrinterNotAcceptableConditionsError) {
      message = 'boxOffice.order.adyenPrinter.errors.messages.notAcceptablePreconditions';
    } else if (error instanceof AdyenPrinterRejectedError) {
      message = 'boxOffice.order.adyenPrinter.errors.messages.rejected';
    } else if (error instanceof AdyenPrinterTimeoutError) {
      message = 'boxOffice.order.adyenPrinter.errors.messages.timeout';
    } else {
      message = 'boxOffice.order.adyenPrinter.errors.messages.uknown';
    }

    const modal = this.modalService.open(MessageModalComponent);
    modal.componentInstance.title = this.translate.instant('boxOffice.order.adyenPrinter.errors.title');
    modal.componentInstance.messages = [this.translate.instant(message)];
    modal.componentInstance.cancelButtonLabel = this.translate.instant('boxOffice.order.adyenPrinter.errors.buttons.cancel');
    modal.componentInstance.acceptButtonLabel = this.translate.instant('boxOffice.order.adyenPrinter.errors.buttons.retry');
    modal.componentInstance.responseEmitter.subscribe((response: unknown) => {
      if (!response) {
        this.#clearFranceFiscalReprintGuard();
        return;
      }
      this.#printFranceFiscalReceipt(activeOrder, fiscalNumber, fiscalTags).pipe(takeUntilDestroyed(this.#destroyRef)).subscribe();
    });
  }

  #showValidationError(
    count: number,
    validatedCount: number,
    failed: ValidationResponse[],
    force?: any,
    onSettled?: () => void,
    alreadyValidatedCodes: string[] = [],
  ): void {
    const errors: (Omit<ValidationResponseWarning, 'id'> & {
      code: string;
      id: string | null;
      ignorable: boolean;
      message: string;
      title: string;
      response?: ValidationResponse;
    })[] = [];
    failed.forEach((response: ValidationResponse) => {
      if (response.error?.warnings && response.error.warnings.length > 0) {
        response.error.warnings.forEach((warning: ValidationResponseWarning) =>
          errors.push({
            ...warning,
            code: response.code,
            ignorable: true,
            response,
          }),
        );
      } else {
        errors.push({
          code: response.code as string,
          id: null,
          ignorable: false,
          message: response.error?.message ?? (this.translate.instant('errors.generic') as string),
          title: this.translate.instant('common.errorTitle') as string,
        });
      }
    });

    from(errors)
      .pipe(
        concatMap(
          (
            error: Omit<ValidationResponseWarning, 'id'> & {
              code: string;
              id: string | null;
              ignorable: boolean;
              message: string;
              title: string;
              response?: ValidationResponse;
            },
          ) => {
            const modalRef = this.modalService.open(ValidationErrorComponent);
            modalRef.componentInstance.title = error.title;
            modalRef.componentInstance.message = error.message;
            modalRef.componentInstance.code = error.code;
            modalRef.componentInstance.ignorable = error.ignorable;
            return from(modalRef.result).pipe(map(result => [error.code, result, error.id]));
          },
        ),
        toArray(),
        takeUntil(this.destroy$),
      )
      .subscribe({
        // A dismissed modal (backdrop or Escape) rejects its result: the flow ends there and Validate all must unlock.
        error: () => {
          this.#reportValidatedCodes(alreadyValidatedCodes, this.#activeOrder?.id);
          onSettled?.();
        },
        next: next => {
          const codes: Record<string, string[]> = {};
          next.forEach(([code, action, id]) => {
            if (action == 'force') {
              if (!codes[code]) {
                codes[code] = [];
              }
              codes[code].push(id);
            }
          });
          if (Object.keys(codes).length >= 1) {
            Object.keys(force || {})
              .filter(k => codes[k])
              .forEach(k => (codes[k] = [...(codes[k] || []), ...force[k]]));
            this.#validateCodes(
              Object.keys(codes),
              count ?? 0,
              validatedCount ?? 0,
              codes,
              this.currentSetupId,
              this.currentProfileIds,
              onSettled,
              alreadyValidatedCodes,
            );
          } else {
            this.#showFinalResult(validatedCount ?? 0, count ?? 0);
            this.#reportValidatedCodes(alreadyValidatedCodes, this.#activeOrder?.id);
            onSettled?.();
          }
        },
      });
  }

  #updateGroupedTabSessionsValidatedCount(activeOrder: Order, updater: (sessions: SessionWithTransfers[]) => SessionWithTransfers[]): void {
    this.groupedOrderTabs = this.groupedOrderTabs.map(tab => {
      if (tab.order !== activeOrder) {
        return tab;
      }

      const sessionsWithTransfers = updater(tab.sessionsWithTransfers);
      return this.#buildGroupedOrderTabDisplay(tab.order, tab.sessions, sessionsWithTransfers);
    });
  }

  #updateNote(event: NoteActionEvent): void {
    const targetOrder = this.perTabOrder;
    if (!targetOrder?.id || !event.noteChanges) {
      return;
    }

    const orderId = targetOrder.id;
    const payload = buildNotePayload({
      author: {
        email: this.userService.getUserEmail() ?? '',
        userId: this.userService.getUserId() ?? null,
      },
      existingNote: targetOrder.note ?? null,
      isAppendOnlyEnabled: this.#isAppendOnlyHistoryEnabled(),
      noteChanges: event.noteChanges,
    });
    const query: SetOrderNoteQuery = {
      message: payload.message,
      title: payload.title,
    };

    this.orderNotesService.setOrderNote(orderId, query).subscribe({
      error: (error: { code: string; message: string }) => {
        this.showErrorSubject.next(error);
      },
      next: () => {
        if (event.action === noteAction.CREATE) {
          this.trackingService.track(
            new CreateOrderNoteEvent({
              description: event.noteChanges!.message,
              order_id: orderId,
              title: event.noteChanges!.title ?? undefined,
            }),
          );
        } else if (event.action === noteAction.UPDATE) {
          this.trackingService.track(
            new EditOrderNoteEvent({
              description: event.noteChanges!.message,
              order_id: orderId,
              title: event.noteChanges!.title ?? undefined,
            }),
          );
        }

        const orderAction = event.action === noteAction.CREATE ? OrderAction.ADD_NOTE : OrderAction.UPDATE_NOTE;
        this.noteActions({
          action: orderAction,
          data: {
            noteCreatedAt: payload.createdAt,
            noteDescription: event.noteChanges!.message,
            noteTitle: event.noteChanges!.title ?? '',
            orderId: orderId,
            serializedNoteMessage: payload.message,
          },
        });
        this.hideNoteDetailsSubject.next(true);
      },
    });
  }

  #getListableSessions(sessionsWithTransfers: SessionWithTransfers[]): SessionWithTransfers[] {
    const listable = sessionsWithTransfers.filter(({ session }) => !isTransactionFeeSessionType(session.sessionType));
    return this.#isServingTimeEnabled() ? listable.flatMap(entry => this.#withPackConstituentRows(entry)) : listable;
  }

  #withPackConstituentRows(sessionWithTransfers: SessionWithTransfers): SessionWithTransfers[] {
    const constituentRows = packConstituentsOf(sessionWithTransfers.session).map<SessionWithTransfers>(session => ({
      isCollapsed: sessionWithTransfers.isCollapsed,
      session,
      transfers: [],
    }));
    return [sessionWithTransfers, ...constituentRows];
  }

  #isServingTimeEnabled(): boolean {
    return (
      this.optimizelyService.isFeatureEnabled({
        optimizelyFeatureKey: FeatureFlags.GAME_CENTERS_RESERVATIONS,
        team: 'game-centers',
      }) ?? false
    );
  }

  #updateSessionsByDatetime(): void {
    const listableSessions = this.#getListableSessions(this.sessionsWithTransfers);
    const { productSessions, ticketSessions } = splitSessionsByProducts(listableSessions);

    this.sessionsByDatetime = groupAndSortSessionsByDatetime(listableSessions);
    this.ticketSessionGroups = buildTicketSessionGroups(ticketSessions);
    this.#ticketSessionGroupsSignal.set(this.ticketSessionGroups);
    this.productSessionsWithTransfers = productSessions;
  }

  #updateTicketSelection(): void {
    const sessions = this.#getAllSessionsFromOrder(this.#activeOrder);
    const transactionFeeAccessTicketIds = getTransactionFeeAccessTicketIds(sessions);
    const ticketProtectionAccessTicketIds = getTicketProtectionAccessTicketIds(sessions);
    const selectableKeys = Array.from(this.#activeOrder.accessTickets?.entries() ?? [])
      .filter(
        ([id, ticket]) =>
          !transactionFeeAccessTicketIds.has(id) &&
          !ticketProtectionAccessTicketIds.has(id) &&
          ticket.status !== ValidationStatus.CANCELLED &&
          ticket.status !== ValidationStatus.TRANSFERRED,
      )
      .map(([key]) => key);
    this.ticketSelection.setSelectableKeys(selectableKeys);
  }

  #updateUnvalidatedOrderTickets(unvalidatedCodes: string[]): void {
    const activeOrder = this.#activeOrder;
    for (const [, ticket] of activeOrder!.accessTickets!.entries()) {
      if (unvalidatedCodes.includes(ticket.code!)) {
        ticket.isValidated = false;
        ticket.redeemedAt = undefined;
      }
    }

    if (this.hasGroupedOrders) {
      this.#updateGroupedTabSessionsValidatedCount(activeOrder, sessions =>
        sessions.map(({ session, ...rest }) => {
          const sessionCodes = (session.accessTicketIds ?? [])
            .map(id => activeOrder?.accessTickets?.get(id)?.code)
            .filter((code): code is string => !!code);
          const matchCount = unvalidatedCodes.filter(code => sessionCodes.includes(code)).length;
          session.validatedCount = Math.max(0, (session.validatedCount ?? 0) - matchCount);
          return { ...rest, session };
        }),
      );
    } else {
      this.sessionsWithTransfers = this.sessionsWithTransfers.map(({ session, ...rest }) => {
        const sessionCodes = (session.accessTicketIds ?? [])
          .map(id => activeOrder?.accessTickets?.get(id)?.code)
          .filter((code): code is string => !!code);
        const matchCount = unvalidatedCodes.filter(code => sessionCodes.includes(code)).length;
        session.validatedCount = Math.max(0, (session.validatedCount ?? 0) - matchCount);
        return { ...rest, session };
      });
      this.#updateSessionsByDatetime();
    }
  }

  #updateValidateOrderTickets(validatedCodes: string[]): void {
    const activeOrder = this.#activeOrder;
    for (const [, ticket] of activeOrder!.accessTickets!.entries()) {
      if (validatedCodes.includes(ticket.code!)) {
        ticket.isValidated = true;
      }
    }

    if (this.hasGroupedOrders) {
      this.#updateGroupedTabSessionsValidatedCount(activeOrder, sessions =>
        sessions.map(({ session, ...rest }) => {
          session.validatedCount = validatedCodes.length + session.validatedCount!;
          return { ...rest, session };
        }),
      );
    } else {
      this.sessionsWithTransfers = this.sessionsWithTransfers.map(({ session, ...rest }) => {
        session.validatedCount = validatedCodes.length + session.validatedCount!;
        return { ...rest, session };
      });
      this.#updateSessionsByDatetime();
    }
  }

  #validateAll(): void {
    if (this.#isValidatingAll()) {
      return;
    }

    const activeOrder = this.#activeOrder;
    const { codes, tickets } = getSelectedOrderValidation(
      activeOrder,
      this.#getAllSessionsFromOrder(activeOrder),
      this.ticketSelection.selectedKeys(),
    );
    const onsiteSetup = this.onsiteSetupsStorageService.getConfiguration();
    const requests = (codes.length > 0 ? 1 : 0) + tickets.length;

    if (requests === 0) {
      return;
    }

    this.#validateAllRequestsInFlight = requests;
    this.#isValidatingAll.set(true);
    const pendingUnitsByTicket = this.#pendingUnitsByTicket(activeOrder);

    if (codes.length > 0) {
      this.#validateCodes(
        codes,
        undefined,
        undefined,
        undefined,
        onsiteSetup?.access_control_setup_id,
        onsiteSetup?.validation_profiles ?? [],
        () => this.#settleValidateAllRequest(),
      );
    }
    for (const { count, ticketId } of tickets) {
      const expectedPendingUnits = (pendingUnitsByTicket[ticketId] ?? count) - count;
      this.#validateTicket(ticketId, count, validated =>
        this.#settleValidateAllRequest(validated ? { expectedPendingUnits, ticketId } : undefined),
      );
    }
  }

  /**
   * A validated no-code ticket is only reflected once the parent refreshes the order, so the header keeps
   * Validate all blocked until a refresh shows that ticket with the pending units the run left it; a codes
   * batch updates the card locally and releases as soon as its whole flow, modals included, is over.
   */
  #settleValidateAllRequest(validatedTicket?: { expectedPendingUnits: number; ticketId: number }): void {
    this.#validateAllRequestsInFlight = Math.max(0, this.#validateAllRequestsInFlight - 1);
    if (validatedTicket) {
      this.#validateAllAwaitingRefresh = {
        ...this.#validateAllAwaitingRefresh,
        [validatedTicket.ticketId]: validatedTicket.expectedPendingUnits,
      };
      this.#startValidateAllRefreshGrace();
    }
    this.#releaseValidateAllWhenSettled();
  }

  /**
   * The parent coalesces its refreshes, so a lagging GET may be the only one the card ever sees: once the grace
   * period after the last validated ticket is over, nothing stays locked whatever the refreshes reported.
   */
  #startValidateAllRefreshGrace(): void {
    clearTimeout(this.#validateAllRefreshGrace);
    this.#validateAllRefreshGrace = setTimeout(() => {
      this.#validateAllAwaitingRefresh = {};
      this.#releaseValidateAllWhenSettled();
    }, VALIDATE_ALL_REFRESH_GRACE_MS);
  }

  /** A refresh releases the tickets it already reflects. */
  #reconcileValidateAllAfterRefresh(): void {
    const awaiting = Object.entries(this.#validateAllAwaitingRefresh);
    if (awaiting.length === 0) {
      return;
    }

    const pendingUnitsByTicket = this.#pendingUnitsByTicket(this.#activeOrder);
    const stillAwaiting = awaiting.filter(
      ([ticketId, expectedPendingUnits]) => (pendingUnitsByTicket[Number(ticketId)] ?? 0) > expectedPendingUnits,
    );
    this.#validateAllAwaitingRefresh = Object.fromEntries(stillAwaiting);
    this.#releaseValidateAllWhenSettled();
  }

  #pendingUnitsByTicket(order: Order): Record<number, number> {
    const { tickets } = getPendingOrderValidation(order, this.#getAllSessionsFromOrder(order));
    return Object.fromEntries(tickets.map(({ count, ticketId }) => [ticketId, count]));
  }

  #holdSpinner(): void {
    this.#spinnerHolds += 1;
    this.spinnerService.show();
  }

  #releaseSpinner(): void {
    this.#spinnerHolds = Math.max(0, this.#spinnerHolds - 1);
    if (this.#spinnerHolds === 0) {
      this.spinnerService.hide();
    }
  }

  #releaseValidateAllWhenSettled(): void {
    if (this.#validateAllRequestsInFlight === 0 && Object.keys(this.#validateAllAwaitingRefresh).length === 0) {
      clearTimeout(this.#validateAllRefreshGrace);
      this.#isValidatingAll.set(false);
    }
  }

  #reportValidatedCodes(codes: string[], orderId: number | undefined): void {
    if (codes.length === 0) {
      return;
    }

    this.orderAction.emit({
      action: OrderAction.VALIDATE_CODE,
      data: { codes, orderId },
    });
  }

  #validateCodes(
    codes: string[],
    count?: number,
    alreadyValidatedCount?: number,
    force?: any,
    setupId?: string,
    profileIds?: string[],
    onSettled?: () => void,
    alreadyValidatedCodes: string[] = [],
  ): void {
    const activeOrder = this.#activeOrder;
    this.#holdSpinner();
    const finalCount: number = count ?? codes.length;
    const finalAlreadyValidatedCount: number = alreadyValidatedCount ?? 0;

    if (!setupId && this.onsiteSetupStorage?.access_control_setup_id) {
      setupId = this.onsiteSetupStorage.access_control_setup_id;
    }

    this.currentSetupId = setupId;
    this.currentProfileIds = profileIds;

    if (codes.length === 0) {
      this.#releaseSpinner();
      onSettled?.();
      return;
    }

    const startedAt = Date.now();

    from(codes)
      .pipe(
        mergeMap(code =>
          this.accessControlService
            .validateCode(
              this.partnerId,
              code,
              (force && (force[code] || [])) || [],
              setupId,
              profileIds,
              activeOrder?.catalogPlan?.id ?? activeOrder?.planId,
            )
            .pipe(
              catchError(error => {
                return of(error);
              }),
            ),
        ),
        toArray(),
        tap(validations =>
          this.accessControlService.logValidationOperation({
            codeRequestsCount: codes.length,
            flow: 'order_card_codes',
            orders: activeOrder ? [activeOrder] : [],
            partnerId: this.partnerId,
            profileSelectionRequired: validations.some(validation => (validation.profilesToSelect?.length ?? 0) > 0),
            startedAt,
            ticketIdRequestsCount: 0,
            ticketIdUnitsCount: 0,
            totalCount: validations.length,
            validatedCount: validations.filter(validation => validation.validated).length,
          }),
        ),
        finalize(() => this.#releaseSpinner()),
        takeUntil(this.destroy$),
      )
      .subscribe(
        validations => {
          const areAllValidated = validations.every(_ => _.validated);
          const validatedCodes = validations.filter(_ => _.validated).map(_ => _.code);
          const reportedCodes = [...alreadyValidatedCodes, ...validatedCodes];

          if (!areAllValidated) {
            const failedValidations = validations.filter(_ => !_.validated);
            const validatedCount = finalAlreadyValidatedCount + validatedCodes.length;

            if (validatedCodes.length > 0) {
              this.#updateValidateOrderTickets(validatedCodes);
              this.changeDetectorRef.detectChanges();
            }

            const ambiguousProfileValidation = failedValidations.find(v => (v.profilesToSelect?.length ?? 0) > 0);
            const allFailuresAreAmbiguous = failedValidations.every(v => (v.profilesToSelect?.length ?? 0) > 0);
            if (ambiguousProfileValidation?.profilesToSelect && allFailuresAreAmbiguous) {
              this.#openProfileSelectionModalAndRevalidate(
                ambiguousProfileValidation.profilesToSelect,
                failedValidations,
                finalCount,
                validatedCount,
                force,
                setupId,
                onSettled,
                reportedCodes,
              );
              return;
            }

            const allFailedAreProfilesRequired =
              failedValidations.length > 0 && failedValidations.every(v => v.error?.code === ERROR_CODES.PROFILES_REQUIRED_FOR_PLAN);
            if (allFailedAreProfilesRequired) {
              this.#showProfilesRequiredModalAndRedirectToSetup();
              this.#reportValidatedCodes(reportedCodes, activeOrder?.id);
              onSettled?.();
            } else {
              this.#showValidationError(
                finalCount,
                finalAlreadyValidatedCount + validations.filter(_ => _.validated).length,
                failedValidations,
                force,
                onSettled,
                reportedCodes,
              );
            }

            return;
          }

          this.#showFinalResult(finalAlreadyValidatedCount + validations.length, finalCount);
          this.#updateValidateOrderTickets(validatedCodes);

          this.changeDetectorRef.detectChanges();

          this.#reportValidatedCodes(reportedCodes, activeOrder?.id);

          onSettled?.();
        },
        () => {
          this.#reportValidatedCodes(alreadyValidatedCodes, activeOrder?.id);
          onSettled?.();
        },
      );
  }

  #validateTicket(ticketId: number, ticketCount: number, onSettled?: (validated: boolean) => void): void {
    const activeOrder = this.#activeOrder;
    const startedAt = Date.now();
    this.#holdSpinner();
    this.accessControlService
      .validateTicket(this.partnerId, ticketId, ticketCount)
      .pipe(
        tap(response =>
          this.accessControlService.logValidationOperation({
            codeRequestsCount: 0,
            flow: 'order_card_ticket',
            orders: activeOrder ? [activeOrder] : [],
            partnerId: this.partnerId,
            profileSelectionRequired: false,
            startedAt,
            ticketIdRequestsCount: 1,
            ticketIdUnitsCount: ticketCount,
            totalCount: ticketCount,
            validatedCount: response?.data ? ticketCount : 0,
          }),
        ),
        mergeMap(response => (response?.data ? of(response) : throwError(response))),
        finalize(() => this.#releaseSpinner()),
        takeUntil(this.destroy$),
      )
      .subscribe(
        () => {
          onSettled?.(true);
          this.#showModalSuccess(`${ticketCount}`);
          this.orderAction.emit({
            action: OrderAction.VALIDATE_TICKET,
            data: {
              orderId: this.#activeOrder?.id,
              ticketCount: ticketCount,
              ticketId: ticketId,
            },
          });
        },
        response => {
          onSettled?.(false);
          this.#showModalError(response.error?.message);
        },
      );
  }
}
