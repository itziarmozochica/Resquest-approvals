import { Dialog, DialogRef } from '@angular/cdk/dialog';
import {
  AfterViewInit,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  DestroyRef,
  inject,
  OnInit,
  signal,
  WritableSignal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute } from '@angular/router';

import { PaymentModalData } from '@fz-original/app/modules/kiosk/components/payment/models/payment-modal-data.model';
import { KioskPlanDetail } from '@fz-original/app/modules/kiosk/models/kiosk-plan.model';
import { KioskPaymentService } from '@fz-original/app/modules/kiosk/services/kiosk-payment/kiosk-payment.service';
import { KioskScreensaverService } from '@fz-original/app/modules/kiosk/services/screensaver/kiosk-screensaver.service';
import { KioskSuccessModalComponent } from '@fz-original/app/modules/kiosk/shared/components/modals/kiosk-success/kiosk-success-modal.component';
import { TranslateService } from '@ngx-translate/core';
import { Observable } from 'rxjs';
import { finalize, mergeMap, retry } from 'rxjs/operators';

import { DatadogLogLevel } from '../../../../core/error/datadog/logger/datadog-log.service';
import { ClickKioskOrderConfirmationEvent } from '../../../../core/tracking/core/events/click-kiosk-order-confirmation';
import { CreateOrderEvent } from '../../../../core/tracking/core/events/create-order';
import { TrackingService } from '../../../../core/tracking/tracking.service';
import { BaseErrorResponse, BaseResponse } from '../../../../shared/models/base-response';
import { Cart } from '../../../../shared/models/cart/cart.model';
import { Customer } from '../../../../shared/models/customer/customer.model';
import { Partner } from '../../../../shared/models/partner/partner.model';
import { FeatureFlags } from '../../../../shared/optimizely/feature-flags';
import { OptimizelyService } from '../../../../shared/optimizely/optimizely.service';
import { CartService } from '../../../../shared/services/cart/cart.service';
import { DiscardCartQuery } from '../../../../shared/services/cart/discard-cart-query';
import { PartnerService } from '../../../../shared/services/partner/partner.service';
import { Channel } from '../../../../shared/services/session-availability/channel.enum';
import { UserService } from '../../../../shared/services/user/user.service';
import { PrintErrorPaymentReceiptMessageModel } from '../../../../shared/services/webview-messenger/models/print-error-payment-receipt-message.model';
import { WebviewMessengerService } from '../../../../shared/services/webview-messenger/webview-messenger.service';
import { formatErrorMessage } from '../../../../shared/utils/format-error-message';
import { PaymentProvider } from '../../../box-office/checkout/models/payment-provider.enum';
import { PaymentType } from '../../../box-office/checkout/models/payment-type.enum';
import { KioskOnsiteSetup } from '../../../box-office/shared/models/kiosk-onsite-setup';
import { PaymentMethodSetup } from '../../../box-office/shared/models/onsite-setup';
import {
  KioskInactivityResetContext,
  kioskInactivityResetMessage,
  kioskRealTimeSeatingLiterals,
  KioskRealTimeTimeslot,
} from '../../models/kiosk-real-time-seating.model';
import { IdleService } from '../../services/idle/idle.service';
import { KioskStorageService } from '../../services/kiosk-storage.service';
import { KioskService } from '../../services/kiosk.service';
import { PrinterInstruction } from '../../services/printer/models/printer-instruction.model';
import { PrinterService } from '../../services/printer/printer.service';
import { KioskCancelPaymentModalComponent } from '../../shared/components/modals/kiosk-cancel-payment/kiosk-cancel-payment-modal.component';
import { KioskDiscardCartModalComponent } from '../../shared/components/modals/kiosk-discard-cart/kiosk-discard-cart-modal.component';
import { KioskNavigationService } from '../../shared/kiosk-navigation.service';
import { isKioskRealTimeCart, toRealTimeTimeslot } from '../../utils/kiosk-real-time-seating.util';
import { checkResponseData } from '../../utils/response';
import { KioskErrorModalComponent } from './../../shared/components/modals/kiosk-error/kiosk-error-modal.component';

