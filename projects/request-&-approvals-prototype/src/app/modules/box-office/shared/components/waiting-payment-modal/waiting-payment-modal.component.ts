import {
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  inject,
  InjectionToken,
  output,
  signal,
  viewChild,
  WritableSignal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { SplitPaymentChildTriggerFailedEvent } from '@fz-original/app/core/tracking/core/events/split-payment-child-trigger-failed';
import { SplitPaymentChildTriggerSuccessEvent } from '@fz-original/app/core/tracking/core/events/split-payment-child-trigger-success';
import { SplitPaymentChildTriggeredEvent } from '@fz-original/app/core/tracking/core/events/split-payment-child-triggered';
import { TrackingService } from '@fz-original/app/core/tracking/tracking.service';
import { IgntIconComponent } from '@ignite/icon';
import { IgntButtonComponent } from '@ignite/legacy/components/ignt-button/ignt-button.component';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { timer } from 'rxjs';
import { finalize } from 'rxjs/operators';

import { SplitPaymentService } from '../../services/split-payment/split-payment.service';
import { SplitAmountInputComponent } from '../split-amount-input/split-amount-input.component';

export interface WaitingPaymentModalData {
  cartId: string | null;
  currency: string | null;
  partnerId: number | null;
  placeId: number | null;
  planId: number | null;
  totalAmount: number | null;
  transactionId: string | null;
}

export const WAITING_PAYMENT_MODAL_DATA = new InjectionToken<WaitingPaymentModalData>('WAITING_PAYMENT_MODAL_DATA');

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [TranslateModule, IgntButtonComponent, IgntIconComponent, SplitAmountInputComponent],
  selector: 'app-waiting-for-payment-modal',
  standalone: true,
  styleUrls: ['./waiting-payment-modal.component.scss'],
  templateUrl: './waiting-payment-modal.component.html',
})
export class WaitingForPaymentModalComponent {
  readonly #destroyRef = inject(DestroyRef);
  readonly #modalData = inject(WAITING_PAYMENT_MODAL_DATA, { optional: true });
  protected readonly splitAmountInput = viewChild(SplitAmountInputComponent);
  readonly #splitPaymentService = inject(SplitPaymentService);
  readonly #trackingService = inject(TrackingService);
  readonly #translate = inject(TranslateService);
  #splitIndex = 0;

  response = output<boolean>();
  splitPaymentTriggered = output<void>();
  readonly cartId = computed(() => this.#modalData?.cartId ?? null);
  readonly currency = computed(() => this.#modalData?.currency ?? 'EUR');
  readonly partnerId = computed(() => this.#modalData?.partnerId ?? null);
  readonly placeId = computed(() => this.#modalData?.placeId ?? null);
  readonly planId = computed(() => this.#modalData?.planId ?? null);
  readonly totalAmount = computed(() => this.#modalData?.totalAmount ?? null);
  readonly transactionId = computed(() => this.#modalData?.transactionId ?? null);
  readonly isSplitPayment = computed(() => !!(this.cartId() && this.partnerId()));

  isSendingSplit: WritableSignal<boolean> = signal(false);
  paymentInProgress = true;
  splitError: WritableSignal<string | null> = signal(null);

  cancelTransaction(): void {
    this.paymentInProgress = false;
    this.response.emit(true);
  }

  sendNextSplit(): void {
    const cartId = this.cartId();
    const partnerId = this.partnerId();
    const transactionId = this.transactionId();
    if (!cartId || !partnerId || this.isSendingSplit()) {
      return;
    }
    const amountInput = this.splitAmountInput();
    if (!(amountInput?.isValid() ?? false)) {
      return;
    }

    this.#splitIndex += 1;
    const splitIndex = this.#splitIndex;
    if (transactionId) {
      this.#trackingService.track(
        new SplitPaymentChildTriggeredEvent({
          cart_id: cartId,
          partner_id: partnerId,
          split_index: splitIndex,
          transaction_id: transactionId,
        }),
      );
    }
    this.isSendingSplit.set(true);
    this.splitError.set(null);

    const amount = amountInput?.effectiveAmount() ?? undefined;
    this.#splitPaymentService
      .triggerNextPayment(partnerId, cartId, amount)
      .pipe(
        finalize(() => {
          timer(6000)
            .pipe(takeUntilDestroyed(this.#destroyRef))
            .subscribe(() => this.isSendingSplit.set(false));
        }),
        takeUntilDestroyed(this.#destroyRef),
      )
      .subscribe({
        error: (err: { error?: { error?: string } }) => {
          this.splitError.set(err.error?.error || this.#translate.instant('boxOffice.waitPaymentModal.splitPaymentError'));
          if (transactionId) {
            this.#trackingService.track(
              new SplitPaymentChildTriggerFailedEvent({
                cart_id: cartId,
                error: typeof err.error?.error === 'string' ? err.error.error : 'Unknown error',
                partner_id: partnerId,
                split_index: splitIndex,
                transaction_id: transactionId,
              }),
            );
          }
        },
        next: result => {
          if (!result.success) {
            this.splitError.set(result.error || this.#translate.instant('boxOffice.waitPaymentModal.splitPaymentError'));
            if (transactionId) {
              this.#trackingService.track(
                new SplitPaymentChildTriggerFailedEvent({
                  cart_id: cartId,
                  error: result.error ?? 'Unknown error',
                  partner_id: partnerId,
                  split_index: splitIndex,
                  transaction_id: transactionId,
                }),
              );
            }
          } else {
            if (transactionId) {
              this.#trackingService.track(
                new SplitPaymentChildTriggerSuccessEvent({
                  cart_id: cartId,
                  partner_id: partnerId,
                  split_index: splitIndex,
                  transaction_id: transactionId,
                }),
              );
            }
            this.splitPaymentTriggered.emit();
          }
        },
      });
  }
}
