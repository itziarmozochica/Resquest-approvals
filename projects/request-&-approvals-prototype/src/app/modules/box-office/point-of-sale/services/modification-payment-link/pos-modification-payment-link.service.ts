import { computed, DestroyRef, inject, Injectable, type Signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Router } from '@angular/router';

import { TicketingUnsavedChangesBypassService } from '@fz-original/app/modules/box-office/ticketing/services/ticketing-unsaved-changes-bypass.service';
import { CHECKOUT_PAYMENT_DRIVER } from '@fz-original/app/modules/checkout/checkout-modal/models/checkout-payment-driver.model';
import {
  type CheckoutPaymentLinkOption,
  type CheckoutPaymentLinkRequest,
} from '@fz-original/app/modules/checkout/checkout-modal/models/checkout-payment-link.model';
import { type ReservationDetail } from '@fz-original/app/modules/reservation/models/reservation-detail.model';
import { ReservationNavigateService } from '@fz-original/app/modules/reservation/services/reservation-navigate.service';
import { ReservationsService } from '@fz-original/app/modules/reservation/services/reservations.service';
import { type BaseErrorResponse, type BaseResponse } from '@fz-original/app/shared/models/base-response';
import { FeatureFlags } from '@fz-original/app/shared/optimizely/feature-flags';
import { OptimizelyService } from '@fz-original/app/shared/optimizely/optimizely.service';
import { TranslateService } from '@ngx-translate/core';
import moment from 'moment-timezone';
import { Observable, of, Subject, throwError } from 'rxjs';
import { catchError, defaultIfEmpty, finalize, map, switchMap, tap } from 'rxjs/operators';

import {
  ModificationPaymentLinkExpiryValidationError,
  type ModificationReservation,
  type ModificationReservationErrorOutcome,
  type PosModificationPaymentLink,
} from '../../models/modification-payment-link.model';
import { PosTicketingState } from '../../state/pos-ticketing.state';
import { resolveSessionDayEnd, validateExpiresAt } from '../../utils/modification-payment-link-expiry.util';
import { resolveExpiryErrorMessageKey, resolveModificationReservationErrorOutcome } from '../../utils/modification-reservation-error.util';
import { PosViewUpdateService } from '../pos-view-update/pos-view-update.service';
import { PosPurchaseService } from '../purchase/pos-purchase.service';
import { FzModificationReservationService } from './fz-modification-reservation.service';

/**
 * Lego domain service: turns the prepared modification cart into an unpaid reservation the customer
 * pays through a link. Offered as an option of the checkout modal's pay-in-full step on the
 * modify-order payment, never as one of the onsite setup's payment methods, which the POS books as
 * paid at the desk.
 */
@Injectable()
export class PosModificationPaymentLinkService {
  static readonly defaultDurationMinutes = 30;

  readonly #checkoutPaymentDriver = inject(CHECKOUT_PAYMENT_DRIVER);
  readonly #destroyRef = inject(DestroyRef);
  readonly #modificationReservation = inject(FzModificationReservationService);
  readonly #optimizely = inject(OptimizelyService);
  readonly #purchase = inject(PosPurchaseService);
  readonly #reservationNavigate = inject(ReservationNavigateService);
  readonly #reservations = inject(ReservationsService);
  readonly #router = inject(Router);
  readonly #state = inject(PosTicketingState);
  readonly #translate = inject(TranslateService);
  readonly #unsavedChangesBypass = inject(TicketingUnsavedChangesBypassService, { optional: true });
  readonly #viewUpdate = inject(PosViewUpdateService);

  /** Fire-and-forget: the page shows the effective expiry and opens the payment-link modal. */
  readonly paymentLinkCreated$ = new Subject<PosModificationPaymentLink>();

  /** Fire-and-forget: the checkout can no longer go on (the modal closed); the page shows the message. */
  readonly checkoutEnded$ = new Subject<string>();

  readonly timezone: Signal<string> = computed(() => {
    this.#viewUpdate.viewVersion();
    return this.#state.timezone;
  });