@Component({
  selector: 'app-kiosk-payment',
  standalone: false,
  templateUrl: './payment.component.html',
  styleUrls: ['./payment.component.scss'],
  changeDetection: ChangeDetectionStrategy.Default,
})
export class PaymentComponent implements OnInit, AfterViewInit {
  static readonly cancelButtonDisableTimeMs = 3000;
  static readonly cancelPaymentModalDialogId = 'kiosk-cancel-payment-modal';
  static readonly discardCartModalDialogId = 'kiosk-discard-cart-modal';
  static readonly expiredRealTimeBasketCode = 31010111;
  static readonly paymentCancelledCode = 857;
  static readonly paymentErrorCode = 1006;
  readonly #cartService = inject(CartService);
  #changeDetectorRef = inject(ChangeDetectorRef);
  readonly #destroyRef = inject(DestroyRef);
  readonly #dialog = inject(Dialog);
  #idleService = inject(IdleService);
  readonly #kioskNavigationService = inject(KioskNavigationService);
  readonly #kioskScreensaverService = inject(KioskScreensaverService);
  readonly #kioskService = inject(KioskService);
  protected readonly uiRefreshEnabled: boolean = this.#kioskScreensaverService.isScreensaverEnabled() === true;
  readonly #kioskStorageService = inject(KioskStorageService);
  #onsiteSetup: KioskOnsiteSetup | null = null;
  readonly #optimizelyService = inject(OptimizelyService);
  #partnerService = inject(PartnerService);
  #paymentMethodSelected: PaymentMethodSetup | null = null;
  #paymentService = inject(KioskPaymentService);
  #printerService = inject(PrinterService);
  #route = inject(ActivatedRoute);
  #trackingService = inject(TrackingService);
  readonly #translate = inject(TranslateService);
  #userService = inject(UserService);
  #webviewMessenger = inject(WebviewMessengerService);
  cart: Cart | null = null;
  currentTemplate: 'paymentMethod' | 'paymentInProgress' = 'paymentMethod';
  customer: Customer | null = null;
  isLoading: WritableSignal<boolean> = signal<boolean>(true);
  isSecondaryButtonDisabled: WritableSignal<boolean> = signal<boolean>(true);
  isSecondaryButtonVisible: WritableSignal<boolean> = signal<boolean>(true);
  locale = '';
  partner: Partner | null = null;
  paymentInProgress = false;
  paymentMethods: (PaymentMethodSetup & {
    label: string;
    src: string;
    alt: string;
  })[] = [];
  plan: KioskPlanDetail | null = null;

