import { Dialog, DialogRef } from '@angular/cdk/dialog';
import { ChangeDetectorRef, Component, DestroyRef, inject, OnInit, Signal, signal, WritableSignal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router } from '@angular/router';

import { AgreementSigningModalService } from '@fz-original/app/agreements/signing/modal/services/agreement-signing-modal.service';
import { BreakpointStateService } from '@fz-original/app/app/services/breakpoint/breakpoint-state.service';
import { GiftAidConfirmationModalComponent } from '@fz-original/app/modules/box-office/gift-aid/components/confirmation-modal/gift-aid-confirmation-modal.component';
import { GiftAidConfirmationModalData } from '@fz-original/app/modules/box-office/gift-aid/models/gift-aid-confirmation-modal.model';
import { GiftAidDetectionService } from '@fz-original/app/modules/box-office/gift-aid/services/gift-aid-detection.service';
import { PrintStatus } from '@fz-original/app/modules/box-office/shared/services/adyen-printer/models/print-status.model';
import { toPrintDeviceId } from '@fz-original/app/payments/models/tap-to-pay.model';
import { BookingQuestionsModalService } from '@fz-original/app/shared/booking-questions/booking-questions-modal.service';
import { TOGGLE_FOOTER_EVENT_KEY } from '@fz-original/app/shared/layout/footer/toggle-footer-event-key';
import { FeatureFlags } from '@fz-original/app/shared/optimizely/feature-flags';
import { SearchBarService } from '@fz-original/app/shared/search-bar/service/search-bar.service';
import { DownloadFilesService } from '@fz-original/app/shared/services/download/download-files.service';
import {
  PrintDocumentType,
  PrintEntryPoint,
  PrintPrinterType,
  toPrintDocumentType,
} from '@fz-original/app/shared/services/print-facade/print-facade.enums';
import { PrintFacadeService } from '@fz-original/app/shared/services/print-facade/print-facade.service';
import { UserService } from '@fz-original/app/shared/services/user/user.service';
import { NgbModal, NgbModalOptions, NgbModalRef } from '@ng-bootstrap/ng-bootstrap';
import { TranslateService } from '@ngx-translate/core';
import { BehaviorSubject, EMPTY, NEVER, Observable, of, throwError, timer } from 'rxjs';
import { catchError, concatMap, finalize, map, mergeMap, switchMap, take, tap } from 'rxjs/operators';

import { ClickGetDeliveryNoteData, ClickGetDeliveryNoteEvent } from '../../../core/tracking/core/events/click-get-delivery-note';
import { ClickNewOrderData, ClickNewOrderEvent } from '../../../core/tracking/core/events/click-new-order';
import { ConfirmValidateTicketsEvent } from '../../../core/tracking/core/events/confirm-validate-tickets';
import { ScreenTypeaheadInput } from '../../../core/tracking/core/events/select-option-typeahead';
import { ViewTicketData, ViewTicketEvent } from '../../../core/tracking/core/events/view-ticket';
import { TrackingService } from '../../../core/tracking/tracking.service';
import { ExportTypeEnum } from '../../../shared/components/export-list-button/export-option.model';
import { MessageModalComponent } from '../../../shared/components/message-modal/message-modal.component';
import { ValidationSuccessComponent } from '../../../shared/components/order/components/validation-success/validation-success.component';
import { SpinnerModalComponent } from '../../../shared/components/spinner-modal/spinner-modal.component';
import { SelectOption } from '../../../shared/layout/filters/select/select.interface';
import { SpinnerService } from '../../../shared/layout/spinner/spinner.service';
import { BaseResponse } from '../../../shared/models/base-response';
import { getAgreementGateAction, isOrderAgreementBlocked } from '../../../shared/models/order/order-agreement-gate.util';
import { OrderChannelType } from '../../../shared/models/order/order-channel-type.model';
import { Order } from '../../../shared/models/order/order.model';
import { TicketReleaseConditionAction } from '../../../shared/models/order/release-condition.model';
import { Partner } from '../../../shared/models/partner/partner.model';
import { Plan } from '../../../shared/models/plan/plan.model';
import { OptimizelyService } from '../../../shared/optimizely/optimizely.service';
import { SearchFilter } from '../../../shared/search-bar/models/search-filter.model';
import { CheckoutLoggerService } from '../../../shared/services/checkout-logger/checkout-logger.service';
import { CheckoutLogContext } from '../../../shared/services/checkout-logger/models/checkout-log-context.interface';
import { CheckoutStageEnum } from '../../../shared/services/checkout-logger/models/checkout-stage.enum';
import { DualScreenStorageService } from '../../../shared/services/dual-screen/dual-screen-storage.service';
import { CAPN_ID, PartnerService } from '../../../shared/services/partner/partner.service';
import { PurchaseService } from '../../../shared/services/purchase/purchase.service';
import { Channel } from '../../../shared/services/session-availability/channel.enum';
import { ScrollUtils } from '../../../shared/utils/scroll.utils';
import { PrinterDocumentType } from '../../kiosk/services/printer/models/printer-instruction.model';
import { ClickGetDeliveryNoteSourceEnum } from '../../reservation/models/click-get-delivery-note-source.enum';
import { ReservationsService } from '../../reservation/services/reservations.service';
import { ValidationTypeEnum } from '../../validation/enums/validation-type.enum';
import { AccessControlService, ValidateAllCodesResult } from '../../validation/services/access-control/access-control.service';
import { PaymentType } from '../checkout/models/payment-type.enum';
import { OboPrinterTypeEnum, OnsiteSetup, ShiftStrategyEnum, TicketValidationTypeEnum } from '../shared/models/onsite-setup';
import type { AdyenPrinterService } from '../shared/services/adyen-printer/adyen-printer.service';
import { AdyenPrinterNotAcceptableConditionsError } from '../shared/services/adyen-printer/errors/adyen-printer-not-acceptable-conditions.error';
import { AdyenPrinterRejectedError } from '../shared/services/adyen-printer/errors/adyen-printer-rejected.error';
import { AdyenPrinterTimeoutError } from '../shared/services/adyen-printer/errors/adyen-printer-timeout.error';
import { OnsiteSetupsStorageService } from '../shared/services/onsite-setups/onsite-setups-storage.service';
import { PaymentConfigStorageService } from '../shared/services/payment/payment-config-storage.service';
import { canPrintOnAdyenTerminal } from '../shared/utils/adyen-terminal-printing.util';

