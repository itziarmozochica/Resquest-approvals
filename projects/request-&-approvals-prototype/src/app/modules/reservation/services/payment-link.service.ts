import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { inject, Injectable, signal } from '@angular/core';

import { BaseErrorResponse, BaseResponse } from '@fz-original/app/shared/models/base-response';
import { CartService } from '@fz-original/app/shared/services/cart/cart.service';
import { DistributorRouteService, scopedOrganizationHeader } from '@fz-original/app/shared/services/distributor/distributor-route.service';
import { ErrorModalService } from '@fz-original/app/shared/services/error-modal/error-modal.service';
import { PartnerService } from '@fz-original/app/shared/services/partner/partner.service';
import { ToastService } from '@fz-original/app/shared/services/toast/toast.service';
import { UserService } from '@fz-original/app/shared/services/user/user.service';
import { ErrorResponseUtils } from '@fz-original/app/shared/utils/error-response.utils';
import type { DistributorTarget } from '@fz/reservations';
import { AlertSentiment } from '@ignite/legacy/components/ignt-alert/ignt-alert.component';
import { NgbModal, NgbModalRef } from '@ng-bootstrap/ng-bootstrap';
import { TranslateService } from '@ngx-translate/core';
import { BehaviorSubject, EMPTY, merge, Observable, of, Subject } from 'rxjs';
import { catchError, finalize, map, switchMap, take, takeUntil } from 'rxjs/operators';

import { environment } from '../../../../environments/environment';
import { ClipboardModalComponent } from '../../../shared/components/clipboard-modal/clipboard-modal.component';
import { ReservationsPaymentUrlModalComponent } from '../components/reservation-details/reservation-details-unpaid/reservations-payment-url-modal/reservations-payment-url-modal.component';
import { PaymentOption } from '../models/payment-option.enum';
import { PaymentUrlSendEmailStatus } from '../models/payment-url-send-email.status';
import { ReservationPaymentUrl, ReservationPaymentUrlResponse } from '../models/reservation-payment-url.model';
import { ReservationPaymentUrlQuery } from '../models/reservation-payment-url.query';
import { ReservationPaymentUrlAdapter } from './reservation-payment-url.adapter';
import { ReservationsService } from './reservations.service';

interface PaymentLinkModalContext {
  availableLanguages: string[];
  cartId: string;
  defaultLanguage: string;
  onModalClosed?: () => void;
  onModalLoaded?: () => void;
  /** Called instead of `onModalClosed` when the payment URLs do not load and no modal opens. */
  onModalUnavailable?: () => void;
  paymentOption?: PaymentOption;
  placeId: number;
  planId: number;
  reservationEmail: string;
  reservationId: string;
}

function withDepositOption(url: string): string {
  try {
    const parsed = new URL(url);
    parsed.searchParams.set('payment_option', PaymentOption.DEPOSIT);
    return parsed.toString();
  } catch {
    return url;
  }
}

@Injectable({
  providedIn: 'root',
})
export class PaymentLinkService {
  #cartService = inject(CartService);
  #distributorRoute = inject(DistributorRouteService);
  #emailStatus = new BehaviorSubject<PaymentUrlSendEmailStatus>(PaymentUrlSendEmailStatus.PENDING);
  #errorModalService = inject(ErrorModalService);
  #httpClient = inject(HttpClient);
  #modalService = inject(NgbModal);
  #partnerService = inject(PartnerService);
  #reservationPaymentUrlAdapter = inject(ReservationPaymentUrlAdapter);
  #reservationsService = inject(ReservationsService);
  #selectedLanguage = signal<string | undefined>(undefined);
  #selectedLanguageByReservationId = new Map<string, string>();
  #toastService = inject(ToastService);
  #translate = inject(TranslateService);
  #userService = inject(UserService);

  generate({ cartId, planId, reservationId }: { cartId: string; planId: number; reservationId: string }): void {
    const modal: NgbModalRef = this.#modalService.open(ClipboardModalComponent);
    modal.componentInstance.title = this.#translate.instant('shareUrl');
    modal.componentInstance.toCopy = `${environment.webclientBaseUrl}/purchase/${planId}/${cartId}?reservation=${reservationId}`;
  }

