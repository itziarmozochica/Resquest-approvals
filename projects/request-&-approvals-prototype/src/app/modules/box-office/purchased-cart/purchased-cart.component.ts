import { Dialog, DialogRef } from '@angular/cdk/dialog';
import { HttpErrorResponse } from '@angular/common/http';
import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  computed,
  DestroyRef,
  inject,
  NgZone,
  OnDestroy,
  OnInit,
  Signal,
  signal,
  WritableSignal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router } from '@angular/router';

import { AgreementSigningModalService } from '@fz-original/app/agreements/signing/modal/services/agreement-signing-modal.service';
import { BreakpointStateService } from '@fz-original/app/app/services/breakpoint/breakpoint-state.service';
import { DatadogLogService } from '@fz-original/app/core/error/datadog/logger/datadog-log.service';
import { ClickGetDeliveryNoteEvent } from '@fz-original/app/core/tracking/core/events/click-get-delivery-note';
import { ConfirmValidateTicketsEvent } from '@fz-original/app/core/tracking/core/events/confirm-validate-tickets';
import { ScreenTypeaheadInput } from '@fz-original/app/core/tracking/core/events/select-option-typeahead';
import { TrackingService } from '@fz-original/app/core/tracking/tracking.service';
import { calculateAutoAppliedPlanDiscountsInfo } from '@fz-original/app/modules/box-office/memberships/utils/memberships.utils';
import { PaymentFlowFeatureService } from '@fz-original/app/modules/box-office/shared/services/payment-flow-feature/payment-flow-feature.service';
import { ReservationSettlementSessionService } from '@fz-original/app/modules/reservation-settlement/services/reservation-settlement-session.service';
import { toPrintDeviceId } from '@fz-original/app/payments/models/tap-to-pay.model';
import { BookingQuestionsModalService } from '@fz-original/app/shared/booking-questions/booking-questions-modal.service';
import { ExportTypeEnum } from '@fz-original/app/shared/components/export-list-button/export-option.model';
import { MessageModalComponent } from '@fz-original/app/shared/components/message-modal/message-modal.component';
import { ValidationSuccessComponent } from '@fz-original/app/shared/components/order/components/validation-success/validation-success.component';
import { SpinnerModalComponent } from '@fz-original/app/shared/components/spinner-modal/spinner-modal.component';
import { SpinnerService } from '@fz-original/app/shared/layout/spinner/spinner.service';
import { BaseResponse } from '@fz-original/app/shared/models/base-response';
import { CartSession } from '@fz-original/app/shared/models/cart/cart-session.model';
import { Cart } from '@fz-original/app/shared/models/cart/cart.model';
import { CouponDiscount } from '@fz-original/app/shared/models/cart/coupons.model';
import { Money } from '@fz-original/app/shared/models/money.model';
import { areOrdersAgreementBlocked, getAgreementGateAction } from '@fz-original/app/shared/models/order/order-agreement-gate.util';
import { OrderChannelType } from '@fz-original/app/shared/models/order/order-channel-type.model';
import { Order } from '@fz-original/app/shared/models/order/order.model';
import { TicketReleaseConditionAction } from '@fz-original/app/shared/models/order/release-condition.model';
import { Partner } from '@fz-original/app/shared/models/partner/partner.model';
import { Plan } from '@fz-original/app/shared/models/plan/plan.model';
import { FeatureFlags } from '@fz-original/app/shared/optimizely/feature-flags';
import { OptimizelyService } from '@fz-original/app/shared/optimizely/optimizely.service';
import { CartTimingService } from '@fz-original/app/shared/services/cart-timing/cart-timing.service';
import { CheckoutLoggerService } from '@fz-original/app/shared/services/checkout-logger/checkout-logger.service';
import { CheckoutLogContext } from '@fz-original/app/shared/services/checkout-logger/models/checkout-log-context.interface';
import { CheckoutStageEnum } from '@fz-original/app/shared/services/checkout-logger/models/checkout-stage.enum';
import { DownloadFilesService } from '@fz-original/app/shared/services/download/download-files.service';
import { DualScreenStorageService } from '@fz-original/app/shared/services/dual-screen/dual-screen-storage.service';
import { CAPN_ID, PartnerService } from '@fz-original/app/shared/services/partner/partner.service';
import {
  PrintDocumentType,
  PrintEntryPoint,
  PrintPrinterType,
  toPrintDocumentType,
} from '@fz-original/app/shared/services/print-facade/print-facade.enums';
import { PrintFacadeService } from '@fz-original/app/shared/services/print-facade/print-facade.service';
import { PurchaseService } from '@fz-original/app/shared/services/purchase/purchase.service';
import { Channel } from '@fz-original/app/shared/services/session-availability/channel.enum';
import { UserService } from '@fz-original/app/shared/services/user/user.service';
import { isDepositPaidUtil } from '@fz-original/app/shared/utils/deposit.util';
import { ScrollUtils } from '@fz-original/app/shared/utils/scroll.utils';
import { IgntDialogService } from '@ignite/common';
import { NgbModal, NgbModalOptions, NgbModalRef } from '@ng-bootstrap/ng-bootstrap';
import { TranslateService } from '@ngx-translate/core';
import {
  BehaviorSubject,
  catchError,
  concat,
  EMPTY,
  exhaustMap,
  finalize,
  forkJoin,
  map,
  mergeMap,
  Observable,
  of,
  switchMap,
  take,
  tap,
  throwError,
  timeout,
  timer,
} from 'rxjs';

import { PaymentsService } from '../../../payments/services/payments.service';
import { ValidationProfileSelectionModalComponent } from '../../../shared/components/order/components/validation-profile-selection-modal/validation-profile-selection-modal.component';
import {
  ValidationProfileSelectionModalData,
  ValidationProfileSelectionModalResult,
} from '../../../shared/components/order/components/validation-profile-selection-modal/validation-profile-selection-modal.model';
import { TOGGLE_FOOTER_EVENT_KEY } from '../../../shared/layout/footer/toggle-footer-event-key';
import { AccessControlProfile } from '../../../shared/models/access-control/access-control.model';
import { FiscalTag, PrinterDocumentType } from '../../kiosk/services/printer/models/printer-instruction.model';
import { ClickGetDeliveryNoteSourceEnum } from '../../reservation/models/click-get-delivery-note-source.enum';
import { ReservationsService } from '../../reservation/services/reservations.service';
import { ValidationTypeEnum } from '../../validation/enums/validation-type.enum';
import {
  AccessControlService,
  CodeValidationInput,
  ValidateAllCodesResult,
} from '../../validation/services/access-control/access-control.service';
import { PaymentType } from '../checkout/models/payment-type.enum';
import { GiftAidConfirmationModalComponent } from '../gift-aid/components/confirmation-modal/gift-aid-confirmation-modal.component';
import { GiftAidConfirmationModalData } from '../gift-aid/models/gift-aid-confirmation-modal.model';
import { GiftAidDetectionService } from '../gift-aid/services/gift-aid-detection.service';
import { FranceFiscalDuplicateReasonPopupComponent } from '../shared/components/france-fiscal-duplicate-reason-popup/france-fiscal-duplicate-reason-popup.component';
import { OboFlowTypeEnum, OboPrinterTypeEnum, ShiftStrategyEnum, TicketValidationTypeEnum } from '../shared/models/onsite-setup';
import type { AdyenPrinterService } from '../shared/services/adyen-printer/adyen-printer.service';
import { AdyenPrinterNotAcceptableConditionsError } from '../shared/services/adyen-printer/errors/adyen-printer-not-acceptable-conditions.error';
import { AdyenPrinterRejectedError } from '../shared/services/adyen-printer/errors/adyen-printer-rejected.error';
import { AdyenPrinterTimeoutError } from '../shared/services/adyen-printer/errors/adyen-printer-timeout.error';
import { PrintStatus } from '../shared/services/adyen-printer/models/print-status.model';
import { EfrHealthCheckModalService } from '../shared/services/efsta-fiscal/efr-health-check-modal.service';
import { EfrHealthCheckService } from '../shared/services/efsta-fiscal/efr-health-check.service';
import { EfrUserMessageModalService } from '../shared/services/efsta-fiscal/efr-user-message-modal.service';
import {
  classifyPlPaymentBreakdown,
  PlEsrMapError,
  PlPaymentBreakdownPrecheckReason,
  PlPaymentTender,
} from '../shared/services/efsta-fiscal/efsta-esr-mapper-pl.util';
import { createTableFiscalGroupResolver } from '../shared/services/efsta-fiscal/efsta-fiscal-group.util';
import { EfstaFiscalService, EfstaRegistrationHttpError, isEfstaHttpError } from '../shared/services/efsta-fiscal/efsta-fiscal.service';
import {
  buildProductTypeBySessionTypeId,
  buildSurchargeTaxRateBySessionTypeId,
  buildTaxRateBySessionTypeId,
  isFiscalReprintEnabled,
} from '../shared/services/efsta-fiscal/efsta-fiscal.util';
import { EfstaRegistrationTrackerService } from '../shared/services/efsta-fiscal/efsta-registration-tracker.service';
import type { EfstaReprintResult } from '../shared/services/efsta-fiscal/efsta-reprint.service';
import { resolveFiscalCountryProfile, resolveFiscalReprintVariant } from '../shared/services/efsta-fiscal/fiscal-country-profile.util';
import { isOrderWithoutTillSale } from '../shared/services/efsta-fiscal/fiscal-sale-chain.util';
import { FiscalTerminalPlaceService } from '../shared/services/efsta-fiscal/fiscal-terminal-place.service';
import {
  FiscalTransactionApiService,
  FiscalTransactionNullResponseError,
} from '../shared/services/efsta-fiscal/fiscal-transaction-api.service';
import {
  EFR_PL_ZERO_VALUE_TRANSACTION_LOG_CODE,
  isPolishZeroValueTransaction,
} from '../shared/services/efsta-fiscal/fiscal-zero-value-guard.util';
import { buildComplianceLog, ComplianceLogData } from '../shared/services/efsta-fiscal/models/compliance-log.model';
import { EfrHealthCheckResult } from '../shared/services/efsta-fiscal/models/efr-health-check.model';
import { EsrRegisterResponse } from '../shared/services/efsta-fiscal/models/efsta-esr-response.model';
import { FiscalCountryProfile } from '../shared/services/efsta-fiscal/models/fiscal-country-profile.model';
import { buildFiscalLinesByTicketId } from '../shared/services/efsta-fiscal/pack-fiscal-lines.util';
import { toPlPaymentTenders } from '../shared/services/efsta-fiscal/pl-payment-tenders.util';
import {
  buildPlSurchargeTaxGroupBySessionTypeId,
  buildPlSurchargeTaxRateBySessionTypeId,
  buildPlTaxGroupBySessionTypeId,
  buildPlTaxRateBySessionTypeId,
} from '../shared/services/efsta-fiscal/pl-tax-group-by-rate.util';
import type { EpsonReceiptService } from '../shared/services/epson-receipt/epson-receipt.service';
import { OnsiteSetupsStorageService } from '../shared/services/onsite-setups/onsite-setups-storage.service';
import { OrderPrintingService } from '../shared/services/order-printing/order-printing.service';
import { PaymentConfigStorageService } from '../shared/services/payment/payment-config-storage.service';
import { canPrintOnAdyenTerminal } from '../shared/utils/adyen-terminal-printing.util';
import { FlexibleBundlePurchase } from './models/flexible-bundle-purchase.model';
import { PurchasedCartOrderInformation } from './models/purchased-cart-order-information.model';
import { getOrdersForTicketOperations, toOrderForManualTicketOperations } from './prepare-orders-for-print.util';
import { PurchasedCartData } from './purchased-cart.resolver';
import { isFlexibleBundlePrimary, isFlexibleBundleSecondary } from './utils/flexible-bundle-purchase.util';