  clickOnPaymentMethod(method: PaymentMethodSetup): void {
    if (this.cart === null) {
      this.#kioskService.logTrace('Missing required data for payment', DatadogLogLevel.Error, {
        cart: this.cart,
      });
      this.#showGenericErrorModal();
      return;
    }

    this.#idleService.pause();
    this.#paymentMethodSelected = method;
    this.currentTemplate = 'paymentInProgress';
    this.paymentInProgress = true;

    this.#disableCancelButtonTemporarily();

    const isFreeOrder = method?.payment_method === PaymentType.FREE;
    const createOrder$ = isFreeOrder
      ? this.#paymentService.createFreeOrder({
          cart: this.cart,
          partnerId: this.partner!.id,
          planId: this.plan!.id,
          planPlaceId: this.plan!.place.id,
        })
      : this.#paymentService.createOrder({
          cart: this.cart,
          paymentMethodSelected: this.#paymentMethodSelected,
          partnerId: this.partner!.id,
          planId: this.plan!.id,
          planPlaceId: this.plan!.place.id,
        });
    createOrder$
      .pipe(
        takeUntilDestroyed(this.#destroyRef),
        finalize(() => {
          this.isLoading.set(false);
          this.isSecondaryButtonVisible.set(true);
        }),
      )
      .subscribe({
        next: ({ order, transactionId }) => {
          this.paymentInProgress = false;
          if (order.id === undefined) {
            this.#kioskService.logTrace('Order created but id is missing', DatadogLogLevel.Error, { order });
            this.#showGenericErrorModal();
            return;
          }
          this.#kioskService.logTrace(`Order ${order.id} created`, DatadogLogLevel.Info, { order });
          this.#sendCreateOrderEvent(order.id, transactionId);
          this.#trackingService.track(
            new ClickKioskOrderConfirmationEvent({
              orderId: String(order.id),
            }),
          );
          if (this.customer !== null) {
            this.#kioskNavigationService.navigateOrder(order, this.customer, this.cart ?? undefined);
          } else {
            this.#kioskService.logTrace('Customer is not available for order navigation', DatadogLogLevel.Error);
            this.#showGenericErrorModal();
          }
        },
        error: (response: BaseResponse<unknown>) => {
          this.paymentInProgress = false;
          this.currentTemplate = 'paymentMethod';
          this.#paymentMethodSelected = null;
          const responseError = response?.error;
          if (responseError?.errorCode === PaymentComponent.expiredRealTimeBasketCode && this.#isRealTimeCart()) {
            this.#handleExpiredRealTimeBasket(responseError);
            return;
          }
          const modalData: PaymentModalData =
            responseError?.errorCode === PaymentComponent.paymentCancelledCode
              ? this.#showCancelPaymentSuccessModal()
              : this.#showOrderErrorModal(responseError);
          if (responseError?.errorCode == PaymentComponent.paymentErrorCode) {
            this.#printErrorPayment();
          }
          this.#kioskService.logTrace(`Error creating order, code: ${responseError?.code}`, DatadogLogLevel.Warn, {
            responseError,
            modal: { title: modalData.title, message: modalData.message, literal: modalData.message },
          });
          this.#idleService.reset();
        },
      });
  }

  ngAfterViewInit(): void {
    // If the cart is free, we skip the payment method selection
    if (this.cart?.total?.amount === 0) {
      this.clickOnPaymentMethod({ payment_method: PaymentType.FREE });
    } else if (this.paymentMethods && this.paymentMethods.length === 1) {
      // Case: Only one payment method is available
      this.#paymentMethodSelected = this.paymentMethods[0];
      this.clickOnPaymentMethod(this.#paymentMethodSelected);
    } else {
      // Case: Multiple payment methods available, allow user to select
      this.currentTemplate = 'paymentMethod';
      this.isSecondaryButtonDisabled.set(false);
    }
    this.#changeDetectorRef.detectChanges();
  }

  ngOnInit(): void {
    this.locale = this.#translate.currentLang;
    this.#onsiteSetup = this.#kioskStorageService.getOnsiteSetup();
    if (this.#onsiteSetup === null) {
      this.#kioskService.logTrace('Onsite setup is not available', DatadogLogLevel.Error);
      this.#showGenericErrorModal();
      return;
    }
    this.paymentMethods = this.#loadPaymentMethods(this.#onsiteSetup);
    this.cart = this.#route.snapshot.data.checkoutData.cart;
    this.customer = this.#route.snapshot.data.checkoutData.customer;
    this.plan = this.#kioskStorageService.getPlan();
    this.partner = this.#partnerService.getPartner();

    if (this.partner === null) {
      this.#kioskService.logTrace('Partner is not available', DatadogLogLevel.Error);
      this.#showGenericErrorModal();
      return;
    }

    if (this.plan === null) {
      this.#kioskService.logTrace('Plan is not available', DatadogLogLevel.Error);
      this.#showGenericErrorModal();
      return;
    }

    this.#idleService
      .get()
      .pipe(takeUntilDestroyed(this.#destroyRef))
      .subscribe(() => {
        this.#logInactivityReset();
        this.#dialog.closeAll();
        this.#discardCartAndNavigate();
      });
    if (this.cart?.total?.amount !== 0) {
      this.isLoading.set(false);
    }
  }

  onCancelButton(): void {
    if (this.paymentInProgress) {
      this.#showCancelPaymentModal();
    } else {
      this.#showDiscardCartModal();
    }
  }

  #disableCancelButtonTemporarily(): void {
    this.isSecondaryButtonDisabled.set(true);
    setTimeout(() => {
      this.isSecondaryButtonDisabled.set(false);
    }, PaymentComponent.cancelButtonDisableTimeMs);
  }

  #loadPaymentMethods(onsiteSetup: KioskOnsiteSetup): (PaymentMethodSetup & {
    label: string;
    src: string;
    alt: string;
  })[] {
    const availablePaymentMethods = [
      {
        label: this.#translate.instant('boxOffice.cart.paymentMethods.card'),
        payment_method: PaymentType.CARD,
        src: 'assets/images/payment-methods/kiosk-card.svg',
        alt: 'Card',
      },
      {
        label: this.#translate.instant('boxOffice.cart.paymentMethods.credit_card'),
        payment_method: PaymentType.CREDIT_CARD,
        src: 'assets/images/payment-methods/kiosk-card.svg',
        alt: 'Card',
      },
      {
        label: this.#translate.instant('boxOffice.cart.paymentMethods.debit_card'),
        payment_method: PaymentType.DEBIT_CARD,
        src: 'assets/images/payment-methods/kiosk-card.svg',
        alt: 'Card',
      },
      {
        label: this.#translate.instant('boxOffice.cart.paymentMethods.grabpay_sg'),
        payment_method: PaymentType.GRABPAY_SG,
        src: 'assets/images/payment-methods/grabpay.svg',
        alt: 'GrabPay',
      },
      {
        label: this.#translate.instant('boxOffice.cart.paymentMethods.alipay'),
        payment_method: PaymentType.ALIPAY,
        src: 'assets/images/payment-methods/alipay.svg',
        alt: 'Alipay',
      },
      {
        label: this.#translate.instant('boxOffice.cart.paymentMethods.wechat_pay'),
        payment_method: PaymentType.WECHAT_PAY,
        src: 'assets/images/payment-methods/wechatpay.svg',
        alt: 'WechatPay',
      },
      {
        label: this.#translate.instant('boxOffice.cart.paymentMethods.pay_now'),
        payment_method: PaymentType.PAY_NOW,
        src: 'assets/images/payment-methods/paynow.svg',
        alt: 'PayNow',
      },
      {
        label: this.#translate.instant('boxOffice.cart.paymentMethods.pix'),
        payment_method: PaymentType.PIX,
        src: 'assets/images/payment-methods/pix.svg',
        alt: 'PIX',
      },
      {
        label: this.#translate.instant('boxOffice.cart.paymentMethods.simple_payments_kr'),
        payment_method: PaymentType.SIMPLE_PAYMENTS_KR,
        src: 'assets/images/payment-methods/simple_payments.svg',
        alt: 'Simple Payments',
      },
      {
        label: this.#translate.instant('boxOffice.cart.paymentMethods.square_qr'),
        payment_method: PaymentType.SQUARE_QR,
        src: 'assets/images/payment-methods/qr.svg',
        alt: 'QR Code',
      },
      {
        label: this.#translate.instant('boxOffice.cart.paymentMethods.ic_card'),
        payment_method: PaymentType.IC_CARD,
        src: 'assets/images/payment-methods/subway.svg',
        alt: 'IC Card',
      },
      {
        label: this.#translate.instant('boxOffice.cart.paymentMethods.id_payment'),
        payment_method: PaymentType.ID_PAYMENT,
        src: 'assets/images/payment-methods/id_payment.svg',
        alt: 'iD',
      },
      {
        label: this.#translate.instant('boxOffice.cart.paymentMethods.quicpay'),
        payment_method: PaymentType.QUICPAY,
        src: 'assets/images/payment-methods/quicpay.svg',
        alt: 'QUICPay',
      },
    ] as const;
    // Map payment methods to available options
    const mappedPaymentMethods = onsiteSetup.payment_methods?.map(pm =>
      availablePaymentMethods.find(o => o.payment_method === pm.payment_method),
    );
    // Filter out undefined values (only keep valid payment methods)
    const validPaymentMethods = mappedPaymentMethods?.filter((pm): pm is (typeof availablePaymentMethods)[number] => pm !== undefined);
    if (!validPaymentMethods || validPaymentMethods.length === 0) {
      // Return the default option if none found
      return [availablePaymentMethods[0]];
    }
    // Show CARD first when available, keeping the relative order of the rest
    const cardIndex = validPaymentMethods.findIndex(pm => pm.payment_method === PaymentType.CARD);
    if (cardIndex <= 0) {
      return validPaymentMethods;
    }
    return [validPaymentMethods[cardIndex], ...validPaymentMethods.slice(0, cardIndex), ...validPaymentMethods.slice(cardIndex + 1)];
  }

  #printErrorPayment(): void {
    if (this.cart === null || !this.cart.id) {
      this.#kioskService.logTrace('Cannot print error payment: missing required data', DatadogLogLevel.Error, {
        cart: this.cart,
        cartId: this.cart?.id,
      });
      this.#showGenericErrorModal();
      return;
    }

    const errorTicket$: Observable<BaseResponse<PrinterInstruction[]>> = this.#printerService
      .generateErrorPaymentPrinterInstructions(this.partner!.id, this.plan!.id, this.plan!.place.id, this.cart.id)
      .pipe(mergeMap(response => checkResponseData(response)));

    errorTicket$.pipe(retry(3), takeUntilDestroyed(this.#destroyRef)).subscribe(errorPaymentReceipt => {
      if (errorPaymentReceipt.data !== null) {
        this.#webviewMessenger.sendWebViewMessage(new PrintErrorPaymentReceiptMessageModel({ instructions: errorPaymentReceipt.data }));
      } else {
        this.#kioskService.logTrace('Error payment receipt data is null', DatadogLogLevel.Error);
        this.#showGenericErrorModal();
      }
    });
  }

  #discardCartAndNavigate(): void {
    if (this.cart === null || !this.cart.id) {
      this.#kioskService.logTrace('Cannot discard cart: missing required data', DatadogLogLevel.Warn, {
        cart: this.cart,
        cartId: this.cart?.id,
      });
      this.#kioskNavigationService.navigateHome();
      return;
    }

    const query: DiscardCartQuery = {
      partnerId: this.partner!.id,
      cartId: this.cart.id,
    };

    this.#cartService.discardCart(query).subscribe();
    this.#kioskNavigationService.navigateHome();
  }

  /**
   * The real-time basket expired before any transaction started, so there is no payment to cancel nor error receipt
   * to print: the cart is discarded and the kiosk goes back to the timeslot's seat map, empty.
   */
  #handleExpiredRealTimeBasket(responseError: BaseErrorResponse): void {
    this.#kioskService.logTrace('Kiosk real-time basket expired before payment', DatadogLogLevel.Warn, {
      cartId: this.cart?.id,
      responseError,
    });
    this.#dialog.open(KioskErrorModalComponent, {
      data: {
        acceptButtonLabel: this.#translate.instant('common.ok'),
        messages: [this.#translate.instant(kioskRealTimeSeatingLiterals.expiredMessage)],
        title: this.#translate.instant(kioskRealTimeSeatingLiterals.expiredTitle),
      },
    });
    const { cart, partner, plan } = this;
    const timeslot: KioskRealTimeTimeslot | null = cart === null ? null : toRealTimeTimeslot(cart);
    if (cart?.id === undefined || partner === null || plan === null || timeslot === null) {
      this.#discardCartAndNavigate();
      return;
    }
    this.#cartService
      .discardCart({ cartId: cart.id, partnerId: partner.id })
      .pipe(takeUntilDestroyed(this.#destroyRef))
      .subscribe({
        complete: () => this.#kioskNavigationService.navigateRealTimeSeatMap(plan, timeslot),
        error: () => this.#kioskNavigationService.navigateRealTimeSeatMap(plan, timeslot),
      });
  }

  #isRealTimeCart(): boolean {
    const isStepperFlowEnabled: boolean = this.#optimizelyService.isFeatureEnabled(FeatureFlags.KIOSK_STEPPER_FLOW) ?? false;
    return isKioskRealTimeCart(isStepperFlowEnabled, this.#kioskStorageService.getPlan(), this.cart);
  }

  #logInactivityReset(): void {
    const context: KioskInactivityResetContext = {
      cartId: this.cart?.id,
      hasLiveRealTimeBasket: this.#isRealTimeCart(),
      planId: this.plan?.id,
      screen: 'payment',
    };
    this.#kioskService.logTrace(kioskInactivityResetMessage, DatadogLogLevel.Info, context);
  }

  #sendCreateOrderEvent(orderId: number, paymentTransactionId: string): void {
    if (this.cart === null) {
      this.#kioskService.logTrace('Cannot send create order event: missing required data', DatadogLogLevel.Warn, {
        cart: this.cart,
      });
      return;
    }

    const sessionItemsEntries = this.cart.sessionItemsByDatetime ? [...this.cart.sessionItemsByDatetime] : [];
    const eventDate = sessionItemsEntries.length > 0 ? sessionItemsEntries[0][0] : '';

    if (!this.cart.id || this.cart.userId === null || this.cart.userId === undefined || this.plan!.place.city === null) {
      this.#kioskService.logTrace('Cannot send create order event: missing required cart or plan data', DatadogLogLevel.Warn, {
        cartId: this.cart.id,
        userId: this.cart.userId,
        placeCity: this.plan!.place.city,
      });
      return;
    }

    this.#trackingService.track(
      new CreateOrderEvent({
        cart_id: this.cart.id,
        city_id: this.plan!.place.city.id,
        city_name: this.plan!.place.city.name,
        customer_id: this.cart.userId,
        currency: this.cart.total != null ? this.cart.total.currency : '',
        event_date: eventDate,
        order_id: orderId,
        payment_type: this.#paymentMethodSelected?.payment_method || '',
        payment_transaction_id: paymentTransactionId,
        plan_id: this.plan!.id,
        plan_name: this.plan!.name,
        place_id: this.plan!.place.id,
        place_name: this.plan!.place.name,
        time: new Date().toISOString(),
        total_purchased_tickets: this.cart.numberOfTickets ?? 0,
        total: this.cart.total != null ? this.cart.total.amount : 0,
        total_surcharge: this.cart.totalSurcharge != null ? this.cart.totalSurcharge.amount : 0,
        coupon_code: this.cart.appliedCoupon?.code,
        payment_provider: PaymentProvider.ADYEN,
        purchase_source: Channel.Kiosk,
        channel: this.#kioskStorageService.getChannelId(),
        using_cash_calculator: false,
        feverzone_user: this.#userService.getUserEmail(),
      }),
    );
  }

  #showCancelPaymentModal(): void {
    const dialog: DialogRef<unknown, KioskCancelPaymentModalComponent> = this.#dialog.open(KioskCancelPaymentModalComponent, {
      id: PaymentComponent.cancelPaymentModalDialogId,
    });
    dialog.closed.pipe(takeUntilDestroyed(this.#destroyRef)).subscribe((result: unknown) => {
      const confirmed = result === true;
      if (confirmed) {
        this.isLoading.set(this.paymentInProgress);
        this.isSecondaryButtonVisible.set(!this.paymentInProgress);
        this.#paymentService.discardCurrentTransaction(true).pipe(takeUntilDestroyed(this.#destroyRef)).subscribe();
      }
    });
  }

  #showDiscardCartModal(): void {
    const dialog: DialogRef<unknown, KioskDiscardCartModalComponent> = this.#dialog.open(KioskDiscardCartModalComponent, {
      id: PaymentComponent.discardCartModalDialogId,
    });
    dialog.closed.pipe(takeUntilDestroyed(this.#destroyRef)).subscribe((result: unknown) => {
      const confirmed = result === true;
      if (confirmed) {
        this.#discardCartAndNavigate();
      }
    });
  }

  #showCancelPaymentSuccessModal(): PaymentModalData {
    const title = this.#translate.instant('kiosk.payment.modal.cancelPaymentSuccess.title');
    const message = this.#translate.instant('kiosk.payment.modal.cancelPaymentSuccess.message');
    this.#dialog.open(KioskSuccessModalComponent, {
      data: {
        title: title,
        message: message,
        buttonLabel: this.#translate.instant('common.ok'),
      },
    });
    return {
      title: title,
      message: message,
    };
  }

  #showGenericErrorModal(): PaymentModalData {
    const title = this.#translate.instant('common.errorTitle');
    const message = this.#translate.instant('errors.generic');
    this.#dialog.open(KioskErrorModalComponent, {
      data: {
        title: title,
        messages: [message],
        acceptButtonLabel: this.#translate.instant('common.ok'),
      },
    });
    return {
      title: title,
      message: message,
    };
  }

  #showOrderErrorModal(error: BaseErrorResponse | null): PaymentModalData {
    const title = this.#translate.instant('common.errorTitle');
    const translationKey = formatErrorMessage(error?.message);
    const translation = translationKey ? this.#translate.instant(translationKey) : '';
    const message =
      translation && translation !== translationKey ? translation : (error?.userError ?? this.#translate.instant('errors.generic'));
    this.#dialog.open(KioskErrorModalComponent, {
      data: {
        title: title,
        messages: [message],
        acceptButtonLabel: this.#translate.instant('common.ok'),
      },
    });
    return {
      title: title,
      message: message,
    };
  }
}
