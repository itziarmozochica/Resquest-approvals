import { Dialog } from '@angular/cdk/dialog';
import { Component, inject, OnDestroy, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';

import { KioskPlanDetail, KioskPlanItem } from '@fz-original/app/modules/kiosk/models/kiosk-plan.model';
import { checkResponseData } from '@fz-original/app/modules/kiosk/utils/response';
import { environment } from '@fz-original/environments/environment';
import { TranslateService } from '@ngx-translate/core';
import { catchError, finalize, forkJoin, mergeMap, of, retry, Subject, takeUntil, timeout } from 'rxjs';

import { DatadogLogLevel } from '../../../../core/error/datadog/logger/datadog-log.service';
import { ClickNewOrderData, ClickNewOrderEvent } from '../../../../core/tracking/core/events/click-new-order';
import { KioskTicketDeliveryClickEvent } from '../../../../core/tracking/core/events/kiosk-ticket-delivery';
import { KioskTicketDeliveryAutoPrintEvent } from '../../../../core/tracking/core/events/kiosk-ticket-delivery-auto-print';
import { SendWebViewEvent } from '../../../../core/tracking/core/events/send-web-view';
import { TrackingService } from '../../../../core/tracking/tracking.service';
import { SelectOption } from '../../../../shared/layout/filters/select/select.interface';
import { Customer } from '../../../../shared/models/customer/customer.model';
import { Order } from '../../../../shared/models/order/order.model';
import { Partner } from '../../../../shared/models/partner/partner.model';
import { PartnerService } from '../../../../shared/services/partner/partner.service';
import { PrintOrderMessageV2 } from '../../../../shared/services/webview-messenger/models/print-order-message_v2.model';
import { PrintingFinished } from '../../../../shared/services/webview-messenger/models/printing-finished.model';
import { WebViewTypeMessage } from '../../../../shared/services/webview-messenger/models/web-view-type-message.model';
import {
  MessageType,
  SourceListen,
  WebviewMessengerService,
} from '../../../../shared/services/webview-messenger/webview-messenger.service';
import { getOrdersForTicketOperations, hasGroupedOrderIds } from '../../../box-office/purchased-cart/prepare-orders-for-print.util';
import { BookingPortal } from '../../services/booking/booking-portal.model';
import { BookingPortalService } from '../../services/booking/booking-portal.service';
import { BookingSessionService } from '../../services/booking/booking-session.service';
import { IdleService } from '../../services/idle/idle.service';
import { KioskLanguageService } from '../../services/kiosk-language.service';
import { KioskStorageService } from '../../services/kiosk-storage.service';
import { KioskService } from '../../services/kiosk.service';
import { PrinterDocumentType } from '../../services/printer/models/printer-instruction.model';
import { PrinterService } from '../../services/printer/printer.service';
import { KioskScreensaverService } from '../../services/screensaver/kiosk-screensaver.service';
import { KioskEmailModalComponent } from '../../shared/components/modals/kiosk-email/kiosk-email-modal.component';
import { KioskEmailModalData } from '../../shared/components/modals/kiosk-email/kiosk-email-modal.model';
import { KioskErrorModalComponent } from '../../shared/components/modals/kiosk-error/kiosk-error-modal.component';
import { KioskPrintModalComponent } from '../../shared/components/modals/kiosk-print/kiosk-print-modal.component';
import { KioskQrModalComponent } from '../../shared/components/modals/kiosk-qr/kiosk-qr-modal.component';
import { KioskNavigationService } from '../../shared/kiosk-navigation.service';
import { TicketMode } from './order-confirmation.enum';

@Component({
  selector: 'app-order-confirmation',
  standalone: false,
  templateUrl: './order-confirmation.component.html',
  styleUrls: ['./order-confirmation.component.scss'],
})
export class OrderConfirmationComponent implements OnInit, OnDestroy {
  #dialog = inject(Dialog);
  readonly #kioskScreensaverService = inject(KioskScreensaverService);
  #kioskService = inject(KioskService);
  protected readonly uiRefreshEnabled: boolean = this.#kioskScreensaverService.isScreensaverEnabled() === true;
  #kioskStorageService = inject(KioskStorageService);
  readonly #bookingPortalService = inject(BookingPortalService);
  readonly #bookingSessionService = inject(BookingSessionService);
  readonly #kioskLanguageService = inject(KioskLanguageService);
  areTicketsAlreadyEmailed = false;
  bookingPortal: BookingPortal | null = null;
  customer: Customer | null = null;
  finishButtonDisabled = true;
  hasNoDeliveryOptions = false;
  isLoading = false;
  isPartnerTUI = false;
  order: Order | null = null;
  otherExperiencesToSchedule: Order[] = [];
  partner: Partner | null = null;
  place: SelectOption | null = null;
  plan: KioskPlanDetail | null = null;
  ticketMode = TicketMode;
  unifyTickets = true;

  protected readonly TicketMode = TicketMode;

  #optionsByPartners: Record<number, string[]> = {
    8874: [TicketMode.QR, TicketMode.Email, TicketMode.Print], // SO TEST
    30410: [TicketMode.QR, TicketMode.Print], // Le Space
    45137: [TicketMode.QR, TicketMode.Print], // Victory Hill Exhibitions Pte. Ltd.
    10536: [TicketMode.Email, TicketMode.Print], // Fundació la Caixa
    46458: [TicketMode.QR, TicketMode.Email], // Mandai Park Development Pte. Ltd. - SG (printing disabled)
    143666: [], // Merlin Attractions Operations limited
    153738: [], // Merlin Demo
    168334: [], // Merlin Entertainments Group US Holdings Inc - US
  };

  #autoPrintPartners = new Set<number>([143666, 153738, 168334]);

  #selectedCity: SelectOption | null = null;
  #destroy$ = new Subject<void>();
  #otherExperienceKioskCoverImage: string | undefined;

  constructor(
    private route: ActivatedRoute,
    private kioskNavigationService: KioskNavigationService,
    private trackingService: TrackingService,
    private webviewMessenger: WebviewMessengerService,
    private printerService: PrinterService,
    private translate: TranslateService,
    private idleService: IdleService,
    private partnerService: PartnerService,
  ) {}

  get emailOptionTranslationKey(): string {
    return this.areTicketsAlreadyEmailed
      ? 'kiosk.orderConfirmation.getTickets.emailOptionAlreadySent'
      : 'kiosk.orderConfirmation.getTickets.emailOption';
  }

  get emailTitleTranslationKey(): string {
    return this.areTicketsAlreadyEmailed
      ? 'kiosk.orderConfirmation.getTickets.titleAlreadySent'
      : 'kiosk.orderConfirmation.getTickets.title';
  }

  ngOnInit(): void {
    this.order = this.route.snapshot.data.orderData.order;
    this.customer = this.route.snapshot.data.orderData.customer;
    this.plan = this.#kioskStorageService.getPlan();
    this.partner = this.partnerService.getPartner();
    this.unifyTickets = this.#kioskStorageService.getOnsiteSetup()?.print_tickets_combined ?? true;
    this.otherExperiencesToSchedule = this.#resolveOtherExperiencesToSchedule();
    this.#loadBookingPortal();
    this.#loadOtherExperienceCoverImage();

    this.webviewMessenger.setUpPage(SourceListen.order);
    this.isPartnerTUI = this.partner?.id === environment.partners.TUI;
    this.areTicketsAlreadyEmailed = Boolean(this.customer?.email);
    const partnerId = this.partner?.id;
    this.hasNoDeliveryOptions = partnerId !== undefined && this.#optionsByPartners[partnerId]?.length === 0;
    const shouldAutoPrint = partnerId !== undefined && this.#autoPrintPartners.has(partnerId);

    if (shouldAutoPrint) {
      this.#trackAutoPrint();
      this.#openDeliveryFlow(TicketMode.Print);
    } else if (this.isPartnerTUI || this.hasNoDeliveryOptions) {
      this.finishButtonDisabled = false;
      this.#setIdleTime({ orderCompleted: true });
    }
  }

  ngOnDestroy(): void {
    this.#destroy$.next();
  }

  navigateToNewOrder(): void {
    if (this.finishButtonDisabled) return;
    this.#sendNewOrderEvent();
    this.#navigateHome();
  }

  get canManageBooking(): boolean {
    return this.#kioskStorageService.getOnsiteSetup()?.show_manage_booking === true && !!this.bookingPortal?.otoken;
  }

  get otherExperienceThumbnail(): string | undefined {
    const representative = this.#otherExperienceRepresentative;
    return representative ? this.#resolveOtherExperienceCoverImage(representative) : undefined;
  }

  get shouldShowOtherExperiences(): boolean {
    return this.canManageBooking && this.otherExperiencesToSchedule.length > 0;
  }

  manageBooking(): void {
    const otoken = this.bookingPortal?.otoken;
    if (!otoken) {
      return;
    }
    this.#bookingSessionService.startSession(otoken);
    this.kioskNavigationService.navigateBookingList();
  }

  #loadBookingPortal(): void {
    if (this.partner === null || this.plan === null || this.order?.id === undefined) {
      return;
    }
    this.#bookingPortalService
      .getBookingPortal(this.partner.id, this.plan.id, this.plan.place.id, this.order.id)
      .pipe(takeUntil(this.#destroy$))
      .subscribe(bookingPortal => (this.bookingPortal = bookingPortal));
  }

  #resolveOtherExperiencesToSchedule(): Order[] {
    const currentOrderId = this.order?.id;
    return (this.route.snapshot.data.orderData.ordersInGroup ?? []).filter(
      (groupOrder: Order) => groupOrder.id !== currentOrderId && groupOrder.entitlementsInfo?.status === 'pending_to_schedule',
    );
  }

  get #otherExperienceRepresentative(): Order | undefined {
    const [firstPendingSibling] = this.otherExperiencesToSchedule;
    if (firstPendingSibling === undefined) {
      return undefined;
    }
    const experienceId = firstPendingSibling.mainOrderId ?? firstPendingSibling.id;
    const ordersInGroup: Order[] = this.route.snapshot.data.orderData.ordersInGroup ?? [];
    return ordersInGroup.find(groupOrder => groupOrder.id === experienceId) ?? firstPendingSibling;
  }

  #resolveOtherExperienceCoverImage(representative: Order): string | undefined {
    return this.#otherExperienceKioskCoverImage ?? representative.coverImageUrl;
  }

  #loadOtherExperienceCoverImage(): void {
    if (this.#kioskStorageService.getOnsiteSetup()?.show_manage_booking !== true) {
      return;
    }
    const partnerId = this.partner?.id;
    const planId = this.#otherExperienceRepresentative?.planId;
    if (partnerId === undefined || planId === undefined) {
      return;
    }
    this.#kioskService
      .getKioskPlans([planId], partnerId, this.translate.currentLang)
      .pipe(takeUntil(this.#destroy$))
      .subscribe({
        next: ([plan]: KioskPlanItem[]) => {
          this.#otherExperienceKioskCoverImage = plan?.kiosk_cover_image ?? plan?.cover_image ?? undefined;
        },
        error: () => {
          // Falls back to Order.coverImageUrl (see #resolveOtherExperienceCoverImage)
        },
      });
  }

  selectTicketMode(selectedTicketMode: TicketMode): void {
    this.#openDeliveryFlow(selectedTicketMode);

    this.trackingService.track(
      new KioskTicketDeliveryClickEvent({
        order_id: this.order!.id!,
        option: selectedTicketMode,
        has_email_only: this.isPartnerTUI,
        ...this.#getMixpanelData(),
      }),
    );
  }

  #openDeliveryFlow(selectedTicketMode: TicketMode): void {
    this.#setIdleTime({ orderCompleted: false });

    if (selectedTicketMode === TicketMode.QR) {
      const qrDialog = this.#dialog.open(KioskQrModalComponent, {
        data: {
          order: this.order,
          partnerId: this.partner?.id,
          countdown: this.idleService.getRemainingTime(),
        },
      });
      qrDialog.closed.subscribe(() => {
        this.finishButtonDisabled = false;
        this.#setIdleTime({ orderCompleted: true });
      });
    } else if (selectedTicketMode === TicketMode.Print) {
      const printDialog = this.#dialog.open(KioskPrintModalComponent, { disableClose: true });
      this.#printTicketsAndReceipt();

      printDialog.closed.subscribe(() => {
        this.finishButtonDisabled = false;
        this.#setIdleTime({ orderCompleted: true });
      });
    } else if (selectedTicketMode === TicketMode.Email) {
      const emailDialog = this.#dialog.open<boolean | undefined, KioskEmailModalData>(KioskEmailModalComponent, {
        data: {
          email: this.customer?.email,
          partnerId: this.partner!.id,
          planId: this.plan!.id,
          placeId: this.plan!.place.id,
          orderId: this.order!.id!,
        },
      });

      emailDialog.closed.subscribe(state => {
        if (state === undefined) {
          return;
        }

        this.finishButtonDisabled = false;
        if (state === true) {
          this.#setIdleTime({ orderCompleted: true });
        }
      });
    }
  }

  shouldShowDeliveryOption(option: TicketMode): boolean {
    const partnerId = this.partner?.id;
    if (partnerId === undefined) {
      return true;
    }
    const optionsByPartner = this.#optionsByPartners[partnerId];
    if (optionsByPartner !== undefined) {
      return optionsByPartner.includes(option);
    }
    return true;
  }

  #navigateHome(): void {
    this.#kioskLanguageService.useDefaultLanguage();
    this.kioskNavigationService.navigateHome();
  }

  #setIdleTime({ orderCompleted }: { orderCompleted: boolean }): void {
    const idleTime = orderCompleted ? 5 : 45;
    const timeoutTime = orderCompleted ? 10 : 30;

    this.idleService
      .get(idleTime, timeoutTime)
      .pipe(takeUntil(this.#destroy$))
      .subscribe(() => {
        this.#dialog.closeAll();
        this.#navigateHome();
      });
  }

  #printTicketsAndReceipt(): void {
    this.isLoading = true;

    const ordersForPrint: Order[] | null = this.route.snapshot.data.orderData.ordersForPrint ?? null;
    const mainOrder = this.#resolveMainOrderForPrint(ordersForPrint);
    const orderId = mainOrder.id!;
    const partnerId = this.partner!.id;
    const ordersForTicketPrint = getOrdersForTicketOperations(ordersForPrint, mainOrder);

    this.#kioskService.logTrace(`Generate tickets for printing R${orderId}`, DatadogLogLevel.Info, {
      order_id: orderId,
      order_ids_for_ticket_print: ordersForTicketPrint.map(order => order.id),
      type: WebViewTypeMessage.print_order_v2,
    });

    const { ticket, receipt } = PrinterDocumentType;
    const ticketObs = ordersForTicketPrint.map(order =>
      this.printerService
        .generatePrinterInstructions(partnerId, order.planId!, this.#resolveThermalPlaceId(order), order.id!, ticket, this.unifyTickets)
        .pipe(
          mergeMap(response => checkResponseData(response)),
          retry(3),
        ),
    );

    const receiptObs = this.printerService
      .generatePrinterInstructions(
        partnerId,
        mainOrder.planId!,
        this.#resolveThermalPlaceId(mainOrder),
        orderId,
        receipt,
        this.unifyTickets,
      )
      .pipe(
        mergeMap(response => checkResponseData(response)),
        retry(3),
      );

    forkJoin([...ticketObs, receiptObs])
      .pipe(
        finalize(() => (this.isLoading = false)),
        takeUntil(this.#destroy$),
      )
      .subscribe({
        next: responses => {
          const receiptResponse = responses[responses.length - 1];
          const ticketResponses = responses.slice(0, -1);
          const allInstructions = [...ticketResponses.flatMap(response => response.data ?? []), ...(receiptResponse.data ?? [])];
          this.webviewMessenger.sendWebViewMessage(new PrintOrderMessageV2({ order_id: orderId, instructions: allInstructions }));
          this.trackingService.track(new SendWebViewEvent({ ...this.#getMixpanelData() }));
        },
        error: error =>
          this.#dialog.open(KioskErrorModalComponent, {
            data: {
              title: this.translate.instant('common.errorTitle'),
              messages: [this.translate.instant(error.error.message)],
            },
          }),
        complete: () => {
          const approxRequestTime = 3000;
          const timePerTicket = 3000;
          const ticketSlipCount = this.#getTicketSlipCountForPrintDelay(ordersForTicketPrint);
          const delay: number = approxRequestTime + ticketSlipCount * timePerTicket;

          this.#waitForPrintCompletion(orderId, delay);
        },
      });
  }

  #waitForPrintCompletion(orderId: number, delay: number): void {
    this.webviewMessenger
      .observeOnce<PrintingFinished>(MessageType.KioskPrintingFinished)
      .pipe(
        timeout(delay),
        catchError(() => of(null)),
        takeUntil(this.#destroy$),
      )
      .subscribe((message: PrintingFinished | null) => {
        if (message === null) {
          this.#kioskService.logTrace(`Order print not confirmed, closing after timeout R${orderId}`, DatadogLogLevel.Warn, {
            order_id: orderId,
            timed_out: true,
          });
        } else if (message.success) {
          this.#kioskService.logTrace(`Order printed R${orderId}`, DatadogLogLevel.Info, { order_id: orderId, success: true });
        } else {
          this.#kioskService.logTrace(`Order print failed R${orderId}`, DatadogLogLevel.Error, {
            order_id: orderId,
            success: false,
            reason: message.reason,
          });
        }
        this.#dialog.closeAll();
        this.finishButtonDisabled = false;
      });
  }

  #resolveMainOrderForPrint(ordersForPrint: Order[] | null): Order {
    return ordersForPrint?.find(hasGroupedOrderIds) ?? this.order!;
  }

  #resolveThermalPlaceId(order: Order): number {
    return order.placeId ?? this.plan!.place.id;
  }

  #getTicketSlipCountForPrintDelay(ordersForTicketPrint: Order[]): number {
    if (this.unifyTickets) {
      return ordersForTicketPrint.length || 1;
    }

    const codedTicketCount = ordersForTicketPrint.reduce((total, order) => total + (order.accessTickets?.size ?? 0), 0);

    return codedTicketCount || this.order?.cart?.getNumberOfTicketCounts() || 1;
  }

  #sendNewOrderEvent(): void {
    this.trackingService.track(
      new ClickNewOrderEvent({
        ...this.#getMixpanelData(),
        channel: this.#kioskStorageService.getChannelId(),
      }),
    );
  }

  #trackAutoPrint(): void {
    this.trackingService.track(
      new KioskTicketDeliveryAutoPrintEvent({
        order_id: this.order!.id!,
        partner_id: this.partner!.id,
        plan_id: this.plan!.id,
        place_id: this.plan!.place.id,
      }),
    );
  }

  #getMixpanelData(): ClickNewOrderData {
    return {
      city_id: this.#selectedCity?.id ?? 0,
      city_name: this.#selectedCity?.title ?? '',
      plan_id: this.order!.effectivePlanId!,
      plan_name: this.order!.effectivePlanName!,
      place_id: this.plan!.place.id,
      place_name: this.plan!.place.name,
      time: new Date().toISOString(),
      from_order_id: this.order!.id!,
    };
  }
}
