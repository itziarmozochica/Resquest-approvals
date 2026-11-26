import { Dialog } from '@angular/cdk/dialog';
import { inject, Injectable } from '@angular/core';

import { TrackingService } from '@fz-original/app/core/tracking/tracking.service';
import {
  MessageDialogComponent,
  MessageDialogMessagesConfig,
} from '@fz-original/app/shared/components/message-dialog/message-dialog.component';
import { TranslateService } from '@ngx-translate/core';
import { Observable, of } from 'rxjs';
import { catchError, map, take, tap } from 'rxjs/operators';

import { SplitPaymentCancellationErrorShownEvent } from '../../../../../core/tracking/core/events/split-payment-cancellation-error-shown';
import { SplitPaymentRetryRefundReceiptEvent } from '../../../../../core/tracking/core/events/split-payment-retry-refund-receipt';
import { SplitPaymentTriggerResponse } from './models/split-payment-response.model';
import { SplitPaymentService } from './split-payment.service';

export interface SplitPaymentRetryResult {
  isRetryable: boolean;
  isSuccess: boolean;
}

@Injectable({
  providedIn: 'root',
})
export class SplitPaymentRetryUiService {
  #dialog = inject(Dialog);
  #splitPaymentService = inject(SplitPaymentService);
  #trackingService = inject(TrackingService);
  #translate = inject(TranslateService);

  retryRefundReceiptPrint(partnerId: number, cartId: string, transactionId: string): Observable<SplitPaymentRetryResult> {
    if (!transactionId) {
      return of({ isRetryable: false, isSuccess: false });
    }

    return this.#splitPaymentService.retryRefundReceiptPrint(partnerId, cartId, transactionId).pipe(
      tap((response: SplitPaymentTriggerResponse) => {
        this.#trackingService.track(
          new SplitPaymentRetryRefundReceiptEvent({
            cart_id: cartId,
            partner_id: partnerId,
            success: response.success,
            transaction_id: transactionId,
          }),
        );
      }),
      map((response: SplitPaymentTriggerResponse) => {
        if (!response.success) {
          return {
            isRetryable: true,
            isSuccess: false,
          };
        }
        return {
          isRetryable: false,
          isSuccess: true,
        };
      }),
      catchError(() => {
        this.#trackingService.track(
          new SplitPaymentRetryRefundReceiptEvent({
            cart_id: cartId,
            partner_id: partnerId,
            success: false,
            transaction_id: transactionId,
          }),
        );
        return of({
          isRetryable: true,
          isSuccess: false,
        });
      }),
    );
  }

  showCancellationErrorModal(partnerId: number, cartId: string, transactionId: string): void {
    if (!transactionId) {
      return;
    }

    this.#trackingService.track(
      new SplitPaymentCancellationErrorShownEvent({
        cart_id: cartId,
        partner_id: partnerId,
        transaction_id: transactionId,
      }),
    );

    let shouldRetry = false;

    const dialog = this.#dialog.open(MessageDialogComponent, {
      data: {
        acceptButtonLabel: this.#translate.instant('boxOffice.splitPayment.retryPrintRefund'),
        allowCancelDuringLoading: true,
        cancelButtonLabel: this.#translate.instant('common.close'),
        messages: [this.#translate.instant('boxOffice.splitPayment.cancellationMessage')],
        title: this.#translate.instant('boxOffice.splitPayment.cancellationTitle'),
        onAccept: () =>
          this.retryRefundReceiptPrint(partnerId, cartId, transactionId).pipe(
            tap(result => {
              shouldRetry = !result.isSuccess && result.isRetryable;
            }),
            map(result => (result.isSuccess ? true : undefined)),
          ),
      } satisfies MessageDialogMessagesConfig,
      disableClose: false,
      hasBackdrop: true,
    });

    dialog.closed.pipe(take(1)).subscribe(response => {
      if (response === true) {
        this.#showSuccessModal();
      } else if (shouldRetry) {
        this.showCancellationErrorModal(partnerId, cartId, transactionId);
      }
    });
  }

  #showSuccessModal(): void {
    this.#dialog.open(MessageDialogComponent, {
      data: {
        acceptButtonLabel: this.#translate.instant('common.close'),
        messages: [this.#translate.instant('boxOffice.splitPayment.refundReceiptPrintedSuccessfully')],
        title: this.#translate.instant('common.success'),
      } satisfies MessageDialogMessagesConfig,
      disableClose: true,
      hasBackdrop: true,
    });
  }
}