  getPaymentUrls(reservationPaymentUrlQuery: ReservationPaymentUrlQuery): Observable<BaseResponse<ReservationPaymentUrl[] | null>> {
    const target = this.#distributorRoute.pairTarget();
    if (target !== null) {
      return this.#getPaymentUrlsForCart(reservationPaymentUrlQuery, target);
    }

    const { planId, cartId, partnerId, placeId } = reservationPaymentUrlQuery;
    const path = `${environment.apiGWBaseUrl}/1.0/partners/${partnerId}/plans/${planId}/places/${placeId}/carts/${cartId}/purchase-urls`;
    const params = this.#getParams(reservationPaymentUrlQuery);
    return this.#httpClient.get<BaseResponse<ReservationPaymentUrlResponse[]>>(path, { params }).pipe(
      map(result => this.#reservationPaymentUrlAdapter.fromApi(result)),
      catchError(error => ErrorResponseUtils.getErrorResponse(error)),
    );
  }

  openModal(context: PaymentLinkModalContext): void {
    this.#openNewModal(context);
  }

  #getParams(reservationPaymentUrlQuery: ReservationPaymentUrlQuery): HttpParams {
    let params = new HttpParams();

    params = params.append('reservation_id', reservationPaymentUrlQuery.reservationId);
    if (reservationPaymentUrlQuery.language) {
      params = params.append('language', reservationPaymentUrlQuery.language);
    }

