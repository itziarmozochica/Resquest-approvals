import { Component, EventEmitter, inject, Input, OnChanges, OnDestroy, Output, SimpleChanges } from '@angular/core';
import { AbstractControl, UntypedFormBuilder, UntypedFormGroup } from '@angular/forms';

import { ScannerComponent } from '@fz-original/app/modules/validation/components/scanner/scanner.component';
import { IgntDialogService } from '@ignite/common';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { TranslateService } from '@ngx-translate/core';
import { EMPTY, Observable, Subject, throwError } from 'rxjs';
import { catchError, finalize, map, take, takeUntil } from 'rxjs/operators';

import { ClickApplyCouponEvent } from '../../../core/tracking/core/events/click-apply-coupon';
import { TrackingService } from '../../../core/tracking/tracking.service';
import { CouponApplyErrorCodes } from '../../models/apply-coupon-errors-enum.model';
import { BaseResponse } from '../../models/base-response';
import { Cart } from '../../models/cart/cart.model';
import { Coupon } from '../../models/cart/coupon.model';
import { ApplyCouponToCartBodyParam } from '../../services/cart/apply-coupon-to-cart-query';
import { CartService } from '../../services/cart/cart.service';
import { PartnerService } from '../../services/partner/partner.service';
import { normalizeCouponCode } from '../../utils/normalize-coupon-code.util';
import { MessageModalComponent } from '../message-modal/message-modal.component';

const errorPrefix = 'boxOffice.coupon.errors';

@Component({
  selector: 'app-coupon',
  standalone: false,
  templateUrl: './coupon.component.html',
  styleUrls: ['./coupon.component.scss'],
})
export class CouponComponent implements OnDestroy, OnChanges {
  #cartService = inject(CartService);
  #dialogService = inject(IgntDialogService);
  #formBuilder = inject(UntypedFormBuilder);
  #modalService = inject(NgbModal);
  #partnerService = inject(PartnerService);
  #trackingService = inject(TrackingService);
  #translate = inject(TranslateService);

  @Input() appliedCoupon: Coupon | null = null;
  @Input() cartId: string | null = null;
  @Input() userId: number | null = null;
  @Output() updatedCart = new EventEmitter<Cart>();
  @Output() isApplyingCoupon = new EventEmitter<boolean>();

  couponForm: UntypedFormGroup = this.#formBuilder.group({ couponInput: [''] });
  errorMessage: string | null = null;
  errorMessageLazyCouponType: string | null = null;
  isApplyingCouponInProgress = false;
  locale: string;
  spinnerIcon = ['fad', 'spinner-third'];

  private destroy$ = new Subject<void>();

  constructor() {
    this.locale = this.#translate.currentLang;
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes.appliedCoupon) {
      this.updateCouponInput();
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
  }

  getCouponInput(): AbstractControl {
    return this.couponForm.get('couponInput')!;
  }

  applyCoupon(): void {
    const couponInput = this.getCouponInput();
    // A reset input holds null, which removes the applied coupon: only a typed code is normalized.
    const couponCode = couponInput.value ? normalizeCouponCode(couponInput.value) : couponInput.value;

    if (couponCode === this.appliedCoupon?.code) {
      return;
    }
    this.errorMessage = null;
    this.setIsApplyingCouponInProgress(true);
    couponInput.disable();

    this.applyCouponRequest(couponCode)
      .pipe(
        finalize(() => {
          this.setIsApplyingCouponInProgress(false);
          this.updateCouponInput();
        }),
        takeUntil(this.destroy$),
      )
      .subscribe(
        response => {
          this.appliedCoupon = response.appliedCoupon ?? null;
          this.updatedCart.emit(response);
          if (couponCode) {
            this.setCouponApplyMixpanelEvent(couponCode, true);
          }
        },
        errorResponse => {
          if (errorResponse?.code === CouponApplyErrorCodes.CANNOT_REMOVE_COUPON) {
            this.showCouponRemoveErrorModal();
          } else {
            this.errorMessage = this.mapErrorMessage(errorResponse?.code, errorResponse?.error?.error?.error?.lazy_coupon_type);
          }
          if (couponCode) {
            this.setCouponApplyMixpanelEvent(couponCode, false);
          }
        },
      );
  }

  clearCoupon(): void {
    if (this.isApplyingCouponInProgress) {
      return;
    }
    this.getCouponInput().reset();
    this.applyCoupon();
  }

  isCurrentlyApplyingCoupon(): boolean {
    return this.isApplyingCouponInProgress && !this.appliedCoupon;
  }

  openScanner(): void {
    const dialogRef = this.#dialogService.openModal<string>(ScannerComponent, { size: 'sm' });
    dialogRef.closed$.pipe(take(1), takeUntil(this.destroy$)).subscribe((value: string | undefined) => {
      if (value) {
        this.couponForm.get('couponInput')?.setValue(value);
      }
    });
  }

