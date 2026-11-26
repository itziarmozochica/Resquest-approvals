import { ChangeDetectionStrategy, Component, computed, inject, type Signal } from '@angular/core';

import { IgntButtonComponent, type IgntButtonIcon } from '@ignite/common';
import { IgntIconComponent } from '@ignite/icon';
import { TranslateModule } from '@ngx-translate/core';

import { CheckoutStore } from '../../store/checkout.store';
import { resolvePaymentFailureMessageKey, resolvePaymentFailureTitleKey } from '../../utils/checkout-payment-failure.util';
import { formatCheckoutCollectedAmount, isSoldOutFailure, resolveSoldOutMessageKey } from '../../utils/checkout-sold-out.util';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IgntButtonComponent, IgntIconComponent, TranslateModule],
  selector: 'app-payment-failed-step',
  standalone: true,
  styleUrl: './payment-failed-step.component.scss',
  templateUrl: './payment-failed-step.component.html',
})
export class PaymentFailedStepComponent {
  protected readonly store = inject(CheckoutStore);

  protected readonly retryIcon: IgntButtonIcon = { name: 'redo', variant: 'solid' };

  protected readonly messageKey: Signal<string> = computed(() => {
    const context = this.store.context();
    return isSoldOutFailure(context) ? resolveSoldOutMessageKey(context) : resolvePaymentFailureMessageKey(context.paymentFailureReason);
  });

  protected readonly collectedAmount: Signal<string> = computed(() => formatCheckoutCollectedAmount(this.store.context()));

  protected readonly titleKey: Signal<string> = computed(() => resolvePaymentFailureTitleKey(this.store.context().paymentFailureReason));

  protected readonly canRetry: Signal<boolean> = computed(() => this.store.context().paymentResendBlocked !== true);

  protected retry(): void {
    this.store.retryPayment();
  }
}
