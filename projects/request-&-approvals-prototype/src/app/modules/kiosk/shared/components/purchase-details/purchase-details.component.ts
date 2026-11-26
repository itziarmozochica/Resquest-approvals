import { UpperCasePipe } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  inject,
  Input,
  OnChanges,
  OnInit,
  Output,
  PipeTransform,
  signal,
  Signal,
  SimpleChange,
  SimpleChanges,
  WritableSignal,
} from '@angular/core';
import { FormControl } from '@angular/forms';

import { BaseResponse } from '@fz-original//app/shared/models/base-response';
import { Cart, CartTaxItem } from '@fz-original//app/shared/models/cart/cart.model';
import { Coupon } from '@fz-original//app/shared/models/cart/coupon.model';
import { Partner } from '@fz-original//app/shared/models/partner/partner.model';
import { CartService } from '@fz-original//app/shared/services/cart/cart.service';
import { fixedDecimals } from '@fz-original//app/shared/utils/number.util';
import { FeatureFlags } from '@fz-original/app/shared/optimizely/feature-flags';
import { OptimizelyService } from '@fz-original/app/shared/optimizely/optimizely.service';
import { TranslateService } from '@ngx-translate/core';

import { KioskLanguageService } from '../../../services/kiosk-language.service';
import { KioskScreensaverService } from '../../../services/screensaver/kiosk-screensaver.service';
import { CartSession } from './../../../../../shared/models/cart/cart-session.model';
import { Money } from './../../../../../shared/models/money.model';
import { TicketType } from './../../../../../shared/models/ticket-type/ticket-type.model';