  constructor() {
    this.#checkoutPaymentDriver.paymentLinkRequested$
      .pipe(takeUntilDestroyed(this.#destroyRef))
      .subscribe((request: CheckoutPaymentLinkRequest) => this.#answerCheckoutRequest(request));
  }

  /** What the checkout modal offers; `null` hides the option (not a modification, flag off, session day over). */
  checkoutOption(): CheckoutPaymentLinkOption | null {
    const paymentCart = this.#state.modifyOrderPaymentCart();
    if (paymentCart === null || !this.#isFlagEnabled()) {
      return null;
    }
    const sessionDayEnd = resolveSessionDayEnd(paymentCart, this.#state.timezone);
    if (sessionDayEnd === null || !sessionDayEnd.isAfter(moment())) {
      return null;
    }
    return {
      defaultDurationMinutes: PosModificationPaymentLinkService.defaultDurationMinutes,
      latestExpiresAt: sessionDayEnd.format(),
      timezone: this.#state.timezone,
    };
  }

  createPaymentLink(expiresAt: string): Observable<PosModificationPaymentLink> {
    const paymentCart = this.#state.modifyOrderPaymentCart();
    const partnerId = this.#state.partner?.id;
    if (paymentCart?.id == null || partnerId == null || this.#state.paymentInProgress) {
      return throwError((): BaseErrorResponse => FzModificationReservationService.unknownError);
    }

    const expiryError = validateExpiresAt(expiresAt, moment(), resolveSessionDayEnd(paymentCart, this.#state.timezone));
    if (expiryError !== null) {
      return throwError(() => new ModificationPaymentLinkExpiryValidationError(expiryError));
    }

    this.#setPaymentInProgress(true);
    return this.#modificationReservation.createModificationReservation({ cartId: paymentCart.id, expiresAt, partnerId }).pipe(
      catchError((error: unknown) => {
        this.#setPaymentInProgress(false);
        if (resolveModificationReservationErrorOutcome(error).returnsToConfirm) {
          this.#purchase.exitModifyOrderPaymentIfActive();
        }
        return throwError(() => error);
      }),
      tap(() => this.#handOverPaymentCart()),
      switchMap((reservation: ModificationReservation) => this.#resolvePaymentLink(reservation, partnerId)),
      finalize(() => this.#setPaymentInProgress(false)),
    );
  }

  navigateToReservation({ placeId, planId, reservationId }: PosModificationPaymentLink): void {
    this.#unsavedChangesBypass?.markPendingBypass();
    this.#router.navigate([this.#reservationNavigate.getReservationListUrl(), reservationId], {
      queryParams: { cityId: this.#state.selectedCity?.id, planId, venueId: placeId },
    });
  }

  #answerCheckoutRequest({ expiresAt }: CheckoutPaymentLinkRequest): void {
    this.createPaymentLink(expiresAt)
      .pipe(takeUntilDestroyed(this.#destroyRef))
      .subscribe({
        error: (error: unknown) => {
          const { messageKey, returnsToConfirm } = this.#resolveFailure(error);
          this.#checkoutPaymentDriver.reportPaymentLinkResult({ endsCheckout: returnsToConfirm, kind: 'failed', messageKey });
          if (returnsToConfirm) {
            this.checkoutEnded$.next(messageKey);
          }
        },
        next: (paymentLink: PosModificationPaymentLink) => {
          this.#checkoutPaymentDriver.reportPaymentLinkResult({ kind: 'created' });
          this.paymentLinkCreated$.next(paymentLink);
        },
      });
  }

  /** The cart now backs the reservation: discarding it on leave would cancel the customer's link. */
  #handOverPaymentCart(): void {
    this.#state.paymentInProgress = false;
    this.#purchase.releaseModifyOrderPaymentCart();
  }

  #isFlagEnabled(): boolean {
    return this.#optimizely.isFeatureEnabled(FeatureFlags.BOX_OFFICE_MODIFICATION_PAYMENT_LINK) === true;
  }

  #resolveFailure(error: unknown): ModificationReservationErrorOutcome {
    if (error instanceof ModificationPaymentLinkExpiryValidationError) {
      return { isExpiryError: true, messageKey: resolveExpiryErrorMessageKey(error.reason), returnsToConfirm: false };
    }
    return resolveModificationReservationErrorOutcome(error);
  }

  #resolvePaymentLink(reservation: ModificationReservation, partnerId: number): Observable<PosModificationPaymentLink> {
    const fallbackLanguage = this.#translate.currentLang;
    const paymentLink: PosModificationPaymentLink = {
      availableLanguages: [fallbackLanguage],
      cartId: reservation.cartId,
      customerEmail: reservation.customer.email,
      defaultLanguage: fallbackLanguage,
      expiresAt: reservation.expiresAt,
      placeId: Number(this.#state.selectedPlace?.id),
      planId: reservation.mainPlanId,
      reservationId: reservation.reservationId,
    };

    return this.#reservations.getReservation({ partnerId, reservationId: reservation.reservationId }).pipe(
      map(({ data }: BaseResponse<ReservationDetail>) =>
        data === null || data.reservationData.planAvailableLanguages.length === 0
          ? paymentLink
          : {
              ...paymentLink,
              availableLanguages: data.reservationData.planAvailableLanguages,
              defaultLanguage: data.reservationData.planDefaultLanguage,
              placeId: data.reservationData.placeId,
            },
      ),
      defaultIfEmpty(paymentLink),
      catchError(() => of(paymentLink)),
    );
  }

  #setPaymentInProgress(isPaymentInProgress: boolean): void {
    if (this.#state.paymentInProgress === isPaymentInProgress) {
      return;
    }
    this.#state.paymentInProgress = isPaymentInProgress;
    this.#viewUpdate.markForCheck();
  }
}
