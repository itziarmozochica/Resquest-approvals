import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, EventEmitter, input, Input, output, Output } from '@angular/core';

import { CouponCartCardComponent } from '@fz-original/app/shared/components/coupon-cart-card/coupon-cart-card.component';
import { CouponCodeEvent } from '@fz-original/app/shared/components/coupon-code/coupon-code-event';
import { CartSession } from '@fz-original/app/shared/models/cart/cart-session.model';
import { Cart } from '@fz-original/app/shared/models/cart/cart.model';
import { Coupon } from '@fz-original/app/shared/models/cart/coupon.model';
import { Money } from '@fz-original/app/shared/models/money.model';
import { IgntIconComponent } from '@ignite/icon';
import { IgntLinkComponent } from '@ignite/legacy/components/ignt-link/ignt-link.component';
import { TranslateModule } from '@ngx-translate/core';
import { BehaviorSubject, Observable } from 'rxjs';

import { PaymentType } from '../../../checkout/models/payment-type.enum';
import { OnsiteSetup } from '../../../shared/models/onsite-setup';
import { PaymentConfiguration } from '../../../shared/services/payment-configuration.model';
import { OneStepCartFooterComponent } from '../one-step-cart-footer/one-step-cart-footer.component';
import { OneStepMultiCartDetailComponent } from '../one-step-multi-cart-detail/one-step-multi-cart-detail.component';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    IgntIconComponent,
    IgntLinkComponent,
    TranslateModule,
    OneStepMultiCartDetailComponent,
    OneStepCartFooterComponent,
    CouponCartCardComponent,
  ],
  selector: 'app-one-step-multi-cart',
  standalone: true,
  styleUrls: ['./one-step-multi-cart.component.scss'],
  templateUrl: './one-step-multi-cart.component.html',
})
export class OneStepMultiCartComponent {
  @Input() addSessionsToCartIsDisabled!: boolean;
  @Input() canClear = false;
  @Input() cartTotalMoney!: Money;
  @Output() clearAllClicked = new EventEmitter();
  @Output() couponCode = new EventEmitter<CouponCodeEvent>();
  @Input() couponCodeApplied$!: Observable<boolean>;
  @Input() couponDiscount: Coupon | null = null;
  @Input() couponError!: BehaviorSubject<Error | null>;
  @Output() couponRemoved = new EventEmitter<void>();
  @Input() currentCart!: Cart | null;
  @Input() currentPlanId: number | null = null;
  @Output() goToMainPlanClicked = new EventEmitter<number>();
  @Input() isLoadingCart!: boolean;
  isSplitPaymentEnabled = input(false);
  @Input() onsiteSetupSelected!: OnsiteSetup;
  @Output() payClicked = new EventEmitter<PaymentType>();
  paymentOptionsRequested = output<void>();
  fullPaymentCashAvailable = input(false);
  fullPaymentCashRequested = output<void>();
  fullPaymentIntegratedAvailable = input(false);
  fullPaymentIntegratedRequested = output<void>();
  @Input() paymentConfiguration: PaymentConfiguration | null = null;
  @Input() paymentTypes!: PaymentType[];
  @Input() showCommonPaymentButton!: boolean;
  @Input() showCoupon!: boolean;
  @Input() showPrice = true;
  @Output() simplePayClicked = new EventEmitter();

  applyCouponDiscount(code: string, lazyCouponType: string | null = null) {
    this.couponCode.emit({ code, lazyCouponType });
  }

  clearAll() {
    this.clearAllClicked.emit();
  }

  clickOnPay(paymentMethod: PaymentType) {
    this.payClicked.emit(paymentMethod);
  }

  isEmptyCart(): boolean {
    return (this.currentCart?.getNumberOfTicketCounts() ?? 0) === 0;
  }

  getCartSessionsByMainPlanAndDatetime(): Map<number, Map<string, CartSession[]>> | null {
    if (this.currentCart === null) {
      return null;
    }
    return this.currentCart.getSessionItemsByMainPlanAndDatetime();
  }

  goToMainPlan(mainPlanId: number): void {
    this.goToMainPlanClicked.emit(mainPlanId);
  }

  onPaymentOptionsRequested(): void {
    this.paymentOptionsRequested.emit();
  }

  onFullPaymentCashRequested(): void {
    this.fullPaymentCashRequested.emit();
  }

  onFullPaymentIntegratedRequested(): void {
    this.fullPaymentIntegratedRequested.emit();
  }

  removeCoupon(): void {
    this.couponDiscount = null;
    this.couponRemoved.emit();
  }

  simplePayClick() {
    this.simplePayClicked.emit();
  }
}