@Component({
  selector: 'app-kiosk-purchase-details',
  standalone: false,
  templateUrl: './purchase-details.component.html',
  styleUrls: ['./purchase-details.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PurchaseDetailsComponent implements OnInit, OnChanges {
  #cartService = inject(CartService);
  #coupon: WritableSignal<Coupon | null> = signal<Coupon | null>(null);
  readonly #kioskLanguageService = inject(KioskLanguageService);
  readonly #kioskScreensaverService = inject(KioskScreensaverService);
  #optimizelyService = inject(OptimizelyService);
  #translateService = inject(TranslateService);
  protected readonly uiRefreshEnabled: boolean = this.#kioskScreensaverService.isScreensaverEnabled() === true;
  protected readonly couponSectionExpanded: WritableSignal<boolean> = signal<boolean>(false);
  get cartSessions(): CartSession[] {
    return this.cart !== null ? Array.from(this.cart.sessionItemsByDatetime.values()).flat() : [];
  }

  protected getLastSegment(name: string): string {
    if (!this.hideExplodingPipes) {
      return name;
    }
    const parts = name.split(TicketType.EXPLODE_PIPE_SEPARATOR);
    return parts[parts.length - 1];
  }
  canShowPromotions: WritableSignal<boolean> = signal<boolean>(false);
  @Input({ required: true }) cart!: Cart | null;
  @Output() couponChange = new EventEmitter<{ coupon: Coupon | null }>();
  /**
   * Coupon code can be right or wrong. It needs to be validated.
   * This property is about keeping track of the inputted code
   * and does not have to match the `Coupon.code` value.
   *
   * @todo in the future, replace with a model signal
   * so that the information is in sync with the parent.
   */
  couponCode: WritableSignal<string> = signal<string>('');
  couponFormControl = new FormControl('');
  discount: WritableSignal<Money | null> = signal<Money | null>(null);
  @Input() eventDate!: string;
  @Input() eventLocation!: string;
  hideExplodingPipes: boolean =
    this.#optimizelyService.isFeatureEnabled({
      optimizelyFeatureKey: FeatureFlags.KIOSK_HIDE_EXPLODING_PIPES,
      team: 'parks',
    }) ?? false;
  hasValidCouponCode: WritableSignal<boolean> = signal<boolean>(false);
  @Input() isLoading = true;
  isValidatingCoupon: WritableSignal<boolean> = signal<boolean>(false);
  locale: Signal<string> = this.#kioskLanguageService.locale;
  @Input({ required: true }) partner!: Partner | null;
  totalMoneyWithoutDiscount: WritableSignal<Money | null> = signal<Money | null>(null);
  totalTaxMoney: WritableSignal<Money | null> = signal<Money | null>(null);
  uppercasePipe: PipeTransform = new UpperCasePipe();

  protected toggleCouponSection(): void {
    this.couponSectionExpanded.update((expanded: boolean) => !expanded);
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes.cart !== undefined) {
      const cartChange: SimpleChange = changes.cart;
      const cart: Cart | null = cartChange.currentValue;
      if (cart !== null && cart.total !== undefined) {
        const currentTotal: Money | null = cart.total;
        const preDiscountTotal: Money | null = this.#cartPreDiscountTotal(cart);
        if (this.cart?.taxItems !== undefined) {
          this.totalTaxMoney.set({
            amount: cart?.taxItems?.reduce((total: number, taxItem: CartTaxItem) => total + taxItem.taxAmount.amount, 0) ?? 0,
            currency: cart?.taxItems?.[0]?.taxAmount.currency ?? '',
          });
        }
        if (cartChange.firstChange) {
          this.totalMoneyWithoutDiscount.set(preDiscountTotal);
        } else if (this.totalMoneyWithoutDiscount() === null) {
          this.totalMoneyWithoutDiscount.set(preDiscountTotal);
        }
        if (this.totalMoneyWithoutDiscount() !== null && currentTotal !== null) {
          this.#setDiscount(currentTotal);
        }
      }
    }
  }

  ngOnInit(): void {
    this.canShowPromotions.set(
      !!this.partner?.id &&
        (this.#optimizelyService.isFeatureEnabled('kiosk_show_promotions_module', { partner_id: this.partner.id.toString() }) ?? false),
    );
  }

  onCouponInputFieldChange(inputEvent: Event): void {
    const inputElement = inputEvent.target as HTMLInputElement;
    /**
     * `inputElement.value` will come as string because
     * <ignt-input-field> has 'text' as default for `type`.
     */
    this.couponCode.set(inputElement.value);
  }

  onPromotionApplied(coupon: string): void {
    this.couponCode.set(coupon);
    this.validateCoupon();
  }

  removeCoupon(): void {
    this.hasValidCouponCode.set(false);
    this.#coupon.set(null);
    this.couponCode.set('');
    this.couponFormControl.reset();
    this.discount.set(null);
    this.couponChange.emit({ coupon: null });
  }

  validateCoupon(): void {
    if (this.isValidatingCoupon()) {
      return;
    }
    if (!this.hasValidCouponCode() && ![this.cart, this.partner].includes(null) && this.cart?.id !== undefined) {
      this.isValidatingCoupon.set(true);
      this.#cartService
        .getCouponForCart(
          { cartId: this.cart?.id ?? '', couponCode: this.couponCode(), lazyCouponType: null, partnerId: this.partner?.id ?? 0 },
          false,
        )
        .subscribe({
          next: (couponBaseResponse: BaseResponse<Coupon | null>) => {
            this.isValidatingCoupon.set(false);
            this.#onValidateCouponSuccess(couponBaseResponse.data as Coupon);
          },
          error: () => {
            this.isValidatingCoupon.set(false);
            this.#onValidateCouponFailure();
          },
        });
    } else if (this.hasValidCouponCode()) {
      this.removeCoupon();
    }
  }

  #onValidateCouponFailure(): void {
    const message = `${this.#translateService.instant('boxOffice.coupon.errors.couponNotApplicable')}.`;
    this.couponFormControl.setErrors({
      ['http']: {
        message,
      },
    });
  }

  #onValidateCouponSuccess(coupon: Coupon): void {
    this.#coupon.set(coupon);
    this.hasValidCouponCode.set(true);
    this.#ensurePreCouponTotalSnapshotFromCart();
    this.couponChange.emit({ coupon });
  }

  #ensurePreCouponTotalSnapshotFromCart(): void {
    if (this.totalMoneyWithoutDiscount() !== null) {
      return;
    }
    if (this.cart !== null && this.cart.total !== undefined) {
      this.totalMoneyWithoutDiscount.set(this.#cartPreDiscountTotal(this.cart));
    }
  }

  #cartPreDiscountTotal(cart: Cart): Money | null {
    if (cart.total === undefined || cart.total === null) {
      return null;
    }
    return cart.totalWithoutDiscount ?? cart.total;
  }

  #setDiscount(total: Money): void {
    const originalTotalAmount: number = this.totalMoneyWithoutDiscount()?.amount ?? 0;
    const currentTotalAmount: number = total.amount;
    if (currentTotalAmount < originalTotalAmount) {
      const discountAmount: number = originalTotalAmount - currentTotalAmount;
      this.discount.set(new Money(fixedDecimals(discountAmount, 3), this.totalMoneyWithoutDiscount()?.currency ?? ''));
    }
  }
}
