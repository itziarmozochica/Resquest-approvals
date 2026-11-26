import { inject, Injectable, signal } from '@angular/core';

import {
  CancelReservationConfirmModalComponent,
  type CancelReservationConfirmModalData,
  type CancelReservationConfirmModalResult,
} from '@fz-original/app/modules/reservation/components/cancel-reservation-confirm-modal/cancel-reservation-confirm-modal.component';
import { type ReservationDetail } from '@fz-original/app/modules/reservation/models/reservation-detail.model';
import { type Reservation } from '@fz-original/app/modules/reservation/models/reservation.model';
import { PaymentLinkService } from '@fz-original/app/modules/reservation/services/payment-link.service';
import { ReservationsService } from '@fz-original/app/modules/reservation/services/reservations.service';
import { type BaseResponse } from '@fz-original/app/shared/models/base-response';
import { type OrderPendingModification } from '@fz-original/app/shared/models/order-pending-modification/order-pending-modification.model';
import { PartnerService } from '@fz-original/app/shared/services/partner/partner.service';
import { resolveErrorCodeDisplayMessage } from '@fz-original/app/shared/utils/resolve-error-code-display-message.util';
import { IgntDialogService, IgntToastService } from '@ignite/common';
import { TranslateService } from '@ngx-translate/core';
import { EMPTY, Observable } from 'rxjs';
import { catchError, finalize, map, switchMap, take } from 'rxjs/operators';

import { orderPendingModificationI18n } from '../models/order-pending-modification-i18n.model';

type CancelPaymentLinkResult = CancelReservationConfirmModalResult<BaseResponse<unknown>>;

@Injectable({
  providedIn: 'root',
})
export class OrderPendingModificationFacade {
  readonly #dialogService = inject(IgntDialogService);
  readonly #partnerService = inject(PartnerService);
  readonly #paymentLinkService = inject(PaymentLinkService);
  readonly #reservationsService = inject(ReservationsService);
  readonly #toastService = inject(IgntToastService);
  readonly #translate = inject(TranslateService);

  readonly #busyReservationId = signal<string | null>(null);
  readonly #cancelledReservationIds = signal<ReadonlySet<string>>(new Set<string>());

  readonly busyReservationId = this.#busyReservationId.asReadonly();
  readonly cancelledReservationIds = this.#cancelledReservationIds.asReadonly();

  cancelPaymentLink({ reservationId }: OrderPendingModification): Observable<boolean> {
    if (this.#busyReservationId() !== null) {
      return EMPTY;
    }

    this.#busyReservationId.set(reservationId);
    return this.#dialogService
      .openModal<CancelPaymentLinkResult, CancelReservationConfirmModalData<BaseResponse<unknown>>>(
        CancelReservationConfirmModalComponent,
        {
          data: {
            acceptLabel: this.#translate.instant(orderPendingModificationI18n.cancelModalAccept),
            cancelLabel: this.#translate.instant(orderPendingModificationI18n.cancelModalCancel),
            message: this.#translate.instant(orderPendingModificationI18n.cancelModalMessage),
            onConfirm: () => this.#reservationsService.cancelReservation(reservationId),
            title: this.#translate.instant(orderPendingModificationI18n.cancelModalTitle),
          },
        },
      )
      .closed$.pipe(
        take(1),
        map((result: CancelPaymentLinkResult | undefined) => this.#resolveCancellation(reservationId, result)),
        finalize(() => this.#busyReservationId.set(null)),
      );
  }

  sharePaymentLink({ reservationId }: OrderPendingModification): Observable<void> {
    if (this.#busyReservationId() !== null) {
      return EMPTY;
    }
    const partnerId = this.#partnerService.getPartner()?.id;
    if (partnerId == null) {
      this.#showShareFailure();
      return EMPTY;
    }

    this.#busyReservationId.set(reservationId);
    return this.#reservationsService.getReservation({ partnerId, reservationId }).pipe(
      take(1),
      map(({ data }: BaseResponse<ReservationDetail>) => data?.reservationData ?? null),
      switchMap((reservation: Reservation | null) => {
        if (reservation === null) {
          this.#showShareFailure();
          return EMPTY;
        }
        return this.#openPaymentLinkModal(reservation);
      }),
      catchError(() => {
        this.#showShareFailure();
        return EMPTY;
      }),
      finalize(() => this.#busyReservationId.set(null)),
    );
  }

  #openPaymentLinkModal(reservation: Reservation): Observable<void> {
    return new Observable<void>(subscriber => {
      this.#paymentLinkService.openModal({
        availableLanguages: reservation.planAvailableLanguages,
        cartId: reservation.cartId,
        defaultLanguage: reservation.planDefaultLanguage,
        onModalLoaded: () => {
          subscriber.next();
          subscriber.complete();
        },
        placeId: reservation.placeId,
        planId: reservation.planId,
        reservationEmail: reservation.ownerEmail ?? '',
        reservationId: reservation.id ?? '',
      });
    });
  }

  #resolveCancellation(reservationId: string, result: CancelPaymentLinkResult | undefined): boolean {
    if (result?.confirmed !== true) {
      return false;
    }

    const response = result.result;
    if (result.error !== undefined || response === undefined || response.error !== null) {
      this.#showCancelFailure(result.error ?? response?.error);
      return false;
    }

    this.#cancelledReservationIds.update((cancelledIds: ReadonlySet<string>) => new Set([...cancelledIds, reservationId]));
    this.#toastService.positive(this.#translate.instant(orderPendingModificationI18n.cancelSucceeded));
    return true;
  }

  #showCancelFailure(error: unknown): void {
    this.#dialogService.openMessageModal(
      this.#translate.instant('common.errorTitle'),
      resolveErrorCodeDisplayMessage(this.#translate, error, orderPendingModificationI18n.cancelFailed),
    );
  }

  #showShareFailure(): void {
    this.#toastService.danger(this.#translate.instant(orderPendingModificationI18n.shareFailed));
  }
}