const PL_PAYMENT_BREAKDOWN_TIMEOUT_MS = 15_000;

const EFR_NO_RESPONSE_ERROR: FiscalTransactionNullResponseError = {
  error_code: 'EFR_NO_RESPONSE',
  error_message: 'EFR returned no response',
};

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-purchased-cart',
  standalone: false,
  styleUrls: ['./purchased-cart.component.scss', '../../../../theme/general/_box-office.scss'],
  templateUrl: './purchased-cart.component.html',
})
export class PurchasedCartComponent implements OnInit, OnDestroy {
  static readonly adyenPrinterCancelButtonKey = 'boxOffice.order.adyenPrinter.errors.buttons.cancel';
  static readonly adyenPrinterErrorTitleKey = 'boxOffice.order.adyenPrinter.errors.title';
  static readonly adyenPrinterMultipleOrdersNotSupported = 'boxOffice.order.adyenPrinter.errors.messages.multipleOrdersNotSupported';
  static readonly adyenPrinterNotAcceptableConditionsKey = 'boxOffice.order.adyenPrinter.errors.messages.notAcceptablePreconditions';
  static readonly adyenPrinterNotSetupKey = 'boxOffice.order.adyenPrinter.errors.messages.notSetup';
  static readonly adyenPrinterPrintingKey = 'boxOffice.order.adyenPrinter.printing';
  static readonly adyenPrinterRejectedErrorKey = 'boxOffice.order.adyenPrinter.errors.messages.rejected';
  static readonly adyenPrinterRetryButtonKey = 'boxOffice.order.adyenPrinter.errors.buttons.retry';
  static readonly adyenPrinterTimeoutErrorKey = 'boxOffice.order.adyenPrinter.errors.messages.timeout';
  static readonly adyenPrinterUnknownErrorKey = 'boxOffice.order.adyenPrinter.errors.messages.uknown';
  static readonly bookingQuestionsGenericErrorKey = 'bookingQuestions.errors.generic';
  static readonly commonErrorTitleKey = 'common.errorTitle';
  static readonly fiscalTransactionPersistFailedLogCode = 'FISCAL_TRANSACTION_PERSIST_FAILED';
  static readonly genericErrorKey = 'errors.generic';
  static readonly giftAidConfirmationMessageKey = 'boxOffice.order.giftAid.confirmation.message';
  static readonly giftAidConfirmationPrintButtonKey = 'boxOffice.order.giftAid.confirmation.print';
  static readonly giftAidConfirmationTitleKey = 'boxOffice.order.giftAid.confirmation.title';
  static readonly giftAidCustomerCopyMessageKey = 'boxOffice.order.giftAid.customerCopy.message';
  static readonly giftAidCustomerCopyPrintButtonKey = 'boxOffice.order.giftAid.customerCopy.print';
  static readonly giftAidCustomerCopySkipButtonKey = 'boxOffice.order.giftAid.customerCopy.skip';
  static readonly giftAidCustomerCopyTitleKey = 'boxOffice.order.giftAid.customerCopy.title';
  static readonly giftAidErrorPrintingFailedKey = 'boxOffice.order.giftAid.errors.printingFailed';
  static readonly giftAidErrorTitleKey = 'boxOffice.order.giftAid.errors.title';
  static readonly giftAidPrintingMessageKey = 'boxOffice.order.giftAid.printing';
  static readonly fiscalNoticeTitleKey = 'boxOffice.fiscal.userMessageTitle';
  static readonly plRegistrationFailedKey = 'boxOffice.fiscal.plRegistrationFailed';
  static readonly plZeroValueTitleKey = 'boxOffice.fiscal.plZeroValue.title';
  static readonly plZeroValueTransactionKey = 'boxOffice.fiscal.plZeroValue.notFiscalised';
  static readonly validateTicketsNotAllowedKey = 'validateTicketsNew.validationNotAllowed';

  #accessControlService = inject(AccessControlService);
  #bookingQuestionsModalService = inject(BookingQuestionsModalService);
  #breakpointStateService = inject(BreakpointStateService);
  #cart: Cart | null = null;
  readonly #cartTimingService = inject(CartTimingService);
  readonly #agreementSigningModalService = inject(AgreementSigningModalService);
  #checkoutLogger = inject(CheckoutLoggerService);
  #datadogLogService = inject(DatadogLogService);
  #destroyRef = inject(DestroyRef);
  #dialog = inject(Dialog);
  #downloadFilesService = inject(DownloadFilesService);
  #dualScreenStorageService = inject(DualScreenStorageService);
  #efrHealthCheckModalService = inject(EfrHealthCheckModalService);
  #efrHealthCheckService = inject(EfrHealthCheckService);
  readonly #efrUserMessageModalService = inject(EfrUserMessageModalService);
  #efstaFiscalService = inject(EfstaFiscalService);
  #efstaRegistrationTracker = inject(EfstaRegistrationTrackerService);
  readonly #igntDialogService = inject(IgntDialogService);
  readonly #fiscalTerminalPlaceService = inject(FiscalTerminalPlaceService);
  #fiscalTransactionApiService = inject(FiscalTransactionApiService);
  #giftAidDetectionService = inject(GiftAidDetectionService);
  #isPrintingDeclarationDone = signal<boolean>(false);
  #isPrintingSpinnerDone$ = new BehaviorSubject(false);
  #isPrintingTicketsAndReceiptDone = signal<boolean>(false);
  #isOrderModificationLanding = false;
  #mainPlans: Plan[] | null = null;
  #modalService = inject(NgbModal);
  readonly #onsiteSetupsStorageService = inject(OnsiteSetupsStorageService);
  #optimizelyService = inject(OptimizelyService);
  readonly #paymentFlowFeatureService = inject(PaymentFlowFeatureService);
  readonly #orderPrintingService = inject(OrderPrintingService);
  #flexibleBundle: FlexibleBundlePurchase | null = null;
  #orders: Order[] | null = null;
  #ordersForPrint: Order[] | null = null;
  #ordersPaymentMethod: PaymentType | undefined;
  #paidDepositAmount: Money | null = null;
  #partnerService = inject(PartnerService);
  readonly #purchaseService = inject(PurchaseService);
  #paymentConfigStorageService = inject(PaymentConfigStorageService);
  readonly #paymentsService = inject(PaymentsService);
  #paymentTransactionId: string | null = null;
  #plPaymentTenders: readonly PlPaymentTender[] | undefined;
  readonly #printFacadeService = inject(PrintFacadeService);
  #ref = inject(ChangeDetectorRef);
  #reservationSettlementSessionService = inject(ReservationSettlementSessionService);
  #reservationsService = inject(ReservationsService);
  #route = inject(ActivatedRoute);
  #router = inject(Router);
  #spinnerService = inject(SpinnerService);
  #trackingService = inject(TrackingService);
  #translate = inject(TranslateService);
  #userService = inject(UserService);
  readonly #zone = inject(NgZone);

  get autovalidateTickets(): boolean {
    return (
      (this.onsiteSetupStorage?.ticket_validation === TicketValidationTypeEnum.autovalidation &&
        this.#orders?.every(order => order.channelType === OrderChannelType.BOX_OFFICE) &&
        !this.#cart?.hasSessionsInFuture) ??
      false
    );
  }
  get partnerId(): number | undefined {
    return this.partner?.id ?? this.#partnerService.getPartner()?.id;
  }

  protected readonly agreementAction: WritableSignal<TicketReleaseConditionAction | null> = signal(null);
  protected readonly agreementBlocked: WritableSignal<boolean> = signal(false);
  autoPrint = false;
  closeIt: WritableSignal<{ timestamp: number }> = signal<{ timestamp: number }>({ timestamp: 0 });
  currency: string | null = null;
  orderInformationList = signal<PurchasedCartOrderInformation[]>([]);
  hasOneOrder = computed(() => this.orderInformationList().length === 1);
  protected readonly journeyOrderIds: Signal<ReadonlySet<number>> = computed(
    () =>
      new Set(
        this.orderInformationList()
          .map(({ order }) => order)
          .filter(order => order.hasAssetBasedBooking === true)
          .map(order => order.id)
          .filter((orderId): orderId is number => orderId !== undefined),
      ),
  );
  hasShiftsEnabled = false;
  hasViewTicketDisabled =
    this.#optimizelyService.isFeatureEnabled('do_not_print_tickets_after_selling') || !this.#userService.hasPermission('can_reprint');
  isDualScreen = false;
  isLoading: WritableSignal<boolean> = signal(true);
  isMobile: Signal<boolean> = this.#breakpointStateService.getStateProp('isMobile');
  isMobilePoS: boolean = this.#paymentConfigStorageService.isMobilePos();
  readonly #isStartingNewOrder: WritableSignal<boolean> = signal(false);
  readonly isStartingNewOrder: Signal<boolean> = this.#isStartingNewOrder.asReadonly();
  loadingDeliveryNote = false;
  locale: string = this.#translate.currentLang;
  onsiteSetupStorage = this.#onsiteSetupsStorageService.getConfiguration();
  isFiscalReprintEnabled = isFiscalReprintEnabled(this.#optimizelyService, this.onsiteSetupStorage?.place?.country_iso_code_2);

  isOssFlow(): boolean {
    const setup = this.#onsiteSetupsStorageService.getConfiguration();
    return setup?.obo_flow_type === OboFlowTypeEnum.one_stop_shop;
  }
  partner: Partner | null = null;
  printTicketsCombinedForPlans: number[] = [];
  screen = ScreenTypeaheadInput;
  shouldDisplayShiftControls: WritableSignal<boolean> = signal<boolean>(false);
  showValidateButtonForOrder: WritableSignal<Map<number, boolean>> = signal(new Map());
  validatingByOrder: WritableSignal<Map<number, boolean>> = signal(new Map());
  #validatingOrders: Order[] = [];

  createNewOrder(): void {
    if (this.#isStartingNewOrder()) {
      return;
    }
    this.#isStartingNewOrder.set(true);
    this.#zone.runOutsideAngular(() => {
      requestAnimationFrame(() => {
        setTimeout(() => {
          this.#zone.run(() => this.#navigateToNewOrder());
        });
      });
    });
  }