@Component({
  selector: 'app-order',
  standalone: false,
  templateUrl: './order.component.html',
  styleUrls: ['./order.component.scss', '../../../../theme/general/_box-office.scss'],
})
export class OrderComponent implements OnInit {
  static readonly giftAidConfirmationTitleKey = 'boxOffice.order.giftAid.confirmation.title';
  static readonly giftAidConfirmationMessageKey = 'boxOffice.order.giftAid.confirmation.message';
  static readonly giftAidConfirmationPrintButtonKey = 'boxOffice.order.giftAid.confirmation.print';
  static readonly giftAidCustomerCopyTitleKey = 'boxOffice.order.giftAid.customerCopy.title';
  static readonly giftAidCustomerCopyMessageKey = 'boxOffice.order.giftAid.customerCopy.message';
  static readonly giftAidCustomerCopyPrintButtonKey = 'boxOffice.order.giftAid.customerCopy.print';
  static readonly giftAidCustomerCopySkipButtonKey = 'boxOffice.order.giftAid.customerCopy.skip';

  static readonly giftAidPrintingMessageKey = 'boxOffice.order.giftAid.printing';
  static readonly giftAidErrorTitleKey = 'boxOffice.order.giftAid.errors.title';
  static readonly giftAidErrorPrintingFailedKey = 'boxOffice.order.giftAid.errors.printingFailed';
  static readonly commonErrorTitleKey = 'common.errorTitle';
  static readonly bookingQuestionsGenericErrorKey = 'bookingQuestions.errors.generic';
  static readonly adyenPrinterErrorTitleKey = 'boxOffice.order.adyenPrinter.errors.title';
  static readonly adyenPrinterUnknownErrorKey = 'boxOffice.order.adyenPrinter.errors.messages.uknown';
  static readonly adyenPrinterNotAcceptableConditionsKey = 'boxOffice.order.adyenPrinter.errors.messages.notAcceptablePreconditions';
  static readonly adyenPrinterRejectedErrorKey = 'boxOffice.order.adyenPrinter.errors.messages.rejected';
  static readonly adyenPrinterTimeoutErrorKey = 'boxOffice.order.adyenPrinter.errors.messages.timeout';
  static readonly adyenPrinterPrintingKey = 'boxOffice.order.adyenPrinter.printing';
  static readonly adyenPrinterCancelButtonKey = 'boxOffice.order.adyenPrinter.errors.buttons.cancel';
  static readonly adyenPrinterRetryButtonKey = 'boxOffice.order.adyenPrinter.errors.buttons.retry';
  static readonly validateTicketsNotAllowedKey = 'validateTicketsNew.validationNotAllowed';
  static readonly genericErrorKey = 'errors.generic';
  readonly #agreementSigningModalService = inject(AgreementSigningModalService);
  #bookingQuestionsModalService: BookingQuestionsModalService = inject(BookingQuestionsModalService);
  #destroyRef = inject(DestroyRef);
  #dialog = inject(Dialog);
  #downloadFilesService = inject(DownloadFilesService);
  #giftAidDetectionService = inject(GiftAidDetectionService);
  #isPrintingSpinnerDone$ = new BehaviorSubject(false);
  #isPrintingTicketsAndReceiptDone: WritableSignal<boolean> = signal<boolean>(false);
  #isPrintingDeclarationDone: WritableSignal<boolean> = signal<boolean>(false);
  #onsiteSetupsStorageService: OnsiteSetupsStorageService = inject(OnsiteSetupsStorageService);
  #optimizelyService: OptimizelyService = inject(OptimizelyService);
  #partnerService: PartnerService = inject(PartnerService);
  readonly #purchaseService: PurchaseService = inject(PurchaseService);
  readonly #printFacadeService = inject(PrintFacadeService);
  #selectedCity!: SelectOption | undefined;
  #selectedPlace!: SelectOption | undefined;
  #timezone!: string;
  #userService = inject(UserService);
  #breakpointStateService = inject(BreakpointStateService);
  #searchBarService = inject(SearchBarService);
  closeIt: WritableSignal<{ timestamp: number }> = signal<{ timestamp: number }>({ timestamp: 0 });
  isMobile: Signal<boolean> = this.#breakpointStateService.getStateProp('isMobile');
  selectedPlan!: SelectOption | undefined;

  get autovalidateTickets(): boolean {
    return (
      this.onsiteSetupStorage?.ticket_validation == TicketValidationTypeEnum.autovalidation &&
      this.order?.channelType === OrderChannelType.BOX_OFFICE &&
      !this.order?.cart?.hasSessionsInFuture
    );
  }