  private setIsApplyingCouponInProgress(value: boolean) {
    this.isApplyingCouponInProgress = value;
    this.isApplyingCoupon.emit(this.isApplyingCouponInProgress);
  }

  private applyCouponRequest(couponCode: string): Observable<Cart> {
    if (!this.cartId || !this.userId) {
      return EMPTY;
    }

    const partner = this.#partnerService.getPartner();
    if (!partner) {
      return EMPTY;
    }

    const query: ApplyCouponToCartBodyParam = {
      partnerId: partner.id,
      cartId: this.cartId,
      userId: this.userId,
      couponCode,
    };
    const isRemovingCoupon = !couponCode && this.appliedCoupon;
    return this.#cartService.applyCouponToCart(query).pipe(
      map(response => this.checkApplyCouponResponseError(response)),
      catchError(error => throwError(isRemovingCoupon ? { code: CouponApplyErrorCodes.CANNOT_REMOVE_COUPON } : error)),
    );
  }

  private checkApplyCouponResponseError(response: BaseResponse<Cart | null>): Cart {
    if (!response.data) {
      throw response.error;
    }
    return response.data;
  }

  private updateCouponInput(): void {
    const couponInput = this.getCouponInput();
    if (this.appliedCoupon?.code) {
      couponInput.reset();
    }

    if (this.appliedCoupon) {
      couponInput.disable();
    } else {
      couponInput.enable();
    }
  }

  private showCouponRemoveErrorModal() {
    const modal = this.#modalService.open(MessageModalComponent);
    modal.componentInstance.title = this.#translate.instant('common.errorTitle');
    modal.componentInstance.messages = [this.#translate.instant(`${errorPrefix}.errorRemovingCoupon`)];
  }

  private setCouponApplyMixpanelEvent(code: string, success: boolean) {
    this.#trackingService.track(
      new ClickApplyCouponEvent({
        coupon_code: code,
        success,
      }),
    );
  }

  private mapErrorMessage(code: number, lazyCouponType: string | null): string {
    switch (code) {
      case CouponApplyErrorCodes.COUPON_ALREADY_USED:
        this.errorMessageLazyCouponType = this.formatLazyCouponType(lazyCouponType);
        return `${errorPrefix}.lazyCouponAlreadyUsed`;
      case CouponApplyErrorCodes.CODE_IS_NOT_AVAILABLE:
      case CouponApplyErrorCodes.COUPON_NOT_FOUND:
      case CouponApplyErrorCodes.COUPON_CAN_NOT_BE_REDEEMED:
      case CouponApplyErrorCodes.COUPON_CAN_NOT_BE_APPLIED:
        return `${errorPrefix}.couponNotValid`;
      case CouponApplyErrorCodes.COUPON_NOT_APPLICABLE_GENERIC_ERROR:
        return `${errorPrefix}.couponNotApplicableGenericError`;
      case CouponApplyErrorCodes.COUPON_NO_AVAILABLE_USES_FOR_USER:
        return `${errorPrefix}.couponNoAvailableUsesForUser`;
      case CouponApplyErrorCodes.COUPON_NO_AVAILABLE_TICKETS:
        return `${errorPrefix}.couponNoAvailableTickets`;
      case CouponApplyErrorCodes.COUPON_PREFIX_REQUIRED:
        return `${errorPrefix}.couponPrefixRequired`;
      case CouponApplyErrorCodes.COUPON_CURRENCY_DOES_NOT_MATCH_CART_CURRENCY:
        return `${errorPrefix}.couponCurrencyDoesNotMatchCartCurrency`;
      case CouponApplyErrorCodes.COUPON_MAXIMUM_NUMBER_OF_TICKETS_PURCHASABLE_REACHED:
        return `${errorPrefix}.couponMaximumNumberOfTicketsPurchasableReached`;
      case CouponApplyErrorCodes.COUPON_NOT_APPLICABLE_ON_PRICING_PROMOTION:
        return `${errorPrefix}.couponNotApplicableOnPricingPromotion`;
      case CouponApplyErrorCodes.CART_NOT_FOUND:
      case CouponApplyErrorCodes.INVALID_CART_REQUEST:
      case CouponApplyErrorCodes.EMPTY_CART:
      case CouponApplyErrorCodes.INVALID_CART_NO_MULTI_SESSION_ALLOWED:
      case CouponApplyErrorCodes.CART_DOES_NOT_BELONG_TO_USER:
      case CouponApplyErrorCodes.FEATURE_NOT_ALLOWED_FOR_MULTI_SESSION:
      default:
        return `${errorPrefix}.errorAplyingCoupon`;
    }
  }

  private formatLazyCouponType(lazyCouponType: string | null): string {
    if (!lazyCouponType) {
      return '';
    }
    return lazyCouponType
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');
  }
}