  ngOnInit(): void {
    this.#efrUserMessageModalService.showIfPresent().pipe(take(1), takeUntilDestroyed(this.#destroyRef)).subscribe();

    this.#spinnerService.show();

    this.#loadShift();

    if (this.#purchasedCartDataHasError()) {
      this.#handleLoadingError();
      return;
    }
    this.#loadPurchasedCartData();
    this.#updateAgreementGate();

    this.printTicketsCombinedForPlans = this.onsiteSetupStorage?.print_tickets_combined_for_plans ?? [];
    this.currency = this.#cart?.total?.currency ?? null;
    this.#shouldShowValidateButton();
    this.isDualScreen = this.#dualScreenStorageService.containsData();

    this.orderInformationList.set(this.#generateListOfOrders());
    this.#spinnerService.hide();

    this.#resetScroll();
    this.#applyPrinter();
    this.#registerEfstaFiscalReceipt();
    this.#handleBookingQuestions();
    this.#updateShouldDisplayShiftControls();
    this.#toggleFooterForOssFlow();
    this.#cartTimingService.recordSaleScreenShown(this.#cart?.id);
  }

  ngOnDestroy(): void {
    this.#reservationSettlementSessionService.clear();
    if (this.isOssFlow()) {
      window.dispatchEvent(new CustomEvent(TOGGLE_FOOTER_EVENT_KEY, { detail: { isActive: true } }));
    }
  }

  openDeliveryNote(order: Order): void {
    this.loadingDeliveryNote = true;
    const reservationId = order.reservationId!;
    this.#trackingService.track(
      new ClickGetDeliveryNoteEvent({
        reservation_id: reservationId,
        plan_id: order.planId!,
        plan_name: order.planName!,
        place_id: undefined!,
        place_name: undefined!,
        source: ClickGetDeliveryNoteSourceEnum.CREATE_ORDER,
        reservation_locator: order.reservationLocator!,
        channel: this.onsiteSetupStorage?.channel_id ?? Channel.BoxOffice,
        obo_flow_type: this.onsiteSetupStorage?.obo_flow_type,
      }),
    );
    const fileName = `reservation.${reservationId}.pdf`;
    this.#reservationsService
      .exportPDFDeliveryNote(reservationId, this.locale)
      .pipe(
        finalize(() => {
          this.loadingDeliveryNote = false;
          this.#ref.detectChanges();
        }),
      )
      .subscribe({
        next: (buffer: Blob) => {
          this.#downloadFilesService.downloadFile(buffer, ExportTypeEnum.PDF, fileName);
        },
        error: () => {
          const modal = this.#modalService.open(MessageModalComponent);
          modal.componentInstance.title = this.#translate.instant(PurchasedCartComponent.commonErrorTitleKey);
          modal.componentInstance.messages = [this.#translate.instant(PurchasedCartComponent.genericErrorKey)];
        },
      });
  }

  openTickets(order: Order): void {
    if (this.agreementBlocked()) {
      return;
    }
    const ordersToOpen = this.#getOrdersForTicketOperations(order);
    const mappedOrder = this.#mapOrdersToPrintWithCombinedTickets(ordersToOpen);

    this.#printFacadeService.dispatch({
      documentType: PrintDocumentType.ticket,
      entryPoint: PrintEntryPoint.purchased_cart_open_tickets,
      printerType: PrintPrinterType.browser_pdf,
      target: { args: [mappedOrder, { shouldDownload: true }], method: 'openTickets' },
    });
  }

  isReprintingFiscalReceipt = false;
  #pendingFranceFiscalDuplicate: { fiscalNumber: string; fiscalTags: FiscalTag[]; orderId: number } | null = null;

  #navigateToNewOrder(): void {
    this.#router
      .navigate(['/box-office'], {
        queryParams: { mode: null, modified_order_id: null },
        queryParamsHandling: 'merge',
      })
      .finally(() => {
        this.#isStartingNewOrder.set(false);
      });
  }

  #reprintFiscalReceipt(order: Order): void {
    if (this.isReprintingFiscalReceipt) {
      return;
    }

    if (isOrderWithoutTillSale(order)) {
      this.#printNonFiscalReceipt(order);
      return;
    }

    this.isReprintingFiscalReceipt = true;

    const countryCode = this.onsiteSetupStorage?.place?.country_iso_code_2;
    const reprintVariant = resolveFiscalReprintVariant(this.#optimizelyService, countryCode);
    if (reprintVariant === 'france') {
      this.#reprintFranceFiscalReceipt(order);
      return;
    }
    if (reprintVariant === 'hungary' || reprintVariant === 'poland') {
      this.#reprintEfstaFiscalReceipt(order);
      return;
    }

    this.isReprintingFiscalReceipt = false;
  }

  #reprintEfstaFiscalReceipt(order: Order): void {
    const reprintInput = {
      order,
      partnerId: this.partnerId,
      countryCode: this.onsiteSetupStorage?.place?.country_iso_code_2,
      onsiteSetupId: this.onsiteSetupStorage?.id,
    };
    this.#printFacadeService
      .dispatch({
        documentType: PrintDocumentType.fiscal_receipt,
        entryPoint: PrintEntryPoint.purchased_cart_reprint_efsta,
        printerType: PrintPrinterType.efsta_efr,
        target: { args: [reprintInput], method: 'reprintReceipt' },
      })
      .pipe(
        finalize(() => {
          this.isReprintingFiscalReceipt = false;
        }),
        takeUntilDestroyed(this.#destroyRef),
      )
      .subscribe((result: EfstaReprintResult) => {
        if (result.kind === 'no-fiscal') {
          this.#printNonFiscalReceipt(order);
        }
      });
  }

  #reprintFranceFiscalReceipt(order: Order): void {
    const pendingDuplicate = this.#getPendingFranceFiscalDuplicate(order);
    if (pendingDuplicate) {
      this.isReprintingFiscalReceipt = true;
      this.#printFranceFiscalReceipt(order, pendingDuplicate.fiscalNumber, pendingDuplicate.fiscalTags)
        .pipe(takeUntilDestroyed(this.#destroyRef))
        .subscribe();
      return;
    }

    this.#printFacadeService
      .dispatchUntracked({
        args: [
          {
            channelType: order.channelType,
            orderId: order.id,
            partnerId: this.partnerId,
            sourceRescheduleOrderId: order.sourceRescheduleOrderId,
          },
        ],
        method: 'findFranceFiscalSale',
      })
      .pipe(
        switchMap(lookup => {
          if (lookup.kind === 'no-fiscal') {
            this.#clearFranceFiscalReprintGuard();
            this.#printNonFiscalReceipt(order);
            return EMPTY;
          }
          if (lookup.kind !== 'found') {
            this.#clearFranceFiscalReprintGuard();
            return EMPTY;
          }

          return this.#registerFranceFiscalDuplicate(order, lookup.saleOrderId);
        }),
        takeUntilDestroyed(this.#destroyRef),
      )
      .subscribe();
  }

  #registerFranceFiscalDuplicate(order: Order, saleOrderId: number): ReturnType<AdyenPrinterService['printAdyen']> {
    if (!this.#canPrintFranceFiscalReceipt(order)) {
      this.#showFranceFiscalPrinterNotSetupError();
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

        if (!this.#canPrintFranceFiscalReceipt(order)) {
          this.#showFranceFiscalPrinterNotSetupError();
          this.#clearFranceFiscalReprintGuard();
          return EMPTY;
        }

        const registerInput = {
          channelType: order.channelType,
          partnerId: this.partnerId,
          orderId: saleOrderId,
          reason,
        };
        return this.#printFacadeService.dispatchUntracked({ args: [registerInput], method: 'registerDuplicate' });
      }),
      switchMap(result => {
        if (result.kind === 'no-fiscal') {
          this.#clearFranceFiscalReprintGuard();
          this.#printNonFiscalReceipt(order);
          return EMPTY;
        }
        if (result.kind !== 'success') {
          this.#clearFranceFiscalReprintGuard();
          return EMPTY;
        }

        this.#pendingFranceFiscalDuplicate = {
          fiscalNumber: result.fiscalNumber,
          fiscalTags: result.fiscalTags,
          orderId: order.id!,
        };

        return this.#printFranceFiscalReceipt(order, result.fiscalNumber, result.fiscalTags);
      }),
    );
  }

  #canPrintFranceFiscalReceipt(order: Order): boolean {
    const deviceId = toPrintDeviceId(this.#paymentConfigStorageService.getConfiguration()?.deviceId);

    return Boolean(deviceId && order.id && order.planId && this.partnerId !== undefined);
  }

  #printFranceFiscalReceipt(order: Order, fiscalNumber: string, fiscalTags: FiscalTag[]) {
    const deviceId = toPrintDeviceId(this.#paymentConfigStorageService.getConfiguration()?.deviceId);

    if (!deviceId || !order.id || !order.planId || this.partnerId === undefined) {
      this.#showFranceFiscalPrinterNotSetupError();
      this.#clearFranceFiscalReprintGuard();
      return EMPTY;
    }

    return this.#printAdyen$(PrintDocumentType.france_duplicate, [
      this.partnerId,
      order.planId,
      this.#orderPrintingService.resolvePlaceId(this.#onsiteSetupsStorageService.getConfiguration(), order),
      order.id,
      deviceId,
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
        this.#logPrintAdyen(order, 'Error on adyen print', PrinterDocumentType.receipt, deviceId, error);
        this.#showRetryableFranceFiscalPrintAdyenError(order, error, fiscalNumber, fiscalTags);
        this.#spinnerService.hide();
        return EMPTY;
      }),
    );
  }

  #clearFranceFiscalReprintGuard(): void {
    this.isReprintingFiscalReceipt = false;
    this.#ref.markForCheck();
  }

  #getPendingFranceFiscalDuplicate(order: Order): { fiscalNumber: string; fiscalTags: FiscalTag[] } | null {
    if (this.#pendingFranceFiscalDuplicate?.orderId === order.id) {
      return this.#pendingFranceFiscalDuplicate;
    }

    return null;
  }

  #showFranceFiscalPrinterNotSetupError(): void {
    this.#showErrorModal(this.#translate.instant(PurchasedCartComponent.adyenPrinterErrorTitleKey), [
      this.#translate.instant(PurchasedCartComponent.adyenPrinterNotSetupKey),
    ]);
  }

  printAdyen(orders: Order[], documentType: PrinterDocumentType, atIndex?: number, startFromIndex: number = 0): void {
    if (documentType === PrinterDocumentType.ticket && this.agreementBlocked()) {
      return;
    }
    const ordersToPrint =
      documentType === PrinterDocumentType.ticket && this.#ordersForPrint !== null && this.#ordersForPrint.length > 0
        ? this.#ordersForPrint
        : orders;

    if (!this.#hasTicketsOrProducts(ordersToPrint)) {
      return;
    }

    const deviceId = toPrintDeviceId(this.#paymentConfigStorageService.getConfiguration()?.deviceId);

    if (this.partnerId === undefined) {
      return;
    }

    if (documentType === PrinterDocumentType.ticket && !deviceId) {
      this.#printOrders();
      return;
    }

    const mappedOrders = this.#mapOrdersToPrintWithCombinedTickets(ordersToPrint);

    const allPrintOperations = mappedOrders.map(({ order, isUnifiedTicket }) =>
      this.#createPrintObservable(order, deviceId ?? '', documentType, atIndex, isUnifiedTicket),
    );

    const remainingOperations = allPrintOperations.slice(startFromIndex);

    if (remainingOperations.length === 0) {
      return;
    }

    let currentIndex = startFromIndex;

    concat(...remainingOperations)
      .pipe(
        tap(({ order }) => {
          currentIndex++;
          this.#checkoutLogger.info(
            'Adyen print successfully',
            this.#getCheckoutLoggerContext({
              documentType: documentType,
            }),
            {
              cartId: order?.cart?.id,
              orderId: order?.id,
            },
          );
        }),
        takeUntilDestroyed(this.#destroyRef),
      )
      .subscribe({
        error: ({ error, order }) => {
          this.#logPrintAdyen(order, 'Error on adyen print', documentType, deviceId ?? '', error);
          this.#showRetryablePrintAdyenError(order, error, documentType, orders, atIndex, currentIndex);
          this.#spinnerService.hide();
        },
      });
  }

  printReceipt(order: Order): void {
    if (this.isFiscalReprintEnabled) {
      this.#reprintFiscalReceipt(order);
      return;
    }
    this.#printNonFiscalReceipt(order);
  }

  #printNonFiscalReceipt(order: Order): void {
    if (this.isEpsonReceiptPrinter()) {
      this.#printEpsonReceipt$(order).pipe(takeUntilDestroyed(this.#destroyRef)).subscribe();
      return;
    }
    this.printAdyen([order], PrinterDocumentType.receipt);
  }

  #updateShouldDisplayShiftControls(): void {
    if (this.isOssFlow()) {
      this.shouldDisplayShiftControls.set(false);
      return;
    }
    const hasMandatoryFilters = Boolean(this.currency);
    const shouldDisplay = Boolean(this.hasShiftsEnabled && hasMandatoryFilters);
    this.shouldDisplayShiftControls.set(shouldDisplay);
  }

  validateTickets(order: Order): void {
    if (this.agreementBlocked()) {
      return;
    }
    this.#validateTicketsFromOrders(toOrderForManualTicketOperations(order));
  }

  /**
   * Opens the agreement documents for a blocked order. Closing the modal re-runs the existing gate
   * refresh, so a signature completed inside it unblocks the tickets without a second refresh path.
   */
  protected openAgreementList(order: Order): void {
    const orderId = order.id;
    if (orderId === undefined || this.partnerId === undefined) {
      return;
    }
    this.#agreementSigningModalService
      .open({ orderId, partnerId: this.partnerId })
      .closed$.pipe(take(1), takeUntilDestroyed(this.#destroyRef))
      .subscribe(() => this.#refreshAgreementGate());
  }

  #refreshAgreementGate(): void {
    const cartId = this.#cart?.id;
    if (!cartId || this.partnerId === undefined) {
      return;
    }
    const partnerId = this.partnerId;
    this.#spinnerService.show();
    this.#purchaseService
      .searchOrders({ partnerId, cartId, includeOrderItems: true, includePerItemTax: true, includeReschedules: true })
      .pipe(
        switchMap(response => {
          if (response.error !== null || response.data == null) {
            return throwError(() => response.error);
          }
          const cartOrders = response.data;
          // Out-of-cart grouped-print orders never come back from a by-cart search, so their
          // withheld ticket maps have to be refetched by order id, exactly as the resolver
          // fetched them at load.
          const missingOrderIds = (this.#ordersForPrint ?? [])
            .map(order => order.id)
            .filter(orderId => !cartOrders.some(cartOrder => cartOrder.id === orderId));
          if (missingOrderIds.length === 0) {
            return of(cartOrders);
          }
          return forkJoin(
            missingOrderIds.map(orderId =>
              this.#purchaseService.searchOrders({
                partnerId,
                orderId,
                includeOrderItems: true,
                includePerItemTax: true,
                includeReschedules: true,
              }),
            ),
          ).pipe(
            map(groupedResponses => {
              const failed = groupedResponses.find(grouped => grouped.error !== null || grouped.data == null);
              if (failed !== undefined) {
                throw failed.error;
              }
              return [...cartOrders, ...groupedResponses.flatMap(grouped => grouped.data ?? [])];
            }),
          );
        }),
        take(1),
        finalize(() => this.#spinnerService.hide()),
        takeUntilDestroyed(this.#destroyRef),
      )
      .subscribe({
        error: () => this.#showAgreementRefreshError(),
        next: freshOrders => {
          // #ordersForPrint carries the grouped-print copies fetched at load; a print after this
          // refresh must not fall back to those load-time ticket maps, whose codes were withheld.
          [...(this.#orders ?? []), ...(this.#ordersForPrint ?? [])].forEach(order => {
            const freshOrder = freshOrders.find(fresh => fresh.id === order.id);
            if (!freshOrder) {
              return;
            }
            order.accessTickets = freshOrder.accessTickets;
            order.ticketsAndProducts = freshOrder.ticketsAndProducts;
          });
          this.#shouldShowValidateButton();
          this.#updateAgreementGate();
        },
      });
  }

  /**
   * A refresh that failed must say so: the notice is unchanged either way, so a silent failure
   * reads to the operator as "the signature still has not landed".
   */
  #showAgreementRefreshError(): void {
    this.#showErrorModal(this.#translate.instant(PurchasedCartComponent.commonErrorTitleKey), [
      this.#translate.instant(PurchasedCartComponent.genericErrorKey),
    ]);
  }

  #applyPrinter(): void {
    if (this.autoPrint && this.agreementBlocked()) {
      this.#checkoutLogger.info(
        'Skipping auto ticket print and auto validation due to unsigned agreement release condition',
        this.#getCheckoutLoggerContext(),
        {
          cartId: this.#cart?.id,
          orderIds: this.#orders?.map(o => o.id),
        },
      );
      this.#autoPrintReceipt();
    } else if (this.autoPrint) {
      this.#checkoutLogger.info('Executing auto print order', this.#getCheckoutLoggerContext(), {
        cartId: this.#cart?.id,
        orderIds: this.#orders?.map(o => o.id),
      });
      if (this.onsiteSetupStorage?.obo_printer_type === OboPrinterTypeEnum.adyen_printer) {
        // Adyen prints ticket and receipt together in a single chained job.
        // (Adyen ticket printing and Epson receipt printing are mutually exclusive setups.)
        this.#printTicketsAndReceipt(this.#orders!);
      } else {
        if (!this.isMobilePoS) {
          this.#printOrders();
        }
        this.#autoPrintReceipt();
      }
      if (this.autovalidateTickets) {
        setTimeout(() => {
          this.#validateAllTickets();
        });
      }
    }
    this.#isPrintingSpinnerDone$.next(true);
  }

  #autoPrintReceipt(): void {
    if (!this.#cart || !this.#orders) {
      this.#checkoutLogger.info('Ignoring print due to no orders or no cart', this.#getCheckoutLoggerContext(), {
        cartId: this.#cart?.id,
        orderIds: this.#orders?.map(o => o.id),
      });
      return;
    }

    const isEpson = this.isEpsonReceiptPrinter();

    // Epson receipts are exempt from the zero-amount suppression so complimentary carts still print.
    if (this.#isReceiptPrintingDisabled(isEpson)) {
      this.#checkoutLogger.info(
        'Ignoring print due to: is disabled by optimizely, is a free #cart or is paid by delegated',
        this.#getCheckoutLoggerContext(),
        {
          cartId: this.#cart.id,
          orderIds: this.#orders.map(o => o.id),
          amount: this.#cart.total?.amount,
          paymentMethod: this.#ordersPaymentMethod,
        },
      );
      return;
    }

    if (isEpson) {
      const orders = this.#orders;
      const documentTypes: PrinterDocumentType[] = this.#cashlogyEnabled()
        ? [PrinterDocumentType.receipt, PrinterDocumentType.cash_integration]
        : [PrinterDocumentType.receipt];
      const printJobs = documentTypes.flatMap(documentType => orders.map(order => this.#printEpsonReceipt$(order, documentType, false)));
      // Surface at most one consolidated error for the whole serialized batch instead of one modal per failed job.
      let hasAnyFailure = false;
      concat(...printJobs)
        .pipe(
          tap(printed => {
            if (printed === false) {
              hasAnyFailure = true;
            }
          }),
          finalize(() => {
            if (hasAnyFailure) {
              this.#showEpsonReceiptError();
            }
          }),
          takeUntilDestroyed(this.#destroyRef),
        )
        .subscribe();
      return;
    }

    const paymentConfigStorage = this.#paymentConfigStorageService.getConfiguration();
    if (!paymentConfigStorage?.deviceId || !canPrintOnAdyenTerminal(paymentConfigStorage, this.onsiteSetupStorage)) {
      this.#checkoutLogger.info('Ignoring print due to Adyen is not set', this.#getCheckoutLoggerContext(), {
        cartId: this.#cart.id,
        orderIds: this.#orders.map(o => o.id),
      });
      return;
    }

    this.printAdyen(this.#orders, PrinterDocumentType.receipt);

    if (this.#cashlogyEnabled()) {
      this.printAdyen(this.#orders, PrinterDocumentType.cash_integration);
    }
  }

  #cashlogyEnabled(): boolean {
    return this.#orders!.some(order => {
      if (order.paymentMethod !== PaymentType.CASH) {
        return false;
      }

      return this.#optimizelyService.isFeatureEnabled(
        {
          optimizelyFeatureKey: FeatureFlags.CASHLOGY_INTEGRATION,
          team: 'b2b-onsite',
        },
        {
          plan_id: order.planId!.toString(),
        },
      );
    });
  }

  #checkResponseData<T>(
    order: Order,
    response: BaseResponse<T>,
    documentType: PrinterDocumentType,
    deviceId: string,
  ): Observable<BaseResponse<T>> {
    if (response?.data) {
      this.#logPrintAdyen(order, 'Adyen print successfully', documentType, deviceId);
      return of(response);
    } else {
      this.#logPrintAdyen(order, 'Error on adyen print', documentType, deviceId, response);
      this.#showAdyenError(order, response, documentType);
      return throwError(() => response);
    }
  }

  #executeGiftAidPrintingFlow(order: Order, deviceId: string | undefined): Observable<boolean | BaseResponse<PrintStatus> | null> {
    const giftAidSpinnerModal: NgbModalRef = this.#showSpinnerModal(
      this.#translate.instant(PurchasedCartComponent.giftAidPrintingMessageKey),
      {
        backdrop: 'static',
        keyboard: false,
      },
    );
    return this.#printGiftAidFlow({
      partnerId: this.partnerId!,
      planId: order.planId!,
      placeId: this.#orderPrintingService.resolvePlaceId(this.#onsiteSetupsStorageService.getConfiguration(), order),
      orderId: order.id!,
      deviceId,
    }).pipe(
      tap(() => {
        this.#checkoutLogger.info('Gift Aid printing flow completed successfully', this.#getCheckoutLoggerContext(), {
          cartId: order.cart?.id,
          orderId: order.id,
        });
      }),
      catchError(error => {
        this.#checkoutLogger.error('Error during Gift Aid printing flow', this.#getCheckoutLoggerContext(), {
          cartId: order.cart?.id,
          orderId: order?.id,
          error: error?.toString(),
        });
        this.#showErrorModal(this.#translate.instant(PurchasedCartComponent.giftAidErrorTitleKey), [
          this.#translate.instant(PurchasedCartComponent.giftAidErrorPrintingFailedKey),
        ]);
        throw error;
      }),
      finalize(() => {
        giftAidSpinnerModal.close();
      }),
    );
  }

  #generateListOfOrders(): PurchasedCartOrderInformation[] {
    if (!this.#cart) {
      return [];
    }
    const sessionItemsByMainPlanAndDatetime = this.#cart.getSessionItemsByMainPlanAndDatetime();
    const visibleOrders = this.#orders!.filter(order => !isFlexibleBundleSecondary(this.#flexibleBundle, order));
    return visibleOrders.map(order => {
      const cartSessionsByDatetime =
        sessionItemsByMainPlanAndDatetime.get(order.planId!) ??
        order.cart?.getSessionItemsByMainPlanAndDatetime().get(order.planId!) ??
        new Map<string, CartSession[]>();
      const mainPlan = this.#mainPlans?.find(plan => plan.id === order.planId!);
      const discounts = order.cart?.coupons?.discounts;

      if (discounts?.length) {
        this.#applyDiscountsToCartSessions(cartSessionsByDatetime, discounts);
      }

      return {
        cartSessionsByDatetime,
        flexibleBundle: isFlexibleBundlePrimary(this.#flexibleBundle, order) ? this.#flexibleBundle : null,
        mainPlan: mainPlan!,
        order,
      };
    });
  }

  #applyDiscountsToCartSessions(cartSessionsByDatetime: Map<string, CartSession[]>, discounts: CouponDiscount[]): void {
    const allDiscountItems = discounts.flatMap(discount => discount.discounts);

    Array.from(cartSessionsByDatetime.values())
      .flat()
      .forEach(cartSession => {
        if (!cartSession.unitPrice || !cartSession.sessionType?.id) {
          return;
        }

        const applicableDiscount = allDiscountItems.find(discountItem => discountItem.ticketTypeId === cartSession.sessionType?.id);

        if (applicableDiscount) {
          cartSession.autoAppliedPlanDiscountsInfo = calculateAutoAppliedPlanDiscountsInfo(
            applicableDiscount.discount,
            applicableDiscount.discountType,
            cartSession.unitPrice,
          );
        }
      });
  }

  #getCheckoutLoggerContext(data?: Record<string, unknown>): CheckoutLogContext {
    return {
      stage: CheckoutStageEnum.VIEW_ORDER,
      cartId: this.#cart?.id,
      data,
    };
  }

  #printViaTicketPrinter$(orders: { order: Order; isUnifiedTicket?: boolean }[]): Observable<void> {
    return this.#printFacadeService.dispatch({
      documentType: PrintDocumentType.ticket,
      entryPoint: PrintEntryPoint.purchased_cart_print_orders,
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
      entryPoint: PrintEntryPoint.purchased_cart_print_adyen,
      printerType: PrintPrinterType.adyen,
      target: { args, method: 'printAdyen' },
    });
  }

  #printEpsonViaFacade$(
    documentType: PrinterDocumentType,
    args: Parameters<EpsonReceiptService['printReceipt$']>,
  ): ReturnType<EpsonReceiptService['printReceipt$']> {
    return this.#printFacadeService.dispatch({
      documentType: toPrintDocumentType(documentType),
      entryPoint: PrintEntryPoint.purchased_cart_print_epson_receipt,
      printerType: PrintPrinterType.epson,
      target: { args, method: 'printReceipt$' },
    });
  }

  protected isEpsonReceiptPrinter(): boolean {
    return this.#printFacadeService.isEpsonReceiptPrinter();
  }

  #printEpsonReceipt$(
    order: Order,
    documentType: PrinterDocumentType = PrinterDocumentType.receipt,
    showErrorOnFailure = true,
  ): Observable<boolean | null> {
    const partnerId = this.partnerId;
    const planId = order.planId;
    const orderId = order.id;
    if (partnerId === undefined || planId == null || orderId == null) {
      return of(null);
    }
    const placeId = this.#orderPrintingService.resolvePlaceId(this.#onsiteSetupsStorageService.getConfiguration(), order);
    return this.#printEpsonViaFacade$(documentType, [partnerId, planId, placeId, orderId, documentType]).pipe(
      tap(printed => {
        if (!printed && showErrorOnFailure) {
          this.#showEpsonReceiptError();
        }
      }),
    );
  }

  #showEpsonReceiptError(): void {
    this.#showErrorModal(this.#translate.instant(PurchasedCartComponent.commonErrorTitleKey), [
      this.#translate.instant(PurchasedCartComponent.genericErrorKey),
    ]);
  }

  #createPrintObservable(
    order: Order,
    deviceId: string,
    documentType: PrinterDocumentType,
    atIndex?: number,
    isUnifiedTicket?: boolean,
  ): Observable<{ response: unknown; order: Order; documentType: PrinterDocumentType }> {
    return of(this.#logPrintAdyen(order, 'Going to print through Adyen', documentType, deviceId)).pipe(
      switchMap(() => this.#getPrintRequest(order, deviceId, documentType, atIndex, isUnifiedTicket)),
      mergeMap(response => this.#checkResponseData(order, response!, documentType, deviceId)),
      map(response => ({ response, order, documentType })),
      catchError(error => {
        throw { error, order, documentType };
      }),
    );
  }

  #getPrintRequest(
    order: Order,
    deviceId: string,
    printerDocument: PrinterDocumentType,
    atIndex?: number,
    isUnifiedTicket?: boolean,
  ): Observable<BaseResponse<PrintStatus> | null> {
    return this.#printAdyen$(toPrintDocumentType(printerDocument), [
      this.partnerId!,
      order.planId!,
      this.#orderPrintingService.resolvePlaceId(this.#onsiteSetupsStorageService.getConfiguration(), order),
      order?.id ?? 0,
      deviceId,
      printerDocument,
      atIndex,
      isUnifiedTicket,
    ]);
  }

  // TODO: B2BO-4140 implement booking questions handling for multi plan
  #handleBookingQuestions(): void {
    this.#isPrintingSpinnerDone$
      .asObservable()
      .pipe(
        exhaustMap((isPrintingSpinnerDone: boolean) => {
          if (!isPrintingSpinnerDone || !this.#orders || !this.#cart) {
            return of(null);
          }

          const ordersRequiringGiftAid = this.#orders.filter(order => this.#isGiftAidRequiredForOrder(order));
          const deviceId: string | undefined = toPrintDeviceId(this.#paymentConfigStorageService.getConfiguration()?.deviceId);

          if (this.#orders.length === 1) {
            const order = this.#orders[0];
            if (!this.#isPrintingTicketsAndReceiptDone()) {
              this.#isPrintingTicketsAndReceiptDone.set(true);
              return this.#bookingQuestionsModalService.handlePostBookingQuestions(order).pipe(
                switchMap(() => {
                  if (ordersRequiringGiftAid.length > 0 && (deviceId !== undefined || this.isEpsonReceiptPrinter())) {
                    return this.#handleGiftAidForOrders(ordersRequiringGiftAid, deviceId);
                  }
                  return of(null);
                }),
              );
            }
          } else {
            if (!this.#isPrintingTicketsAndReceiptDone()) {
              this.#isPrintingTicketsAndReceiptDone.set(true);
              return this.#bookingQuestionsModalService.handlePostBookingQuestionsForOrders(this.#orders, this.#cart).pipe(
                switchMap(() => {
                  if (ordersRequiringGiftAid.length > 0 && (deviceId !== undefined || this.isEpsonReceiptPrinter())) {
                    return this.#handleGiftAidForOrders(ordersRequiringGiftAid, deviceId);
                  }
                  return of(null);
                }),
              );
            }
          }

          return of(null);
        }),
        catchError(error => {
          this.#showErrorModal(this.#translate.instant(PurchasedCartComponent.commonErrorTitleKey), [
            this.#translate.instant(error?.message ?? error?.error?.message ?? PurchasedCartComponent.bookingQuestionsGenericErrorKey),
          ]);
          return of(null);
        }),
        takeUntilDestroyed(this.#destroyRef),
      )
      .subscribe();
  }

  #handleGiftAidForOrders(orders: Order[], deviceId: string | undefined, isCustomerCopy = false): Observable<null> {
    if (orders.length === 0 || (!isCustomerCopy && this.#isPrintingDeclarationDone())) {
      return of(null);
    }

    return this.#showGiftAidConfirmationModal(!isCustomerCopy).pipe(
      switchMap((doPrint: boolean | undefined) => {
        if (!doPrint) {
          return of(false);
        }
        return forkJoin(orders.map(order => this.#executeGiftAidPrintingFlow(order, deviceId))).pipe(
          tap(() => {
            if (!isCustomerCopy) {
              this.#isPrintingDeclarationDone.set(true);
            }
          }),
          map(() => true),
          catchError(() => of(true)),
        );
      }),
      switchMap(() => {
        if (!isCustomerCopy) {
          return this.#handleGiftAidForOrders(orders, deviceId, true);
        }
        return of(null);
      }),
      map((): null => null),
    );
  }

  #isGiftAidRequiredForOrder(order: Order): boolean {
    const isGiftAidFeatureEnabled =
      this.#optimizelyService.isFeatureEnabled(FeatureFlags.GIFT_AID, { plan_id: order.planId?.toString() ?? '' }) ?? false;
    return isGiftAidFeatureEnabled && this.#giftAidDetectionService.detectGiftAidNeeded(order);
  }

  #handleLoadingError(): void {
    const purchasedCartData = this.#route.snapshot.data.purchasedCartData as BaseResponse<PurchasedCartData>;
    const modal = this.#showErrorModal(this.#translate.instant(PurchasedCartComponent.commonErrorTitleKey), [
      this.#translate.instant(purchasedCartData.error.message),
    ]);
    this.#spinnerService.hide();
    modal.closed.pipe().subscribe({
      complete: () => {
        this.#router.navigate(['/box-office'], {
          queryParams: { mode: null, modified_order_id: null },
          queryParamsHandling: 'merge',
        });
      },
    });
  }

  #hasTicketsOrProducts(orders: Order[]): boolean {
    return orders.every(order => this.#hasTicketsOrProductsSingleOrder(order));
  }

  #hasTicketsOrProductsSingleOrder(order: Order): boolean {
    return !!(order?.ticketsAndProducts && order.ticketsAndProducts.size > 0);
  }

  #isReceiptPrintingDisabled(exemptZeroAmount = false): boolean {
    const disableAutoPrintReceipt = this.#orders!.some(order =>
      this.#optimizelyService.isFeatureEnabled('disable_auto_print_receipt', { plan_id: order.planId!.toString() }),
    );
    // Epson receipts are exempt from the zero-amount suppression: complimentary/zero-amount carts must still print.
    const cartAmountZero: boolean = !exemptZeroAmount && this.#cart?.total?.amount === 0;
    const capnCashPayment: boolean = this.partnerId == CAPN_ID && this.#ordersPaymentMethod === PaymentType.CASH;
    return disableAutoPrintReceipt || cartAmountZero || capnCashPayment;
  }

  #loadPurchasedCartData() {
    const purchasedCartData = this.#route.snapshot.data.purchasedCartData.data as PurchasedCartData;

    this.#cart = purchasedCartData.cart;
    this.#orders = purchasedCartData.orders;
    this.#ordersForPrint = purchasedCartData.ordersForPrint;
    this.#flexibleBundle = purchasedCartData.flexibleBundle;
    this.#ordersPaymentMethod = this.#resolveOrdersPaymentMethod(this.#orders);
    this.#paymentTransactionId = purchasedCartData.paymentTransactionId ?? null;
    this.#mainPlans = purchasedCartData.mainPlans;
    this.#isOrderModificationLanding = purchasedCartData.isOrderModificationLanding ?? false;
    this.autoPrint = purchasedCartData.autoPrint ?? false;
  }

  #loadShift(): void {
    this.hasShiftsEnabled = (this.onsiteSetupStorage?.shift_strategy ?? ShiftStrategyEnum.disabled) !== ShiftStrategyEnum.disabled;
  }

  #resolveOrdersPaymentMethod(orders: Order[] | null): PaymentType | undefined {
    return orders?.find(order => order.paymentMethod)?.paymentMethod;
  }

  #logPrintAdyen(order: Order, message: string, documentType: PrinterDocumentType, deviceId: string, error?: any): void {
    this.#checkoutLogger.info(
      message,
      this.#getCheckoutLoggerContext({
        documentType,
        error: error?.toString(),
      }),
      {
        cartId: order.cart?.id,
        orderId: order.id,
        deviceId,
        error,
      },
    );
  }

  #getOrdersForTicketOperations(order: Order): Order[] {
    return getOrdersForTicketOperations(this.#ordersForPrint, order);
  }

  #hasGroupedOrdersForPrint(): boolean {
    return this.#ordersForPrint !== null && this.#ordersForPrint.length > 0;
  }

  #mapOrdersToPrintWithCombinedTickets(orders: Order[]): { isUnifiedTicket: boolean; order: Order }[] {
    return orders.map(order => {
      return { order, isUnifiedTicket: order.planId ? this.printTicketsCombinedForPlans.includes(order.planId) : false };
    });
  }

  #printGiftAidFlow({
    partnerId,
    planId,
    placeId,
    orderId,
    deviceId,
  }: {
    deviceId: string | undefined;
    orderId: number;
    partnerId: number;
    placeId: number;
    planId: number;
  }): Observable<boolean | BaseResponse<PrintStatus> | null> {
    if (this.isEpsonReceiptPrinter()) {
      return this.#printEpsonViaFacade$(PrinterDocumentType.gift_aid, [
        partnerId,
        planId,
        placeId,
        orderId,
        PrinterDocumentType.gift_aid,
      ]).pipe(
        map((printed: boolean) => {
          if (!printed) {
            // Surface the failure so the outer #executeGiftAidPrintingFlow shows the error modal.
            throw new Error('Epson gift aid printing failed');
          }
          return printed;
        }),
      );
    }

    if (deviceId === undefined) {
      return of(null);
    }

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

  #printOrders(): void {
    if (this.agreementBlocked()) {
      return;
    }
    if (
      this.#dualScreenStorageService.containsData() &&
      this.#onsiteSetupsStorageService.getConfiguration()?.obo_printer_type === OboPrinterTypeEnum.no_printer
    ) {
      return;
    }

    const ordersToPrint = this.#hasGroupedOrdersForPrint() ? this.#ordersForPrint! : (this.#orders ?? []);
    const mappedOrders = this.#mapOrdersToPrintWithCombinedTickets(ordersToPrint);

    this.#printViaTicketPrinter$(mappedOrders).pipe(takeUntilDestroyed(this.#destroyRef)).subscribe();
  }

  #printTicketsAndReceipt(orders: Order[], atIndex?: number, startFromIndex: number = 0): void {
    if (this.agreementBlocked()) {
      return;
    }
    const deviceId = toPrintDeviceId(this.#paymentConfigStorageService.getConfiguration()?.deviceId);
    if (!deviceId || this.partnerId === undefined) {
      this.#printOrders();
      return;
    }

    let allPrintOperations: Observable<{ response: unknown; order: Order; documentType: PrinterDocumentType }>[];

    if (!this.#hasGroupedOrdersForPrint()) {
      const mappedOrders = this.#mapOrdersToPrintWithCombinedTickets(orders);

      allPrintOperations = mappedOrders.flatMap(({ order, isUnifiedTicket }) => [
        this.#createPrintObservable(order, deviceId, PrinterDocumentType.ticket, atIndex, isUnifiedTicket),
        this.#createPrintObservable(order, deviceId, PrinterDocumentType.receipt, atIndex, isUnifiedTicket),
      ]);
    } else {
      const mappedTicketOrders = this.#mapOrdersToPrintWithCombinedTickets(this.#ordersForPrint!);
      const mappedReceiptOrders = this.#mapOrdersToPrintWithCombinedTickets(orders);

      allPrintOperations = [
        ...mappedTicketOrders.map(({ order, isUnifiedTicket }) =>
          this.#createPrintObservable(order, deviceId, PrinterDocumentType.ticket, atIndex, isUnifiedTicket),
        ),
        ...mappedReceiptOrders.map(({ order, isUnifiedTicket }) =>
          this.#createPrintObservable(order, deviceId, PrinterDocumentType.receipt, atIndex, isUnifiedTicket),
        ),
      ];
    }

    const remainingOperations = allPrintOperations.slice(startFromIndex);

    if (remainingOperations.length === 0) {
      return;
    }

    const spinnerModal = this.#showSpinnerModal(this.#translate.instant(PurchasedCartComponent.adyenPrinterPrintingKey));
    let currentIndex = startFromIndex;

    concat(...remainingOperations)
      .pipe(
        tap(() => {
          currentIndex++;
        }),
        finalize(() => spinnerModal.close()),
        takeUntilDestroyed(this.#destroyRef),
      )
      .subscribe({
        complete: () => {
          this.#isPrintingSpinnerDone$.next(true);
        },
        error: ({ error, order, documentType }) => {
          this.#logPrintAdyen(order, 'Error on adyen print', documentType, deviceId ?? '', error);
          this.#showRetryablePrintError(order, error, documentType, orders, atIndex, currentIndex);
        },
      });
  }

  #registerEfstaFiscalReceipt(): void {
    const countryCode = this.onsiteSetupStorage?.place?.country_iso_code_2;
    const fiscalCountryProfile = resolveFiscalCountryProfile(this.#optimizelyService, countryCode);
    if (fiscalCountryProfile === undefined) {
      this.#datadogLogService.logInfo(
        'EFSTA fiscal receipt skipped - feature flag disabled',
        buildComplianceLog('registration', this.#buildComplianceLogData()),
      );
      return;
    }

    if (!this.#orders?.length) {
      return;
    }

    this.#resolvePlPaymentTenders(countryCode, fiscalCountryProfile)
      .pipe(take(1), takeUntilDestroyed(this.#destroyRef))
      .subscribe(paymentTenders => {
        this.#plPaymentTenders = paymentTenders;
        this.#registerEfstaFiscalReceiptForOrders(countryCode, fiscalCountryProfile);
      });
  }

  #resolvePlPaymentTenders(
    countryCode: string | undefined,
    fiscalCountryProfile: FiscalCountryProfile,
  ): Observable<readonly PlPaymentTender[] | undefined> {
    if (fiscalCountryProfile.mapper !== 'poland') {
      return of(undefined);
    }

    const eligibleOrderCount = (this.#orders ?? []).filter(order => this.#isOrderEligibleForPlFiscalization(order, countryCode)).length;
    if (eligibleOrderCount > 1) {
      this.#logPlPaymentBreakdownDiscarded('PL_MULTI_ORDER_CART');
      return of(undefined);
    }

    const cartId = this.#cart?.id;
    const partnerId = this.partnerId;
    const parentTransactionId = this.#paymentTransactionId;
    if (cartId == null || partnerId == null || parentTransactionId == null) {
      this.#logPlPaymentBreakdownDiscarded('PL_NO_PAYMENT_SESSION');
      return of(undefined);
    }

    return this.#paymentsService.getPaymentsStatus({ cartId, parentTransactionId, partnerId }).pipe(
      timeout(PL_PAYMENT_BREAKDOWN_TIMEOUT_MS),
      map(toPlPaymentTenders),
      tap(tenders => {
        if (tenders == null) {
          this.#logPlPaymentBreakdownDiscarded('NO_TENDERS');
        }
      }),
      catchError((error: unknown) => {
        this.#datadogLogService.logInfo(
          'EFSTA fiscal receipt payment breakdown unavailable - declaring a single tender',
          buildComplianceLog('registration', this.#buildComplianceLogData(), {
            details: error instanceof Error ? error.message : String(error),
          }),
        );
        return of(undefined);
      }),
    );
  }

  #logPlPaymentBreakdownDiscarded(
    reason: PlPaymentBreakdownPrecheckReason | 'PL_MULTI_ORDER_CART' | 'PL_NO_PAYMENT_SESSION',
    orderId?: number,
  ): void {
    this.#datadogLogService.logInfo(
      'EFSTA fiscal receipt payment breakdown discarded - declaring a single tender',
      buildComplianceLog(
        'registration',
        this.#buildComplianceLogData(),
        orderId != null ? { errorCode: reason, orderId } : { errorCode: reason },
      ),
    );
  }

  #isReservationSettlementEnabled(): boolean {
    return this.#paymentFlowFeatureService.isNewPaymentFlowEnabled();
  }

  #resolvePaidDepositAmount(): Money | null {
    if (!this.#isReservationSettlementEnabled() || !isDepositPaidUtil(this.#cart?.deposit)) {
      return null;
    }
    const depositAmount = this.#cart?.deposit?.calculatedAmount ?? null;
    if (depositAmount == null) {
      return null;
    }
    if ((this.#orders?.length ?? 0) !== 1) {
      this.#datadogLogService.logInfo(
        'EFSTA fiscal receipt paid deposit deduction skipped - cart settles more than one order',
        buildComplianceLog('registration', this.#buildComplianceLogData(), {
          errorCode: 'DEPOSIT_MULTI_ORDER_CART',
          details: `orders=${this.#orders?.length ?? 0}`,
        }),
      );
      return null;
    }
    return depositAmount;
  }

  #isOrderEligibleForPlFiscalization(order: Order, countryCode: string | undefined): order is Order & { cart: Cart; id: number } {
    if (!order.cart || !order.id) {
      return false;
    }

    return !isPolishZeroValueTransaction(this.#optimizelyService, countryCode, order.cart.total?.amount);
  }

  #registerEfstaFiscalReceiptForOrders(countryCode: string | undefined, fiscalCountryProfile: FiscalCountryProfile): void {
    if (!this.#orders?.length) {
      return;
    }

    this.#paidDepositAmount = this.#resolvePaidDepositAmount();

    const zeroValueOrderIds: number[] = [];
    for (const order of this.#orders) {
      if (!this.#isOrderEligibleForPlFiscalization(order, countryCode)) {
        if (order.cart && order.id) {
          this.#logPolishZeroValueSkip(order.id);
          zeroValueOrderIds.push(order.id);
        }
        continue;
      }

      if (this.#efstaRegistrationTracker.isOrderRegistered(order.id)) {
        this.#datadogLogService.logInfo(
          'EFSTA fiscal receipt skipped - order already registered',
          buildComplianceLog('registration', this.#buildComplianceLogData(), { orderId: order.id }),
        );
        continue;
      }

      const isPolishTaxGroupResolution = fiscalCountryProfile.taxGroupResolution === 'poland-tax-group';
      const taxRateBySessionTypeId = isPolishTaxGroupResolution ? buildPlTaxRateBySessionTypeId(order) : buildTaxRateBySessionTypeId(order);
      const surchargeTaxRateBySessionTypeId = isPolishTaxGroupResolution
        ? buildPlSurchargeTaxRateBySessionTypeId(order)
        : buildSurchargeTaxRateBySessionTypeId(order);
      const productTypeBySessionTypeId = buildProductTypeBySessionTypeId(order);

      if (fiscalCountryProfile.mapper === 'poland') {
        const discardedReason = classifyPlPaymentBreakdown(
          order.cart,
          this.#plPaymentTenders,
          this.#paidDepositAmount,
          createTableFiscalGroupResolver(this.#onsiteSetupsStorageService.getConfiguration()),
        );
        if (discardedReason != null) {
          this.#logPlPaymentBreakdownDiscarded(discardedReason, order.id);
        }
      }

      try {
        this.#attemptEfstaRegistration(
          order,
          taxRateBySessionTypeId,
          surchargeTaxRateBySessionTypeId,
          productTypeBySessionTypeId,
          countryCode,
          fiscalCountryProfile,
        );
      } catch (error: unknown) {
        if (error instanceof PlEsrMapError && error.code === 'EFR_PL_ZERO_VALUE_TRANSACTION') {
          this.#logPolishZeroValueSkip(order.id);
          zeroValueOrderIds.push(order.id);
          continue;
        }
        this.#logEfstaMappingFailure(order, error);
      }
    }

    if (zeroValueOrderIds.length > 0 && !this.#isOrderModificationLanding) {
      this.#showErrorModal(this.#translate.instant(PurchasedCartComponent.plZeroValueTitleKey), [
        this.#translate.instant(PurchasedCartComponent.plZeroValueTransactionKey),
      ]);
    }
  }

  #logPolishZeroValueSkip(orderId: number): void {
    this.#datadogLogService.logInfo(
      'EFSTA fiscal receipt skipped - zero value transaction not accepted in Poland',
      buildComplianceLog('registration', this.#buildComplianceLogData(), {
        errorCode: EFR_PL_ZERO_VALUE_TRANSACTION_LOG_CODE,
        orderId,
      }),
    );
  }

  #logEfstaMappingFailure(order: Order, error: unknown): void {
    const errorCode = error instanceof PlEsrMapError ? error.code : 'EFR_MAPPING_FAILED';
    this.#datadogLogService.logError(
      'EFSTA fiscal receipt skipped - order could not be mapped',
      buildComplianceLog('registration', this.#buildComplianceLogData(), {
        errorCode,
        orderId: order.id!,
        details: error instanceof Error ? error.message : String(error),
      }),
    );
  }

  #attemptEfstaRegistration(
    order: Order,
    taxRateBySessionTypeId: Map<number, number> | undefined,
    surchargeTaxRateBySessionTypeId: Map<number, number> | undefined,
    productTypeBySessionTypeId: Map<number, string> | undefined,
    countryCode: string | undefined,
    fiscalCountryProfile: FiscalCountryProfile,
  ): void {
    this.#efstaFiscalService
      .registerFiscalReceipt(
        order.id!,
        order.cart!,
        order.taxes ?? [],
        false,
        this.#buildComplianceLogData(),
        this.#fiscalTerminalPlaceService.resolveFiscalTerminalPlaceId(fiscalCountryProfile, order.placeId)!,
        order.createdAt,
        taxRateBySessionTypeId,
        productTypeBySessionTypeId,
        surchargeTaxRateBySessionTypeId,
        fiscalCountryProfile,
        this.#plPaymentTenders,
        this.#paidDepositAmount,
        buildFiscalLinesByTicketId(order),
      )
      .pipe(
        switchMap(response => {
          if (isEfstaHttpError(response)) {
            return this.#handleEfstaHttpErrorWithHealthCheck(
              order,
              taxRateBySessionTypeId,
              surchargeTaxRateBySessionTypeId,
              productTypeBySessionTypeId,
              countryCode,
              response,
              fiscalCountryProfile,
            );
          }
          if (response != null) {
            this.#efstaRegistrationTracker.markOrderRegistered(order.id!);
            return this.#saveFiscalTransaction(
              order,
              response,
              taxRateBySessionTypeId,
              surchargeTaxRateBySessionTypeId,
              fiscalCountryProfile,
            );
          }
          this.#notifyPolishRegistrationFailure(fiscalCountryProfile);
          return this.#saveFiscalTransaction(
            order,
            null,
            taxRateBySessionTypeId,
            surchargeTaxRateBySessionTypeId,
            fiscalCountryProfile,
            fiscalCountryProfile.mapper === 'poland' ? EFR_NO_RESPONSE_ERROR : undefined,
          );
        }),
        takeUntilDestroyed(this.#destroyRef),
      )
      .subscribe();
  }

  #handleEfstaHttpErrorWithHealthCheck(
    order: Order,
    taxRateBySessionTypeId: Map<number, number> | undefined,
    surchargeTaxRateBySessionTypeId: Map<number, number> | undefined,
    productTypeBySessionTypeId: Map<number, string> | undefined,
    countryCode: string | undefined,
    httpError: EfstaRegistrationHttpError,
    fiscalCountryProfile: FiscalCountryProfile,
  ): Observable<unknown> {
    return this.#efrHealthCheckService.checkHealth(countryCode).pipe(
      switchMap(healthResult => {
        if (healthResult.healthy) {
          this.#notifyPolishRegistrationFailure(fiscalCountryProfile);
          return this.#saveFiscalTransaction(order, null, taxRateBySessionTypeId, surchargeTaxRateBySessionTypeId, fiscalCountryProfile, {
            error_code: httpError.errorCode,
            error_message: httpError.message,
          });
        }
        const onRetry = (): Observable<EfrHealthCheckResult> =>
          this.#retryEfstaRegistrationAfterHealthCheck(
            order,
            taxRateBySessionTypeId,
            surchargeTaxRateBySessionTypeId,
            productTypeBySessionTypeId,
            countryCode,
            fiscalCountryProfile,
          );
        return this.#efrHealthCheckModalService.showRegistrationFailureModal(healthResult, onRetry).pipe(
          switchMap(close => {
            if (close == null || close.kind === 'success') {
              return of(null);
            }
            return this.#saveFiscalTransaction(
              order,
              null,
              taxRateBySessionTypeId,
              surchargeTaxRateBySessionTypeId,
              fiscalCountryProfile,
              this.#mapPrinterHealthToNullError(close.lastUnhealthy),
            );
          }),
        );
      }),
    );
  }

  #retryEfstaRegistrationAfterHealthCheck(
    order: Order,
    taxRateBySessionTypeId: Map<number, number> | undefined,
    surchargeTaxRateBySessionTypeId: Map<number, number> | undefined,
    productTypeBySessionTypeId: Map<number, string> | undefined,
    countryCode: string | undefined,
    fiscalCountryProfile: FiscalCountryProfile,
  ): Observable<EfrHealthCheckResult> {
    return this.#efrHealthCheckService.checkHealth(countryCode).pipe(
      switchMap(healthResult => {
        if (!healthResult.healthy) {
          return of(healthResult);
        }
        this.#datadogLogService.logInfo(
          'EFSTA fiscal receipt retry after health check recovery',
          buildComplianceLog('registration', this.#buildComplianceLogData(), { orderId: order.id!, attempt: 'retry' }),
        );
        return this.#efstaFiscalService
          .registerFiscalReceipt(
            order.id!,
            order.cart!,
            order.taxes ?? [],
            false,
            this.#buildComplianceLogData(),
            this.#fiscalTerminalPlaceService.resolveFiscalTerminalPlaceId(fiscalCountryProfile, order.placeId)!,
            order.createdAt,
            taxRateBySessionTypeId,
            productTypeBySessionTypeId,
            surchargeTaxRateBySessionTypeId,
            fiscalCountryProfile,
            this.#plPaymentTenders,
            this.#paidDepositAmount,
            buildFiscalLinesByTicketId(order),
          )
          .pipe(
            tap(response => {
              if (response != null && !isEfstaHttpError(response)) {
                this.#efstaRegistrationTracker.markOrderRegistered(order.id!);
              }
            }),
            mergeMap(response => {
              if (isEfstaHttpError(response)) {
                return this.#saveFiscalTransaction(
                  order,
                  null,
                  taxRateBySessionTypeId,
                  surchargeTaxRateBySessionTypeId,
                  fiscalCountryProfile,
                  {
                    error_code: response.errorCode,
                    error_message: response.message,
                  },
                ).pipe(tap(() => this.#notifyPolishRegistrationFailure(fiscalCountryProfile)));
              }
              return this.#saveFiscalTransaction(
                order,
                response,
                taxRateBySessionTypeId,
                surchargeTaxRateBySessionTypeId,
                fiscalCountryProfile,
              );
            }),
            map(() => healthResult),
          );
      }),
    );
  }

  #notifyPolishRegistrationFailure(fiscalCountryProfile: FiscalCountryProfile): void {
    if (fiscalCountryProfile.mapper !== 'poland') {
      return;
    }
    this.#showErrorModal(this.#translate.instant(PurchasedCartComponent.fiscalNoticeTitleKey), [
      this.#translate.instant(PurchasedCartComponent.plRegistrationFailedKey),
    ]);
  }

  #mapPrinterHealthToNullError(health: EfrHealthCheckResult): FiscalTransactionNullResponseError {
    const err = health.error;
    if (err == null) {
      return {
        error_code: 'EFR_HEALTH_UNKNOWN',
        error_message: 'EFR reported unhealthy state without error details',
      };
    }
    const statePart =
      health.state != null
        ? ` | printerState: ${JSON.stringify({
            coverOpen: health.state.coverOpen,
            dayOpen: health.state.dayOpen,
            paperEnd: health.state.paperEnd,
            paperNearEnd: health.state.paperNearEnd,
            printerWork: health.state.printerWork,
            warnings: health.state.warnings,
          })}`
        : '';
    return {
      error_code: `EFR_HEALTH_${err.code}`,
      error_message: `${err.title}. ${err.description}${statePart}`,
    };
  }

  #saveFiscalTransaction(
    order: Order,
    response: EsrRegisterResponse | null,
    taxRateBySessionTypeId: Map<number, number> | undefined,
    surchargeTaxRateBySessionTypeId: Map<number, number> | undefined,
    fiscalCountryProfile: FiscalCountryProfile,
    nullResponseError?: FiscalTransactionNullResponseError,
  ): Observable<unknown> {
    if (this.partnerId == null) {
      return of(null);
    }
    const nullErrorOverride = response === null ? nullResponseError : undefined;
    const isHuFiscalCart = fiscalCountryProfile.countryCode === 'HU';
    const plTaxOptions =
      fiscalCountryProfile.taxGroupResolution === 'poland-tax-group'
        ? {
            surchargeTaxGroupBySessionTypeId: buildPlSurchargeTaxGroupBySessionTypeId(surchargeTaxRateBySessionTypeId),
            taxGroupBySessionTypeId: buildPlTaxGroupBySessionTypeId(taxRateBySessionTypeId),
          }
        : undefined;
    return this.#fiscalTransactionApiService
      .create(this.partnerId, order.id!, response, order.cart!, order.taxes ?? [], {
        fiscalLinesByTicketId: buildFiscalLinesByTicketId(order),
        taxRateBySessionTypeId,
        surchargeTaxRateBySessionTypeId,
        fiscalCountryProfile,
        isHuFiscalCart,
        paidDepositAmount: this.#paidDepositAmount,
        plPaymentTenders: this.#plPaymentTenders,
        plTaxOptions,
        nullResponseError: nullErrorOverride,
        logContext: this.#buildComplianceLogData(),
      })
      .pipe(
        catchError((error: unknown) => {
          this.#logFiscalTransactionPersistFailure(order.id!, error);
          return of(null);
        }),
      );
  }

  #logFiscalTransactionPersistFailure(orderId: number, error: unknown): void {
    if (error instanceof HttpErrorResponse) {
      return;
    }

    this.#datadogLogService.logError(
      'Fiscal transaction not persisted - persistence call failed',
      buildComplianceLog('persist-transaction', this.#buildComplianceLogData(), {
        errorCode: PurchasedCartComponent.fiscalTransactionPersistFailedLogCode,
        orderId,
        details: error instanceof Error ? error.message : String(error),
      }),
    );
  }

  #purchasedCartDataHasError(): boolean {
    const purchasedCartData = this.#route.snapshot.data.purchasedCartData as BaseResponse<PurchasedCartData>;
    if (
      !purchasedCartData.data ||
      purchasedCartData.error ||
      !purchasedCartData.data.cart ||
      !purchasedCartData.data.orders ||
      !purchasedCartData.data.orders
    ) {
      return true;
    }
    return false;
  }

  #resetScroll() {
    if (this.#dualScreenStorageService.containsData()) {
      ScrollUtils.scrollToTop();
    } else if (window.innerWidth < 1200) {
      this.#scrollToBoxOfficeContent();
    }
  }

  #scrollToBoxOfficeContent(): void {
    setTimeout(() => {
      document.getElementsByClassName('box-office-content__container').item(0)?.scrollIntoView({
        behavior: 'smooth',
        block: 'start',
        inline: 'nearest',
      });
    });
  }

  #sendValidateTicketEvent(orders: Order[]): void {
    for (const order of orders) {
      this.#trackingService.track(
        new ConfirmValidateTicketsEvent({
          input: order.id!.toString(),
          input_type: 'manual',
          validation_type: ValidationTypeEnum.ORDER,
          order: order.id!,
          obo_flow_type: this.onsiteSetupStorage?.obo_flow_type,
        }),
      );
    }
  }

  #shouldShowValidateButton(): void {
    const showValidationButtons = new Map<number, boolean>();
    for (const order of this.#orders ?? []) {
      showValidationButtons.set(order.id!, this.#shouldShowValidateButtonForOrder(order));
    }
    this.showValidateButtonForOrder.set(showValidationButtons);
  }

  #shouldShowValidateButtonForOrder(order: Order): boolean {
    return Array.from(order.ticketsAndProducts?.values() || []).some(({ isValidated }) => !isValidated);
  }

  #updateAgreementGate(): void {
    const orders = this.#gatedOrders();
    this.agreementBlocked.set(areOrdersAgreementBlocked(orders));
    this.agreementAction.set(getAgreementGateAction(orders));
  }

  /** Grouped print can copy tickets from orders outside the cart, so both lists are gated. */
  #gatedOrders(): Order[] {
    const seenOrderIds = new Set<number>();
    return [...(this.#orders ?? []), ...(this.#ordersForPrint ?? [])].filter(order => {
      if (order.id === undefined) {
        return true;
      }
      if (seenOrderIds.has(order.id)) {
        return false;
      }
      seenOrderIds.add(order.id);
      return true;
    });
  }

  #showAdyenError(order: Order, error: any, documentType: PrinterDocumentType): void {
    if (error instanceof AdyenPrinterNotAcceptableConditionsError) {
      this.#showPrintError(
        order,
        this.#translate.instant(PurchasedCartComponent.adyenPrinterNotAcceptableConditionsKey),
        documentType,
        error.atIndex,
      );
    } else if (error instanceof AdyenPrinterRejectedError) {
      this.#showPrintError(
        order,
        this.#translate.instant(PurchasedCartComponent.adyenPrinterRejectedErrorKey),
        documentType,
        error.atIndex,
      );
    } else if (error instanceof AdyenPrinterTimeoutError) {
      this.#showPrintError(order, this.#translate.instant(PurchasedCartComponent.adyenPrinterTimeoutErrorKey), documentType, error.atIndex);
    } else {
      this.#showPrintError(order, this.#translate.instant(PurchasedCartComponent.adyenPrinterUnknownErrorKey), documentType, 0);
    }
  }

  #showErrorModal(title: string, messages: string[]): NgbModalRef {
    const modal = this.#modalService.open(MessageModalComponent);
    modal.componentInstance.title = title;
    modal.componentInstance.messages = messages;
    return modal;
  }

  #showGiftAidConfirmationModal(isFirstCopy = true): Observable<boolean | undefined> {
    const data: GiftAidConfirmationModalData = isFirstCopy
      ? {
          title: this.#translate.instant(PurchasedCartComponent.giftAidConfirmationTitleKey),
          message: this.#translate.instant(PurchasedCartComponent.giftAidConfirmationMessageKey),
          acceptButtonLabel: this.#translate.instant(PurchasedCartComponent.giftAidConfirmationPrintButtonKey),
        }
      : {
          title: this.#translate.instant(PurchasedCartComponent.giftAidCustomerCopyTitleKey),
          message: this.#translate.instant(PurchasedCartComponent.giftAidCustomerCopyMessageKey),
          acceptButtonLabel: this.#translate.instant(PurchasedCartComponent.giftAidCustomerCopyPrintButtonKey),
          cancelButtonLabel: this.#translate.instant(PurchasedCartComponent.giftAidCustomerCopySkipButtonKey),
        };
    const dialog: DialogRef<boolean, GiftAidConfirmationModalComponent> = this.#dialog.open(GiftAidConfirmationModalComponent, {
      data,
      hasBackdrop: true,
      disableClose: false,
      width: '500px',
      maxWidth: '90vw',
    });

    return dialog.closed.pipe(take(1));
  }

  #showPrintError(order: Order, message: string, documentType: PrinterDocumentType, atIndex: number) {
    const modal = this.#modalService.open(MessageModalComponent);
    modal.componentInstance.title = this.#translate.instant(PurchasedCartComponent.adyenPrinterErrorTitleKey);
    modal.componentInstance.messages = [message];
    modal.componentInstance.cancelButtonLabel = this.#translate.instant(PurchasedCartComponent.adyenPrinterCancelButtonKey);
    modal.componentInstance.acceptButtonLabel = this.#translate.instant(PurchasedCartComponent.adyenPrinterRetryButtonKey);
    modal.componentInstance.responseEmitter.subscribe((response: unknown) => {
      if (!response) {
        return null;
      }
      if (this.onsiteSetupStorage?.obo_printer_type !== OboPrinterTypeEnum.adyen_printer) {
        return this.printAdyen([order], documentType, atIndex);
      }
      return documentType === PrinterDocumentType.ticket
        ? this.#printTicketsAndReceipt([order], atIndex)
        : this.printAdyen([order], documentType, atIndex);
    });
  }

  #showRetryablePrintError(
    order: Order,
    error: unknown,
    documentType: PrinterDocumentType,
    allOrders: Order[],
    atIndex: number | undefined,
    retryFromIndex: number,
  ): void {
    const message = this.#getAdyenErrorMessage(error);
    const modal = this.#modalService.open(MessageModalComponent);
    modal.componentInstance.title = this.#translate.instant(PurchasedCartComponent.adyenPrinterErrorTitleKey);
    modal.componentInstance.messages = [message];
    modal.componentInstance.cancelButtonLabel = this.#translate.instant(PurchasedCartComponent.adyenPrinterCancelButtonKey);
    modal.componentInstance.acceptButtonLabel = this.#translate.instant(PurchasedCartComponent.adyenPrinterRetryButtonKey);
    modal.componentInstance.responseEmitter.subscribe((response: unknown) => {
      if (!response) {
        return;
      }
      this.#printTicketsAndReceipt(allOrders, atIndex, retryFromIndex);
    });
  }

  #getAdyenErrorMessage(error: unknown): string {
    if (error instanceof AdyenPrinterNotAcceptableConditionsError) {
      return this.#translate.instant(PurchasedCartComponent.adyenPrinterNotAcceptableConditionsKey);
    }
    if (error instanceof AdyenPrinterRejectedError) {
      return this.#translate.instant(PurchasedCartComponent.adyenPrinterRejectedErrorKey);
    }
    if (error instanceof AdyenPrinterTimeoutError) {
      return this.#translate.instant(PurchasedCartComponent.adyenPrinterTimeoutErrorKey);
    }
    return this.#translate.instant(PurchasedCartComponent.adyenPrinterUnknownErrorKey);
  }

  #showRetryablePrintAdyenError(
    order: Order,
    error: unknown,
    documentType: PrinterDocumentType,
    allOrders: Order[],
    atIndex: number | undefined,
    retryFromIndex: number,
  ): void {
    const message = this.#getAdyenErrorMessage(error);
    const modal = this.#modalService.open(MessageModalComponent);
    modal.componentInstance.title = this.#translate.instant(PurchasedCartComponent.adyenPrinterErrorTitleKey);
    modal.componentInstance.messages = [message];
    modal.componentInstance.cancelButtonLabel = this.#translate.instant(PurchasedCartComponent.adyenPrinterCancelButtonKey);
    modal.componentInstance.acceptButtonLabel = this.#translate.instant(PurchasedCartComponent.adyenPrinterRetryButtonKey);
    modal.componentInstance.responseEmitter.subscribe((response: unknown) => {
      if (!response) {
        return;
      }
      this.printAdyen(allOrders, documentType, atIndex, retryFromIndex);
    });
  }

  #showRetryableFranceFiscalPrintAdyenError(order: Order, error: unknown, fiscalNumber: string, fiscalTags: FiscalTag[]): void {
    const message = this.#getAdyenErrorMessage(error);
    const modal = this.#modalService.open(MessageModalComponent);
    modal.componentInstance.title = this.#translate.instant(PurchasedCartComponent.adyenPrinterErrorTitleKey);
    modal.componentInstance.messages = [message];
    modal.componentInstance.cancelButtonLabel = this.#translate.instant(PurchasedCartComponent.adyenPrinterCancelButtonKey);
    modal.componentInstance.acceptButtonLabel = this.#translate.instant(PurchasedCartComponent.adyenPrinterRetryButtonKey);
    modal.componentInstance.responseEmitter.subscribe((response: unknown) => {
      if (!response) {
        this.#clearFranceFiscalReprintGuard();
        return;
      }
      this.#printFranceFiscalReceipt(order, fiscalNumber, fiscalTags).pipe(takeUntilDestroyed(this.#destroyRef)).subscribe();
    });
  }

  #showSpinnerModal(message: string, options?: NgbModalOptions): NgbModalRef {
    const modal = this.#modalService.open(SpinnerModalComponent, options);
    modal.componentInstance.message = message;
    return modal;
  }

  #validateAccessTickets(orders: Order[]): void {
    this.#startValidating(orders);
    this.#validateCodes(orders);
  }

  #startValidating(orders: Order[]): void {
    this.#validatingOrders = orders;
    const validating = new Map(this.validatingByOrder());
    orders.forEach(order => {
      validating.set(order.id!, true);
    });
    this.validatingByOrder.set(validating);
  }

  #stopValidating(): void {
    const validating = new Map(this.validatingByOrder());
    this.#validatingOrders.forEach(order => {
      validating.set(order.id!, false);
    });
    this.validatingByOrder.set(validating);
    this.#validatingOrders = [];
  }

  #validateCodes(
    orders: Order[],
    codeInputsOverride?: CodeValidationInput[],
    count?: number,
    alreadyValidatedCount?: number,
    profileIdsOverride?: string[],
  ): void {
    const profileIds = profileIdsOverride ?? this.onsiteSetupStorage?.validation_profiles ?? [];
    const setupId = this.onsiteSetupStorage?.access_control_setup_id;

    this.#accessControlService
      .validateAllCodes({
        ...(codeInputsOverride ? { codeInputs: codeInputsOverride } : { orders }),
        partnerId: this.partnerId!,
        setupId,
        profileIds,
      })
      .subscribe({
        next: (result: ValidateAllCodesResult) => {
          const totalCount = count ?? result.totalCount;
          const validatedCount = (alreadyValidatedCount ?? 0) + result.validatedCount;
          if (result.profilesToSelect != null && result.profilesToSelect.length > 0) {
            return this.#openProfileSelectionModalAndRevalidate(
              orders,
              result.ambiguousCodes,
              result.profilesToSelect,
              totalCount,
              validatedCount,
            );
          }
          this.#handleValidationResult(orders, validatedCount, totalCount);
        },
        error: response => {
          this.#handleValidationError(response?.error?.message ?? PurchasedCartComponent.genericErrorKey);
        },
      });
  }

  #openProfileSelectionModalAndRevalidate(
    orders: Order[],
    ambiguousCodes: CodeValidationInput[],
    profiles: AccessControlProfile[],
    count: number,
    validatedCount: number,
  ): void {
    this.#spinnerService.hide();
    this.#igntDialogService
      .openModal<ValidationProfileSelectionModalResult, ValidationProfileSelectionModalData>(ValidationProfileSelectionModalComponent, {
        data: { profiles },
        size: 'sm',
      })
      .closed$.pipe(take(1), takeUntilDestroyed(this.#destroyRef))
      .subscribe((result: ValidationProfileSelectionModalResult | undefined) => {
        if (!result) {
          this.#handleValidationResult(orders, validatedCount, count);
          return;
        }
        this.#validateCodes(orders, ambiguousCodes, count, validatedCount, [result.profileId]);
      });
  }

  #handleValidationResult(orders: Order[], validatedCount: number, totalCount: number): void {
    this.#spinnerService.hide();
    this.#stopValidating();

    if (totalCount === 0) {
      this.#showErrorModal(this.#translate.instant(PurchasedCartComponent.commonErrorTitleKey), [
        this.#translate.instant(PurchasedCartComponent.genericErrorKey),
      ]);
      return;
    }

    if (validatedCount < totalCount) {
      this.#showErrorModal(this.#translate.instant(PurchasedCartComponent.commonErrorTitleKey), [
        this.#translate.instant('validateTicketsNew.partialValidation', { validated: validatedCount, total: totalCount }),
      ]);
      return;
    }

    const showValidationButtons = new Map(this.showValidateButtonForOrder());
    orders.forEach(order => {
      showValidationButtons.set(order.id!, false);
    });
    this.showValidateButtonForOrder.set(showValidationButtons);

    const modalRef = this.#modalService.open(ValidationSuccessComponent);
    modalRef.componentInstance.tickets = validatedCount;
    timer(3000).subscribe(() => modalRef.close());
  }

  #handleValidationError(errorMessage: string): void {
    this.#showErrorModal(this.#translate.instant(PurchasedCartComponent.commonErrorTitleKey), [this.#translate.instant(errorMessage)]);
    this.#spinnerService.hide();
    this.#stopValidating();
  }

  #validateAllTickets(): void {
    if (this.agreementBlocked()) {
      return;
    }
    const orders = this.#orders ?? [];
    if (orders.length === 0) {
      return;
    }

    this.#validateTicketsFromOrders(orders.flatMap(toOrderForManualTicketOperations));
  }

  #validateTicketsFromOrders(orders: Order[]): void {
    if (this.partnerId === undefined || orders.length === 0) {
      return;
    }
    this.#sendValidateTicketEvent(orders);
    this.#validateAccessTickets(orders);
  }

  #toggleFooterForOssFlow(): void {
    if (this.isOssFlow()) {
      window.dispatchEvent(new CustomEvent(TOGGLE_FOOTER_EVENT_KEY, { detail: { isActive: false } }));
    }
  }

  #buildComplianceLogData(): Partial<ComplianceLogData> {
    return {
      country: this.onsiteSetupStorage?.place?.country_iso_code_2,
      onsiteSetupId: this.onsiteSetupStorage?.id,
      partnerId: this.partnerId,
    };
  }
}