    return params;
  }

  #getPaymentUrls(data: {
    cartId: string;
    language?: string;
    placeId: number;
    planId: number;
    reservationId: string;
  }): Observable<ReservationPaymentUrl[] | null> {
    if (this.#distributorRoute.isBlocked()) {
      return of(null);
    }

    const partnerId = this.#distributorRoute.pairTarget()?.targetOrganizationId ?? this.#partnerService.getPartner()?.id;
    if (!partnerId) {
      return of(null);
    }

    return this.getPaymentUrls({
      planId: data.planId,
      cartId: data.cartId,
      reservationId: data.reservationId,
      partnerId,
      placeId: data.placeId,
      language: data.language,
    }).pipe(
      map(response => {
        if (response.error !== null) {
          this.#errorModalService.open({
            message: 'reservation.confirmation.paymentLinkError',
            errorCode: response.error.code,
            showErrorCode: true,
          });
          return null;
        }

        return response.data ?? null;
      }),
    );
  }

  #getPaymentUrlsForCart(
    reservationPaymentUrlQuery: ReservationPaymentUrlQuery,
    target: DistributorTarget,
  ): Observable<BaseResponse<ReservationPaymentUrl[] | null>> {
    const { cartId, language, reservationId } = reservationPaymentUrlQuery;
    const path = `${environment.apiBaseUrl}/3.0/carts/${cartId}/purchase-urls/`;
    const headers = new HttpHeaders(scopedOrganizationHeader(target));
    let params = new HttpParams().set('reservation_id', reservationId);
    if (language) {
      params = params.set('language', language);
    }

    return this.#httpClient
      .get<{ data: { urls: ReservationPaymentUrlResponse[] } | null; error: BaseErrorResponse | null }>(path, { headers, params })
      .pipe(
        map(result => this.#reservationPaymentUrlAdapter.fromApi(new BaseResponse(result.data?.urls ?? null, result.error))),
        catchError(error => ErrorResponseUtils.getErrorResponse(error)),
      );
  }

  #openNewModal(context: PaymentLinkModalContext): void {
    const {
      cartId,
      planId,
      placeId,
      reservationId,
      reservationEmail,
      availableLanguages,
      defaultLanguage,
      onModalLoaded,
      onModalClosed,
      onModalUnavailable,
      paymentOption,
    } = context;
    const isDepositSelected = paymentOption === PaymentOption.DEPOSIT;

    const paymentUrls$ = this.#getPaymentUrls({
      cartId,
      language: this.#selectedLanguageByReservationId.get(reservationId) ?? defaultLanguage,
      planId,
      placeId,
      reservationId,
    });
    const destroy$ = new Subject<void>();

    paymentUrls$
      .pipe(
        finalize(() => {
          if (onModalLoaded) {
            onModalLoaded();
          }
        }),
        take(1),
      )
      .subscribe(paymentUrls => {
        if (!paymentUrls) {
          onModalUnavailable?.();
          return;
        }

        const resolvedUrls = isDepositSelected ? paymentUrls.map(u => ({ ...u, url: withDepositOption(u.url) })) : paymentUrls;

        const modal: NgbModalRef = this.#modalService.open(ReservationsPaymentUrlModalComponent);

        modal.componentInstance.paymentUrls = resolvedUrls;
        modal.componentInstance.reservationEmail = reservationEmail;
        modal.componentInstance.sendEmail.pipe(takeUntil(destroy$)).subscribe((event: { applicationId: string }) => {
          this.#sendPaymentLinkEmail({
            applicationId: event.applicationId,
            cartId,
            paymentOption: isDepositSelected ? PaymentOption.DEPOSIT : undefined,
            placeId,
            planId,
            reservationId,
          })
            .pipe(
              catchError((error: BaseErrorResponse) => {
                modal.componentInstance.mailStatusErrorCode.set(error.code);
                this.#emailStatus.next(PaymentUrlSendEmailStatus.ERROR);
                return EMPTY;
              }),
              takeUntil(destroy$),
            )
            .subscribe(() => {
              this.#emailStatus.next(PaymentUrlSendEmailStatus.SENT);
              this.#toastService.add({
                message: this.#translate.instant('reservation.paymentUrlModal.emailSuccess', { email: reservationEmail }),
                sentiment: AlertSentiment.positive,
                delay: 10000,
              });
            });
        });
        modal.componentInstance.mailStatus = this.#emailStatus;
        modal.componentInstance.availableLanguages = availableLanguages;
        modal.componentInstance.defaultLanguage = this.#selectedLanguageByReservationId.get(reservationId) ?? defaultLanguage;
        modal.componentInstance.cartId = cartId;
        modal.componentInstance.planId = planId;
        modal.componentInstance.languageSelected.pipe(takeUntil(destroy$)).subscribe((language: string) => {
          modal.componentInstance.isLoadingPaymentUrls.set(true);
          this.#selectedLanguage.set(language);
          this.#getPaymentUrls({ cartId, language, planId, placeId, reservationId })
            .pipe(
              takeUntil(destroy$),
              finalize(() => {
                modal.componentInstance.isLoadingPaymentUrls.set(false);
              }),
            )
            .subscribe(paymentUrls => {
              if (!paymentUrls) {
                return;
              }
              const resolvedLangUrls = isDepositSelected ? paymentUrls.map(u => ({ ...u, url: withDepositOption(u.url) })) : paymentUrls;
              modal.componentInstance.updatePaymentUrls(resolvedLangUrls, false);
            });
        });
        modal.componentInstance.linkCopied.pipe(takeUntil(destroy$)).subscribe(() => {
          this.#updateCartLocale(cartId, reservationId).pipe(takeUntil(destroy$)).subscribe();
        });

        merge(modal.closed, modal.dismissed)
          .pipe(take(1))
          .subscribe(() => {
            const selectedLanguage = this.#selectedLanguage();
            if (selectedLanguage) {
              this.#selectedLanguageByReservationId.set(reservationId, selectedLanguage);
            }

            destroy$.next();
            destroy$.complete();

            this.#selectedLanguage.set(undefined);
            this.#emailStatus.next(PaymentUrlSendEmailStatus.PENDING);

            if (onModalClosed) {
              onModalClosed();
            }
          });
      });
  }

  #sendPaymentLinkEmail(data: {
    applicationId: string;
    cartId: string;
    paymentOption?: PaymentOption;
    placeId: number;
    planId: number;
    reservationId: string;
  }): Observable<void> {
    const partnerId = this.#partnerService.getPartner()?.id;
    const userId = this.#userService.getUserId();
    if (!partnerId || !userId) {
      return EMPTY;
    }

    return this.#updateCartLocale(data.cartId, data.reservationId).pipe(
      switchMap(() =>
        this.#reservationsService.sendReservationPaymentLinkEmail({
          applicationId: data.applicationId,
          partnerId,
          paymentOption: data.paymentOption,
          placeId: data.placeId,
          planId: data.planId,
          reservationId: data.reservationId,
          userId,
        }),
      ),
    );
  }

  #updateCartLocale(cartId: string, reservationId: string): Observable<void> {
    const partnerId = this.#partnerService.getPartner()?.id;
    const userId = this.#userService.getUserId();
    const selectedLanguage = this.#selectedLanguage() ?? this.#selectedLanguageByReservationId.get(reservationId);
    if (!selectedLanguage || !partnerId || !userId) {
      return of(undefined);
    }

    return this.#cartService.updateCartLocale({
      partnerId,
      userId,
      cartId,
      locale: selectedLanguage,
    });
  }
}
