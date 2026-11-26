import {
  ChangeDetectorRef,
  Component,
  DestroyRef,
  EventEmitter,
  inject,
  Input,
  OnInit,
  Output,
  signal,
  WritableSignal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { AbstractControl, UntypedFormBuilder, UntypedFormGroup } from '@angular/forms';

import { CouponApplyErrorCodes } from '@fz-original/app/shared/models/apply-coupon-errors-enum.model';
import { CouponApplyHttpError } from '@fz-original/app/shared/models/coupon-apply-http-error.model';
import { normalizeCouponCode } from '@fz-original/app/shared/utils/normalize-coupon-code.util';
import { IgntDialogService } from '@ignite/common';
import { BehaviorSubject } from 'rxjs';
import { skip, take } from 'rxjs/operators';

const errorPrefix = 'boxOffice.coupon.errors';
@Component({
  selector: 'app-coupon-code',
  standalone: false,
  styleUrls: ['./coupon-code.component.scss'],
  templateUrl: './coupon-code.component.html',
})
export class CouponCodeComponent implements OnInit {
  readonly #changeDetectorRef = inject<ChangeDetectorRef>(ChangeDetectorRef);
  readonly #destroyRef = inject<DestroyRef>(DestroyRef);
  readonly #dialogService = inject<IgntDialogService>(IgntDialogService);
  readonly #formBuilder = inject(UntypedFormBuilder);
  readonly #isOpeningScanner: WritableSignal<boolean> = signal<boolean>(false);

  @Output() couponCode = new EventEmitter<string>();
  couponForm: UntypedFormGroup = this.#formBuilder.group({ couponInput: [''] });
  @Input() delegateScannerOpen = false;
  @Input() error: BehaviorSubject<Error | null> = new BehaviorSubject<Error | null>(null);
  errorMessage$: WritableSignal<string | null> = signal<string | null>(null);
  errorMessageLazyCouponType: string | null = null;
  @Input() inputCode?: string;
  isLoading = false;
  @Input() prefilledCode: BehaviorSubject<string | null> = new BehaviorSubject<string | null>(null);
  @Output() scannerOpen = new EventEmitter<void>();
  @Input() wrapButton = false;

  applyCoupon(): void {
    this.error.next(null);
    this.isLoading = true;
    this.couponCode.emit(normalizeCouponCode(this.getCouponInput().value));
  }

  getControlError(control: AbstractControl | null): string {
    if (!control) {
      return '';
    }
    const errors = Object.getOwnPropertyNames(control.errors || {});
    return errors.length > 0 ? (errors.shift() ?? '') : '';
  }

  getCouponInput(): AbstractControl {
    const control: AbstractControl | null = this.couponForm.get('couponInput');
    if (control === null) {
      throw new Error('Coupon input control not found');
    }
    return control;
  }

  ngOnInit() {
    if (this.inputCode) {
      this.getCouponInput().setValue(this.inputCode);
    }

    this.error.pipe(takeUntilDestroyed(this.#destroyRef)).subscribe((error: Error | null) => {
      if (error != null) {
        this.isLoading = false;
        const couponInput: AbstractControl | null = this.couponForm.get('couponInput');
        if (couponInput !== null) {
          couponInput.setErrors({ error: true }, { emitEvent: false });
        }
        const responseError = (error as CouponApplyHttpError).error;
        const code = responseError?.error?.error?.code;
        this.errorMessage$.set(
          code != null
            ? this.mapErrorMessage(code, responseError?.error?.error?.lazy_coupon_type ?? null)
            : (error.message ?? `${errorPrefix}.errorAplyingCoupon`),
        );
        this.#changeDetectorRef.markForCheck();
      }
    });

    const prefilledCode$ = this.inputCode ? this.prefilledCode.pipe(skip(1)) : this.prefilledCode;

    prefilledCode$.pipe(takeUntilDestroyed(this.#destroyRef)).subscribe((code: string | null) => {
      if (code) {
        const couponInput: AbstractControl | null = this.couponForm.get('couponInput');
        if (couponInput) {
          couponInput.setValue(code);
          this.#changeDetectorRef.markForCheck();

          const applyPrefilledCodeTimeout = 50;
          setTimeout(() => {
            this.applyCoupon();
            this.prefilledCode.next(null);
          }, applyPrefilledCodeTimeout);
        }
      }
    });
  }

  async openScanner(): Promise<void> {
    if (this.delegateScannerOpen) {
      this.scannerOpen.emit();
      return;
    }
    if (this.#isOpeningScanner()) {
      return;
    }

    this.#isOpeningScanner.set(true);
    try {
      // Lazy so @zxing/library stays out of the startup bundle.
      const { ScannerComponent } = await import('@fz-original/app/modules/validation/components/scanner/scanner.component');
      if (this.#destroyRef.destroyed) {
        return;
      }

      const dialogRef = this.#dialogService.openModal<string>(ScannerComponent, { size: 'sm' });
      dialogRef.closed$.pipe(take(1), takeUntilDestroyed(this.#destroyRef)).subscribe((value: string | undefined) => {
        if (value) {
          this.couponForm.get('couponInput')!.setValue(value);
          this.#changeDetectorRef.markForCheck();
        }
      });
    } finally {
      this.#isOpeningScanner.set(false);
    }
  }

  protected mapErrorMessage(code: number, lazyCouponType: string | null): string {
    switch (code) {
      case CouponApplyErrorCodes.COUPON_ALREADY_USED:
        this.errorMessageLazyCouponType = this.formatLazyCouponType(lazyCouponType ?? '');
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

  private formatLazyCouponType(lazyCouponType: string): string {
    return lazyCouponType
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');
  }
}
