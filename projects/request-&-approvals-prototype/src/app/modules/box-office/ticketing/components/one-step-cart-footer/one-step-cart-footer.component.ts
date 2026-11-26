import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, EventEmitter, inject, input, Input, Output, output } from '@angular/core';

import { PaymentService } from '@fz-original/app/app/services/payment/payment.service';
import { CouponCodeSelectorComponent } from '@fz-original/app/shared/components/coupon-code-selector/coupon-code-selector.component';
import { CouponCodeEvent } from '@fz-original/app/shared/components/coupon-code/coupon-code-event';
// eslint-disable-next-line fz/no-fz-original-icons-module -- Pre-existing legacy import; full migration to <ignt-icon> is out of scope for this ticket and will be handled separately.
import { IconsModule } from '@fz-original/app/shared/icons/icons.module';
import { Cart } from '@fz-original/app/shared/models/cart/cart.model';
import { Money } from '@fz-original/app/shared/models/money.model';
import {
  PaymentMethodDisplay,
  resolvePaymentMethodLabel,
} from '@fz-original/app/shared/utils/payment-method-display/payment-method-display.util';
import { IgntButtonComponent } from '@ignite/legacy/components/ignt-button/ignt-button.component';
import { TranslateModule } from '@ngx-translate/core';
import { BehaviorSubject, Observable } from 'rxjs';

import { PaymentType } from '../../../checkout/models/payment-type.enum';
import { OnsiteSetup } from '../../../shared/models/onsite-setup';
import { PaymentConfiguration } from '../../../shared/services/payment-configuration.model';
import { BoxOfficePaymentMethodsService } from '../../../shared/services/payment-methods/box-office-payment-methods.service';
import { PaymentConfigStorageService } from '../../../shared/services/payment/payment-config-storage.service';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, CouponCodeSelectorComponent, IconsModule, IgntButtonComponent, TranslateModule],
  selector: 'app-one-step-cart-footer',
  standalone: true,
  styleUrls: ['./one-step-cart-footer.component.scss'],
  templateUrl: './one-step-cart-footer.component.html',
})
export class OneStepCartFooterComponent {
  readonly PaymentTypeEnum = PaymentType;

  #boxOfficePaymentMethodsService = inject(BoxOfficePaymentMethodsService);
  #paymentConfigStorageService = inject(PaymentConfigStorageService);
  #paymentService = inject(PaymentService);

  @Input() currentCart!: Cart | null;
  @Input() cartTotalMoney!: Money;
  @Input() showCoupon!: boolean;
  @Input() couponError!: BehaviorSubject<Error | null>;
  @Input() showCommonPaymentButton!: boolean;
  @Input() addSessionsToCartIsDisabled!: boolean;
  @Input() paymentTypes!: PaymentType[];
  @Input() paymentConfiguration: PaymentConfiguration | null = null;
  @Input() couponCodeApplied$!: Observable<boolean>;
  @Input() hasThreePaymentMethods!: boolean;
  @Input() locale!: string;
  onsiteSetupSelected = input.required<OnsiteSetup>();
  isSplitPaymentEnabled = input(false);
  fullPaymentCashAvailable = input(false);
  fullPaymentIntegratedAvailable = input(false);

  @Output() couponCode = new EventEmitter<CouponCodeEvent>();
  @Output() simplePayClicked = new EventEmitter();
  @Output() payClicked = new EventEmitter<PaymentType>();
  paymentOptionsRequested = output<void>();
  fullPaymentCashRequested = output<void>();
  fullPaymentIntegratedRequested = output<void>();

  readonly paymentMethodDisplay = computed<ReadonlyMap<PaymentType, PaymentMethodDisplay>>(
    () => this.#boxOfficePaymentMethodsService.getAvailableMethods(this.onsiteSetupSelected()).display,
  );

  clickOnPay(paymentMethod: PaymentType) {
    this.payClicked.emit(paymentMethod);
  }

  openPaymentOptionsModal(): void {
    this.paymentOptionsRequested.emit();
  }

  requestFullPaymentCash(): void {
    this.fullPaymentCashRequested.emit();
  }

  requestFullPaymentIntegrated(): void {
    this.fullPaymentIntegratedRequested.emit();
  }

  applyCouponDiscount(code: string, lazyCouponType: string | null = null) {
    this.couponCode.emit({ code, lazyCouponType });
  }

  getCardDisabledTooltip(paymentType: PaymentType): string | null {
    if (!this.payWithCardIsDisabled(paymentType)) {
      return null;
    }
    const storedConfig = this.#paymentConfigStorageService.getConfiguration();
    const gatewayProvider = this.#boxOfficePaymentMethodsService.getGatewayProvider(this.onsiteSetupSelected());
    const allowsDelegatedPayment = this.#boxOfficePaymentMethodsService.allowsDelegatedCardPayment(this.onsiteSetupSelected());
    if (this.#paymentService.isCardDisabledDueToMissingTerminal(storedConfig, gatewayProvider, allowsDelegatedPayment)) {
      return null;
    }
    return this.#paymentService.getCardDisabledTooltip(storedConfig, gatewayProvider, allowsDelegatedPayment);
  }

  simplePayClick() {
    this.simplePayClicked.emit();
  }

  payWithCardIsDisabled(paymentType: PaymentType): boolean {
    const cardPayments = [
      PaymentType.CARD,
      PaymentType.CARD_SPLIT,
      PaymentType.DEBIT_CARD,
      PaymentType.CREDIT_CARD,
      PaymentType.PIX,
      PaymentType.PAY_NOW,
      PaymentType.ALIPAY,
      PaymentType.GRABPAY_SG,
      PaymentType.WECHAT_PAY,
      PaymentType.SIMPLE_PAYMENTS_KR,
      PaymentType.SQUARE_QR,
      PaymentType.IC_CARD,
    ];

    if (!cardPayments.includes(paymentType)) {
      return false;
    }

    if (!this.currentCart || !this.currentCart?.total) {
      return true;
    }

    const paymentConfigurationStorage: PaymentConfiguration | undefined = this.#paymentConfigStorageService.getConfiguration();
    const cartAmountIsZero: boolean = this.currentCart?.total?.amount === 0;

    const gatewayProvider = this.#boxOfficePaymentMethodsService.getGatewayProvider(this.onsiteSetupSelected());
    const allowsDelegatedPayment = this.#boxOfficePaymentMethodsService.allowsDelegatedCardPayment(this.onsiteSetupSelected());
    const isDisallowed = this.#paymentService.isCardPaymentDisallowed(
      this.paymentConfiguration,
      paymentConfigurationStorage,
      cartAmountIsZero,
      gatewayProvider,
      allowsDelegatedPayment,
    );

    if (
      isDisallowed &&
      this.#paymentService.isCardDisabledDueToMissingTerminal(paymentConfigurationStorage, gatewayProvider, allowsDelegatedPayment)
    ) {
      return false;
    }

    return isDisallowed;
  }

  getButtonImageUrl(paymentType: PaymentType): string | null {
    return this.paymentMethodDisplay().get(paymentType)?.imageUrl ?? null;
  }

  getButtonLabel(paymentType: PaymentType): string {
    return this.paymentMethodDisplay().get(paymentType)?.label ?? resolvePaymentMethodLabel(null, paymentType);
  }

  isButtonImageTintable(paymentType: PaymentType): boolean {
    return this.paymentMethodDisplay().get(paymentType)?.isImageTintable === true;
  }
}