  get hasViewTicketDisabled(): boolean {
    return (
      this.#optimizelyService.isFeatureEnabled('do_not_print_tickets_after_selling') ||
      !this.#userService.hasPermission('can_reprint') ||
      !this.#hasTickets()
    );
  }

  get partnerId(): number | undefined {
    return this.partner?.id ?? this.#partnerService.getPartner()?.id;
  }

  protected readonly agreementAction: WritableSignal<TicketReleaseConditionAction | null> = signal<TicketReleaseConditionAction | null>(
    null,
  );
  protected readonly agreementBlocked: WritableSignal<boolean> = signal<boolean>(false);
  order: Order | null = null;
  partner: Partner | null = null;
  plan: Plan | null = null;
  autoPrint = false;
  screen = ScreenTypeaheadInput;
  isMobilePoS = false;
  printTicketsCombinedForPlans: number[] = [];
  hasShiftsEnabled = false;
  currency!: string;
  showValidateButton = false;
  onsiteSetupStorage: OnsiteSetup | null = null;
  loadingDeliveryNote = false;
  locale: string;
  isDualScreen = false;
  isOssFlow = false;
  shouldDisplayShiftControls: WritableSignal<boolean> = signal<boolean>(false);

  /**
   * @todo remove these from the constructor
   * and use injects instead.
   *
   * Also re-arrange methods.
   */
  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private spinnerService: SpinnerService,
    private trackingService: TrackingService,
    private paymentConfigStorageService: PaymentConfigStorageService,
    private modalService: NgbModal,
    private translate: TranslateService,
    private accessControlService: AccessControlService,
    private reservationsService: ReservationsService,
    private ref: ChangeDetectorRef,
    private checkoutLogger: CheckoutLoggerService,
    private dualScreenStorageService: DualScreenStorageService,
  ) {
    this.locale = this.translate.currentLang;
    this.onsiteSetupStorage = this.#onsiteSetupsStorageService.getConfiguration();
    this.loadShift();
  }

  private loadShift(): void {
    this.hasShiftsEnabled = (this.onsiteSetupStorage?.shift_strategy ?? ShiftStrategyEnum.disabled) !== ShiftStrategyEnum.disabled;
  }

  async ngOnInit(): Promise<void> {
    this.spinnerService.show();
    this.order = this.route.snapshot.data.orderData.order;
    this.plan = this.route.snapshot.data.orderData.plan;
    this.autoPrint = this.route.snapshot.data.orderData.autoPrint;
    this.isOssFlow = this.route.snapshot.data.orderData.isOssFlow;
    this.isMobilePoS = this.paymentConfigStorageService.isMobilePos();
    this.printTicketsCombinedForPlans = this.onsiteSetupStorage?.print_tickets_combined_for_plans ?? [];
    this.currency = this.order?.cart?.total?.currency ?? '';
    this.showValidateButton = Array.from(this.order?.ticketsAndProducts?.values() || []).some(({ isValidated }) => !isValidated);
    this.#updateAgreementGate();
    this.spinnerService.hide();
    this.isDualScreen = this.dualScreenStorageService.containsData();
    this.#hideFooter();
    this.#updateShouldDisplayShiftControls();
  }

  #updateShouldDisplayShiftControls(): void {
    if (this.isOssFlow) {
      this.shouldDisplayShiftControls.set(false);
      return;
    }
    const hasMandatoryFilters = Boolean(this.#selectedCity && this.#selectedPlace && this.currency);
    const shouldDisplay = Boolean(this.hasShiftsEnabled && hasMandatoryFilters);
    this.shouldDisplayShiftControls.set(shouldDisplay);
  }

  loadNewSearch(filters: SearchFilter): void {
    this.partner = filters.partner;
    this.#selectedCity = filters.selectedCity;
    this.selectedPlan = filters.selectedPlan;
    this.#selectedPlace = filters.selectedPlace;
    this.#timezone = filters.timezone;
    this.resetScroll();
    this.applyPrinter();
    this.handleBookingQuestions();
    this.#updateShouldDisplayShiftControls();
  }

  hasAllMandatoryFilters(hasDataChange: boolean): void {
    this.#searchBarService.closeOnMobileWhenAllMandatoryFilters(hasDataChange, this.isMobile, this.closeIt);
  }

  private handleBookingQuestions(): void {
    this.#isPrintingSpinnerDone$
      .asObservable()
      .pipe(
        switchMap((isPrintingSpinnerDone: boolean) => {
          if (isPrintingSpinnerDone && this.order) {
            if (!this.#isPrintingTicketsAndReceiptDone()) {
              this.#isPrintingTicketsAndReceiptDone.set(true);
              return this.#bookingQuestionsModalService.handlePostBookingQuestions(this.order!).pipe(
                switchMap(() => {
                  const deviceId: string | undefined = toPrintDeviceId(this.paymentConfigStorageService.getConfiguration()?.deviceId);
                  if (deviceId !== undefined) {
                    return this.#handleGiftAidFlow(deviceId);
                  }
                  return of(null);
                }),
              );
            }
            if (isPrintingSpinnerDone && this.#isPrintingTicketsAndReceiptDone() && !this.#isPrintingDeclarationDone()) {
              const deviceId: string | undefined = toPrintDeviceId(this.paymentConfigStorageService.getConfiguration()?.deviceId);
              if (deviceId !== undefined) {
                return this.#handleGiftAidFlow(deviceId, true);
              }
            }
          }
          return of(null);
        }),
        catchError(error => {
          this.showErrorModal(this.translate.instant(OrderComponent.commonErrorTitleKey), [
            this.translate.instant(error?.message ?? error?.error?.message ?? OrderComponent.bookingQuestionsGenericErrorKey),
          ]);
          return of(null);
        }),
        takeUntilDestroyed(this.#destroyRef),
      )
      .subscribe();
  }

  private applyPrinter(): void {
    if (this.autoPrint && this.agreementBlocked()) {
      this.checkoutLogger.info(
        'Skipping auto ticket print and auto validation due to unsigned agreement release condition',
        this.getCheckoutLoggerContext(),
        {
          cartId: this.order?.cart?.id,
          orderId: this.order?.id,
        },
      );
      if (this.#hasTicketsOrProducts()) {
        this.autoPrintReceipt();
      }
      this.#isPrintingSpinnerDone$.next(true);
      return;
    }
    if (this.autoPrint) {
      this.checkoutLogger.info('Executing auto print order', this.getCheckoutLoggerContext(), {
        cartId: this.order?.cart?.id,
        orderId: this.order?.id,
      });

      if (this.#hasTicketsOrProducts()) {
        if (this.onsiteSetupStorage?.obo_printer_type === OboPrinterTypeEnum.adyen_printer) {
          this.printTicketsAndReceipt();
        } else {
          if (!this.isMobilePoS) {
            this.printOrder();
          }
          this.autoPrintReceipt();
        }
        if (this.autovalidateTickets) {
          setTimeout(() => {
            this.validateTickets();
          });
        }
      } else {
        this.checkoutLogger.info('Skipping printing - order contains no tickets or products', this.getCheckoutLoggerContext(), {
          cartId: this.order?.cart?.id,
          orderId: this.order?.id,
        });
      }
    }
    this.#isPrintingSpinnerDone$.next(true);
  }

  #printOrders$(orders: { order: Order; isUnifiedTicket?: boolean }[]): Observable<void> {
    return this.#printFacadeService.dispatch({
      documentType: PrintDocumentType.ticket,
      entryPoint: PrintEntryPoint.box_office_order_print_orders,
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
      entryPoint: PrintEntryPoint.box_office_order_print_adyen,
      printerType: PrintPrinterType.adyen,
      target: { args, method: 'printAdyen' },
    });
  }

  private printOrder(): void {
    if (this.agreementBlocked()) {
      return;
    }
    if (
      !this.order ||
      (this.dualScreenStorageService.containsData() &&
        this.#onsiteSetupsStorageService.getConfiguration()?.obo_printer_type === OboPrinterTypeEnum.no_printer)
    ) {
      return;
    }
    const isUnifiedTicket = this.isPrintTicketsCombinedForPlansEnabled(this.order!.planId!);
    this.#printOrders$([{ order: this.order!, isUnifiedTicket }])
      .pipe(takeUntilDestroyed(this.#destroyRef))
      .subscribe();
  }

  private isReceiptPrintingDisabled(): boolean {
    const disableAutoPrintReceipt = this.#optimizelyService.isFeatureEnabled('disable_auto_print_receipt', {
      plan_id: this.selectedPlan!.id.toString(),
    });
    const cartAmountZero: boolean = this.order?.cart?.total?.amount === 0;
    const capnCashPayment: boolean = this.partnerId == CAPN_ID && this.order?.cart?.paymentMethod === PaymentType.CASH;
    return disableAutoPrintReceipt || cartAmountZero || capnCashPayment;
  }

  #isReceiptPrintingDisabledLog(): void {
    this.checkoutLogger.info(
      'Ignoring print due to: is disabled by optimizely, is a free cart or is paid by delegated',
      this.getCheckoutLoggerContext(),
      {
        cartId: this.order?.cart?.id,
        orderId: this.order?.id,
        amount: this.order?.cart?.total?.amount,
        paymentMethod: this.order?.cart?.paymentMethod,
      },
    );
  }

  private autoPrintReceipt(): void {
    if (this.isReceiptPrintingDisabled()) {
      this.#isReceiptPrintingDisabledLog();
      return;
    }
    const paymentConfigStorage = this.paymentConfigStorageService.getConfiguration();
    const canPrintOnTerminal =
      Boolean(paymentConfigStorage?.deviceId) && canPrintOnAdyenTerminal(paymentConfigStorage, this.onsiteSetupStorage);
    if (canPrintOnTerminal) {
      this.printAdyen(PrinterDocumentType.receipt);
    } else {
      this.checkoutLogger.info('Ignoring print due to Adyen is not set', this.getCheckoutLoggerContext(), {
        cartId: this.order?.cart?.id,
        orderId: this.order?.id,
      });
    }
    if (
      canPrintOnTerminal &&
      this.order?.paymentMethod === PaymentType.CASH &&
      this.#optimizelyService.isFeatureEnabled('cashlogy_integration', {
        plan_id: this.selectedPlan!.id.toString(),
      })
    ) {
      this.printAdyen(PrinterDocumentType.cash_integration);
    } else {
      this.checkoutLogger.info('Ignoring print due to Adyen is not set', this.getCheckoutLoggerContext(), {
        cartId: this.order?.cart?.id,
        orderId: this.order?.id,
      });
    }
  }

  private printAdyenLog(message: string, documentType: PrinterDocumentType, deviceId: string, error?: any): void {
    this.checkoutLogger.info(
      message,
      this.getCheckoutLoggerContext({
        documentType,
        error: error?.toString(),
      }),
      {
        cartId: this.order?.cart?.id,
        orderId: this.order?.id,
        deviceId,
        error,
      },
    );
  }

  #resolveAdyenPrinterPlaceId(): number {
    const onsite = this.#onsiteSetupsStorageService.getConfiguration();
    return onsite?.place?.id ?? onsite?.place_id ?? this.#selectedPlace!.id;
  }

  printAdyen(documentType: PrinterDocumentType, atIndex?: number): void {
    if (documentType === PrinterDocumentType.ticket && this.agreementBlocked()) {
      return;
    }
    if (!this.#hasTicketsOrProducts()) {
      return;
    }
    const deviceId = toPrintDeviceId(this.paymentConfigStorageService.getConfiguration()?.deviceId);
    if (documentType === PrinterDocumentType.ticket && !deviceId) {
      this.printOrder();
      return;
    }
    const isUnifyTicket = this.isPrintTicketsCombinedForPlansEnabled(this.order?.planId ?? 0);

    try {
      if (this.partnerId === undefined) {
        throwError(new Error('Partner Id is undefined'));
      }
      this.#printAdyen$(toPrintDocumentType(documentType), [
        this.partnerId!,
        this.selectedPlan!.id,
        this.#resolveAdyenPrinterPlaceId(),
        this.order?.id ?? 0,
        deviceId ?? '',
        documentType,
        atIndex,
        isUnifyTicket,
      ])
        .pipe(takeUntilDestroyed(this.#destroyRef))
        .subscribe(
          () => {
            this.checkoutLogger.info(
              'Adyen print successfully',
              this.getCheckoutLoggerContext({
                documentType: documentType,
              }),
              {
                cartId: this.order?.cart?.id,
                orderId: this.order?.id,
              },
            );
          },
          error => {
            this.printAdyenLog('Error on adyen print', documentType, deviceId ?? '', error);
            this.showAdyenError(error, documentType);
            this.spinnerService.hide();
          },
        );
    } catch {
      this.showErrorModal(this.translate.instant(OrderComponent.adyenPrinterErrorTitleKey), [
        this.translate.instant(OrderComponent.adyenPrinterUnknownErrorKey),
      ]);
      this.spinnerService.hide();
    }
  }

  private checkResponseData<T>(
    response: BaseResponse<T>,
    documentType: PrinterDocumentType,
    deviceId: string,
  ): Observable<BaseResponse<T>> {
    if (response?.data) {
      this.printAdyenLog('Adyen print successfully', documentType, deviceId);
      return of(response);
    } else {
      this.printAdyenLog('Error on adyen print', documentType, deviceId, response);
      this.showAdyenError(response, documentType);
      throwError(response);
      return NEVER;
    }
  }

  private printTicketsAndReceipt(atIndex?: number): void {
    if (this.agreementBlocked()) {
      return;
    }
    const deviceId = toPrintDeviceId(this.paymentConfigStorageService.getConfiguration()?.deviceId);
    if (!deviceId || this.partnerId === undefined) {
      this.printOrder();
      return;
    }
    const getPrintRequest = (deviceId: string, printerDocument: PrinterDocumentType, atIndex?: number, isUnifyTicket?: boolean) =>
      this.#printAdyen$(toPrintDocumentType(printerDocument), [
        this.partnerId!,
        this.selectedPlan!.id,
        this.#resolveAdyenPrinterPlaceId(),
        this.order?.id ?? 0,
        deviceId,
        printerDocument,
        atIndex,
        isUnifyTicket,
      ]);

    const isUnifyTicket = this.isPrintTicketsCombinedForPlansEnabled(this.order?.planId ?? 0);
    const printTicketRequest = getPrintRequest(deviceId ?? '', PrinterDocumentType.ticket, atIndex, isUnifyTicket);
    const printReceiptRequest = getPrintRequest(deviceId ?? '', PrinterDocumentType.receipt, atIndex, isUnifyTicket);

    let currentPrinterDocumentType: PrinterDocumentType;

    const ticketObs = of(this.printAdyenLog('Going to print through Adyen', PrinterDocumentType.ticket, deviceId ?? '')).pipe(
      tap(() => (currentPrinterDocumentType = PrinterDocumentType.ticket)),
      switchMap(() => printTicketRequest),
      mergeMap(response => this.checkResponseData(response!, PrinterDocumentType.ticket, deviceId ?? '')),
    );

    const receiptObs = this.isReceiptPrintingDisabled()
      ? of(null).pipe(tap(() => this.#isReceiptPrintingDisabledLog()))
      : of(this.printAdyenLog('Going to print through Adyen', PrinterDocumentType.receipt, deviceId ?? '')).pipe(
          tap(() => (currentPrinterDocumentType = PrinterDocumentType.receipt)),
          switchMap(() => printReceiptRequest),
          mergeMap(response => this.checkResponseData(response!, PrinterDocumentType.receipt, deviceId ?? '')),
        );

    const spinnerModal = this.showSpinnerModal(this.translate.instant(OrderComponent.adyenPrinterPrintingKey));
    ticketObs
      .pipe(
        concatMap(() => receiptObs),
        finalize(() => spinnerModal.close()),
        takeUntilDestroyed(this.#destroyRef),
      )
      .subscribe({
        next: () => {
          if (this.order && !this.#giftAidDetectionService.detectGiftAidNeeded(this.order)) {
            this.#isPrintingSpinnerDone$.next(true);
          }
        },
        error: error => {
          this.printAdyenLog('Error on adyen print', currentPrinterDocumentType, deviceId ?? '', error);
          this.showAdyenError(error, currentPrinterDocumentType);
        },
      });
  }

  #handleGiftAidFlow(deviceId: string, isPrintingDeclaration = false): Observable<null> {
    if (
      this.order !== null &&
      this.#optimizelyService.isFeatureEnabled(FeatureFlags.GIFT_AID, {
        plan_id: this.selectedPlan!.id.toString(),
      }) &&
      this.#giftAidDetectionService.detectGiftAidNeeded(this.order)
    ) {
      if (!this.#isPrintingDeclarationDone()) {
        return this.#showGiftAidConfirmationModal(!isPrintingDeclaration).pipe(
          tap((doPrint: boolean) => {
            if (doPrint) {
              this.#executeGiftAidPrintingFlow(deviceId, isPrintingDeclaration).pipe(takeUntilDestroyed(this.#destroyRef)).subscribe();
            }
          }),
          map((): null => null),
        );
      } else {
        return of(null);
      }
    }
    return of(null);
  }

  #showGiftAidConfirmationModal(isFirstCopy = true): Observable<boolean> {
    const data: GiftAidConfirmationModalData = isFirstCopy
      ? {
          title: this.translate.instant(OrderComponent.giftAidConfirmationTitleKey),
          message: this.translate.instant(OrderComponent.giftAidConfirmationMessageKey),
          acceptButtonLabel: this.translate.instant(OrderComponent.giftAidConfirmationPrintButtonKey),
        }
      : {
          title: this.translate.instant(OrderComponent.giftAidCustomerCopyTitleKey),
          message: this.translate.instant(OrderComponent.giftAidCustomerCopyMessageKey),
          acceptButtonLabel: this.translate.instant(OrderComponent.giftAidCustomerCopyPrintButtonKey),
          cancelButtonLabel: this.translate.instant(OrderComponent.giftAidCustomerCopySkipButtonKey),
        };
    const dialog: DialogRef<boolean, GiftAidConfirmationModalComponent> = this.#dialog.open(GiftAidConfirmationModalComponent, {
      data,
      hasBackdrop: true,
      disableClose: false,
      width: '500px',
      maxWidth: '90vw',
    });

    return (dialog.closed as Observable<boolean>).pipe(take(1));
  }

  #executeGiftAidPrintingFlow(deviceId: string, isPrintingDeclaration: boolean): Observable<BaseResponse<PrintStatus> | null> {
    this.#isPrintingSpinnerDone$.next(false);
    const giftAidSpinnerModal: NgbModalRef = this.showSpinnerModal(this.translate.instant(OrderComponent.giftAidPrintingMessageKey), {
      backdrop: 'static',
      keyboard: false,
    });
    return this.#printGiftAidFlow({
      partnerId: this.partnerId!,
      planId: this.selectedPlan!.id,
      placeId: this.#resolveAdyenPrinterPlaceId(),
      orderId: this.order?.id ?? 0,
      deviceId,
    }).pipe(
      tap(() => {
        this.checkoutLogger.info('Gift Aid printing flow completed successfully', this.getCheckoutLoggerContext(), {
          cartId: this.order?.cart?.id,
          orderId: this.order?.id,
        });
      }),
      catchError(error => {
        this.checkoutLogger.error('Error during Gift Aid printing flow', this.getCheckoutLoggerContext(), {
          cartId: this.order?.cart?.id,
          orderId: this.order?.id,
          error: error?.toString(),
        });
        this.showErrorModal(this.translate.instant(OrderComponent.giftAidErrorTitleKey), [
          this.translate.instant(OrderComponent.giftAidErrorPrintingFailedKey),
        ]);
        return EMPTY;
      }),
      finalize(() => {
        giftAidSpinnerModal.close();
        this.#isPrintingSpinnerDone$.next(true);
        if (!isPrintingDeclaration) {
          this.#isPrintingDeclarationDone.set(true);
        }
      }),
    );
  }

  #printGiftAidFlow({
    partnerId,
    planId,
    placeId,
    orderId,
    deviceId,
  }: {
    partnerId: number;
    planId: number;
    placeId: number;
    orderId: number;
    deviceId: string;
  }): Observable<BaseResponse<PrintStatus> | null> {
    const doPrint$: Observable<BaseResponse<PrintStatus> | null> = this.#printAdyen$(PrintDocumentType.gift_aid, [
      partnerId,
      planId,
      placeId,
      orderId,
      deviceId,
      PrinterDocumentType.gift_aid,
    ]);

    return doPrint$.pipe();
  }

  private showAdyenError(error: any, documentType: PrinterDocumentType): void {
    if (error instanceof AdyenPrinterNotAcceptableConditionsError) {
      this.showPrintError(this.translate.instant(OrderComponent.adyenPrinterNotAcceptableConditionsKey), documentType, error.atIndex);
    } else if (error instanceof AdyenPrinterRejectedError) {
      this.showPrintError(this.translate.instant(OrderComponent.adyenPrinterRejectedErrorKey), documentType, error.atIndex);
    } else if (error instanceof AdyenPrinterTimeoutError) {
      this.showPrintError(this.translate.instant(OrderComponent.adyenPrinterTimeoutErrorKey), documentType, error.atIndex);
    } else {
      this.showPrintError(this.translate.instant(OrderComponent.adyenPrinterUnknownErrorKey), documentType, 0);
    }
  }

  private showSpinnerModal(message: string, options?: NgbModalOptions): NgbModalRef {
    const modal = this.modalService.open(SpinnerModalComponent, options);
    modal.componentInstance.message = message;
    return modal;
  }

  private showErrorModal(title: string, messages: string[]): void {
    const modal = this.modalService.open(MessageModalComponent);
    modal.componentInstance.title = title;
    modal.componentInstance.messages = messages;
  }

  showPrintError(message: string, documentType: PrinterDocumentType, atIndex: number) {
    const modal = this.modalService.open(MessageModalComponent);
    modal.componentInstance.title = this.translate.instant(OrderComponent.adyenPrinterErrorTitleKey);
    modal.componentInstance.messages = [message];
    modal.componentInstance.cancelButtonLabel = this.translate.instant(OrderComponent.adyenPrinterCancelButtonKey);
    modal.componentInstance.acceptButtonLabel = this.translate.instant(OrderComponent.adyenPrinterRetryButtonKey);
    modal.componentInstance.responseEmitter.subscribe((response: unknown) => {
      if (!response) {
        return null;
      }
      if (this.onsiteSetupStorage?.obo_printer_type !== OboPrinterTypeEnum.adyen_printer) {
        return this.printAdyen(documentType, atIndex);
      }
      return documentType === PrinterDocumentType.ticket ? this.printTicketsAndReceipt(atIndex) : this.printAdyen(documentType, atIndex);
    });
  }

  navigateToNewOrder(): void {
    this.sendNewOrderEvent();
    this.router.navigate(['/box-office'], { queryParamsHandling: 'merge' });
  }

  showTickets(): void {
    if (this.agreementBlocked()) {
      return;
    }
    this.sendViewTicketEvent();
    this.openTicket();
  }

  validateTickets(): void {
    if (this.partnerId === undefined || this.agreementBlocked()) {
      return;
    }
    this.#sendValidateTicketEvent();
    this.#validateAccessTicketsFromOrder();
  }

  /**
   * Opens the agreement documents for the blocked order. Closing the modal re-runs the existing
   * gate refresh, so a signature completed inside it unblocks the tickets with no new refresh path.
   */
  protected openAgreementList(): void {
    const orderId = this.order?.id;
    if (orderId === undefined || this.partnerId === undefined) {
      return;
    }
    this.#agreementSigningModalService
      .open({ orderId, partnerId: this.partnerId })
      .closed$.pipe(take(1), takeUntilDestroyed(this.#destroyRef))
      .subscribe(() => this.#refreshAgreementGate());
  }

  #refreshAgreementGate(): void {
    const orderId = this.order?.id;
    if (orderId === undefined || this.partnerId === undefined) {
      return;
    }
    this.spinnerService.show();
    this.#purchaseService
      .getOrder(this.partnerId, orderId)
      .pipe(
        take(1),
        finalize(() => this.spinnerService.hide()),
        takeUntilDestroyed(this.#destroyRef),
      )
      .subscribe(response => {
        const freshOrder = response.data;
        if (response.error !== null || !freshOrder) {
          // A refresh that failed must say so: the notice reads the same either way, so silence
          // would tell the operator the signature still has not landed.
          this.showErrorModal(this.translate.instant(OrderComponent.commonErrorTitleKey), [
            this.translate.instant(OrderComponent.genericErrorKey),
          ]);
          return;
        }
        if (!this.order) {
          return;
        }
        this.order.accessTickets = freshOrder.accessTickets;
        this.order.ticketsAndProducts = freshOrder.ticketsAndProducts;
        this.showValidateButton = Array.from(this.order.ticketsAndProducts?.values() || []).some(({ isValidated }) => !isValidated);
        this.#updateAgreementGate();
        this.ref.detectChanges();
      });
  }

  #validateAccessTicketsFromOrder(): void {
    this.#validateCodes();
  }

  #validateCodes(): void {
    const profileIds: string[] = this.onsiteSetupStorage?.validation_profiles ?? [];
    const setupId: string | undefined = this.onsiteSetupStorage?.access_control_setup_id;

    this.accessControlService
      .validateAllCodes({
        orders: [this.order!],
        partnerId: this.partnerId!,
        setupId,
        profileIds,
      })
      .subscribe(
        (result: ValidateAllCodesResult) => {
          if (result.totalCount === 0) {
            return this.#handleValidationError(OrderComponent.genericErrorKey);
          }
          if (result.validatedCount < result.totalCount) {
            return this.#handleValidationError(result.errorMessage ?? OrderComponent.genericErrorKey);
          }
          this.#handleValidationResult();
        },
        response => {
          this.#handleValidationError(response?.error?.message ?? OrderComponent.genericErrorKey);
        },
      );
  }

  #handleValidationResult(): void {
    this.showValidateButton = false;
    const modalRef = this.modalService.open(ValidationSuccessComponent);
    modalRef.componentInstance.tickets = this.order?.ticketsAndProducts?.size ?? 0;
    timer(3000).subscribe(() => modalRef.close());
    this.spinnerService.hide();
  }

  #handleValidationError(errorMessage: string): void {
    this.showErrorModal(this.translate.instant(OrderComponent.commonErrorTitleKey), [this.translate.instant(errorMessage)]);
    this.spinnerService.hide();
  }

  navigateToValidationsWithOrderId(): void {
    this.router.navigate(['/validation'], { queryParams: { type: 'order', id: this.order?.id ?? 0 } });
  }

  private openTicket(): void {
    const isUnifiedTicket = this.isPrintTicketsCombinedForPlansEnabled(this.order!.planId!);
    this.#printFacadeService.dispatch({
      documentType: PrintDocumentType.ticket,
      entryPoint: PrintEntryPoint.box_office_order_open_ticket,
      printerType: PrintPrinterType.browser_pdf,
      target: { args: [[{ order: this.order!, isUnifiedTicket }], { shouldDownload: true }], method: 'openTickets' },
    });
  }

  private isPrintTicketsCombinedForPlansEnabled(planId: number): boolean {
    return this.printTicketsCombinedForPlans.includes(planId);
  }

  private sendViewTicketEvent(): void {
    const mixpanelData = {
      ...this.getMixpanelData(),
      order_id: this.order?.id ?? 0,
    } as ViewTicketData;

    this.trackingService.track(new ViewTicketEvent(mixpanelData as ViewTicketData));
  }

  private sendNewOrderEvent(): void {
    this.trackingService.track(
      new ClickNewOrderEvent({ ...this.getMixpanelData(), from_order_id: this.order?.id ?? 0 } as ClickNewOrderData),
    );
  }

  #sendValidateTicketEvent(): void {
    this.trackingService.track(
      new ConfirmValidateTicketsEvent({
        input: this.order?.id?.toString() ?? '',
        input_type: 'manual',
        validation_type: ValidationTypeEnum.ORDER,
        order: this.order?.id ?? 0,
        obo_flow_type: this.onsiteSetupStorage?.obo_flow_type,
      }),
    );
  }

  private resetScroll() {
    if (this.dualScreenStorageService.containsData()) {
      ScrollUtils.scrollToTop();
    } else if (window.innerWidth < 1200) {
      this.scrollToBoxOfficeContent();
    }
  }

  private scrollToBoxOfficeContent(): void {
    setTimeout(() => {
      document.getElementsByClassName('box-office-content')[0]?.scrollIntoView({
        behavior: 'smooth',
        block: 'start',
        inline: 'nearest',
      });
    });
  }

  private getMixpanelData() {
    return {
      city_id: this.#selectedCity?.id || null,
      city_name: this.#selectedCity?.title || null,
      plan_id: this.selectedPlan?.id,
      plan_name: this.selectedPlan?.title,
      place_id: this.#selectedPlace?.id,
      place_name: this.#selectedPlace?.title,
      time: new Date().toISOString(),
      obo_flow_type: this.onsiteSetupStorage?.obo_flow_type,
    };
  }

  getDeliveryNote(): void {
    this.loadingDeliveryNote = true;
    const reservationId = this.order?.reservationId ?? '';
    this.trackingService.track(
      new ClickGetDeliveryNoteEvent({
        reservation_id: reservationId,
        plan_id: this.selectedPlan?.id,
        plan_name: this.selectedPlan?.title,
        place_id: this.#selectedPlace?.id,
        place_name: this.#selectedPlace?.title,
        source: ClickGetDeliveryNoteSourceEnum.CREATE_ORDER,
        reservation_locator: this.order?.reservationLocator ?? '',
        channel: this.onsiteSetupStorage?.channel_id ?? Channel.BoxOffice,
        obo_flow_type: this.onsiteSetupStorage?.obo_flow_type,
      } as ClickGetDeliveryNoteData),
    );
    const fileName = `reservation.${reservationId}.pdf`;
    this.reservationsService
      .exportPDFDeliveryNote(reservationId, this.locale)
      .pipe(
        finalize(() => {
          this.loadingDeliveryNote = false;
          this.ref.detectChanges();
        }),
      )
      .subscribe(
        (buffer: Blob) => {
          this.#downloadFilesService.downloadFile(buffer, ExportTypeEnum.PDF, fileName);
        },
        () => {
          const modal = this.modalService.open(MessageModalComponent);
          modal.componentInstance.title = this.translate.instant(OrderComponent.commonErrorTitleKey);
          modal.componentInstance.messages = [this.translate.instant(OrderComponent.genericErrorKey)];
        },
      );
  }

  private getCheckoutLoggerContext(data?: Record<string, unknown>): CheckoutLogContext {
    return {
      stage: CheckoutStageEnum.VIEW_ORDER,
      cartId: this.order?.cart?.id,
      data,
    };
  }

  #hasTickets(): boolean {
    return !!(this.order?.accessTickets && this.order.accessTickets.size > 0);
  }

  #updateAgreementGate(): void {
    const blocked = this.order !== null && isOrderAgreementBlocked(this.order);
    this.agreementBlocked.set(blocked);
    this.agreementAction.set(this.order === null ? null : getAgreementGateAction([this.order]));
  }

  #hasTicketsOrProducts(): boolean {
    return !!(this.order?.ticketsAndProducts && this.order.ticketsAndProducts.size > 0);
  }

  #hideFooter() {
    if (this.isOssFlow) {
      this.#toggleFooter(false);
    }
  }

  #toggleFooter(isActive: boolean): void {
    const toggleFooterEvent = new CustomEvent(TOGGLE_FOOTER_EVENT_KEY, {
      detail: {
        isActive,
      },
    });
    window.dispatchEvent(toggleFooterEvent);
  }
}
