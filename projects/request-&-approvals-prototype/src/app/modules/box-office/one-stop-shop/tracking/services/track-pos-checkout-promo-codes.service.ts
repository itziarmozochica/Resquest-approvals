import { inject, Injectable } from '@angular/core';

import { BaseErrorResponse } from '@fz-original/app/shared/models/base-response';
import { FzTrackingService } from '@fz/fz-tracking/src/public-api';

import {
  posCheckoutPromoCodesCloseModal,
  type PosCheckoutPromoCodesCloseModalInteractionType,
} from '../events/pos-checkout-promo-codes-close-modal.event';
import { posCheckoutPromoCodesFailure } from '../events/pos-checkout-promo-codes-failure.event';
import {
  posCheckoutPromoCodesOpenManualScanner,
  type PosCheckoutPromoCodesOpenManualScannerSource,
} from '../events/pos-checkout-promo-codes-open-manual-scanner.event';
import { posCheckoutPromoCodesSuccess, type PosCheckoutPromoCodesType } from '../events/pos-checkout-promo-codes-success.event';

@Injectable()
export class TrackPosCheckoutPromoCodesService {
  readonly #fzTracking = inject(FzTrackingService);

  trackApplyResult(
    promoCode: string,
    lazyCouponType: string | null,
    success: boolean,
    error: BaseErrorResponse | Error | null | undefined = null,
  ): void {
    const type = this.#resolvePromoCodeType(lazyCouponType);

    if (success) {
      this.#fzTracking.track(posCheckoutPromoCodesSuccess({ promoCode, type }));
      return;
    }

    const { error: technicalError, userError } = this.#resolvePromoCodeApplyError(error);
    this.#fzTracking.track(posCheckoutPromoCodesFailure({ error: technicalError, promoCode, type, userError }));
  }

  trackCloseModal(selectedPromoCode: string, interactionType: PosCheckoutPromoCodesCloseModalInteractionType): void {
    this.#fzTracking.track(posCheckoutPromoCodesCloseModal({ interactionType, selectedPromoCode }));
  }

  trackOpenManualScanner(source: PosCheckoutPromoCodesOpenManualScannerSource): void {
    this.#fzTracking.track(posCheckoutPromoCodesOpenManualScanner({ source }));
  }

  #resolvePromoCodeApplyError(error: BaseErrorResponse | Error | null | undefined): { error: string; userError: string } {
    if (error == null) {
      return { error: 'unknown', userError: 'unknown' };
    }

    if ('code' in error && 'message' in error) {
      return {
        error: String(error.code),
        userError: error.userError ?? error.message,
      };
    }

    return {
      error: error.message,
      userError: error.message,
    };
  }

  #resolvePromoCodeType(lazyCouponType: string | null): PosCheckoutPromoCodesType {
    return lazyCouponType != null ? 'lazy_coupon' : 'fever_coupon';
  }
}
