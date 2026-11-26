import { ChangeDetectionStrategy, Component, computed, DestroyRef, inject, type Signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { IgntButtonComponent } from '@ignite/common';
import { IgntIconComponent } from '@ignite/icon';
import { TranslateModule } from '@ngx-translate/core';
import { timer } from 'rxjs';
import { take } from 'rxjs/operators';

import { PaymentSummaryPanelComponent } from '../../components/payment-summary-panel/payment-summary-panel.component';
import { SplitSummaryPanelComponent } from '../../components/split-summary-panel/split-summary-panel.component';
import { CheckoutStore } from '../../store/checkout.store';
import { getCheckoutPaymentMethodLabel, getCheckoutPaymentMethodLabelSuffixKey } from '../../utils/checkout-payment.util';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IgntButtonComponent, IgntIconComponent, PaymentSummaryPanelComponent, SplitSummaryPanelComponent, TranslateModule],
  selector: 'app-split-success-step',
  standalone: true,
  styleUrl: './split-success-step.component.scss',
  templateUrl: './split-success-step.component.html',
})
export class SplitSuccessStepComponent {
  static readonly advanceDelayMs = 1000;
  protected readonly store = inject(CheckoutStore);
  readonly #destroyRef = inject(DestroyRef);

  protected readonly cancelCameTooLate: Signal<boolean> = computed(() => this.store.context().tapToPayCancelRequested);

  protected readonly paymentMethodLabel: Signal<string | null> = computed(() => getCheckoutPaymentMethodLabel(this.store.context()));

  protected readonly paymentMethodLabelSuffixKey: Signal<string | null> = computed(() =>
    getCheckoutPaymentMethodLabelSuffixKey(this.store.context()),
  );

  constructor() {
    if (this.cancelCameTooLate()) {
      return;
    }
    timer(SplitSuccessStepComponent.advanceDelayMs)
      .pipe(take(1), takeUntilDestroyed(this.#destroyRef))
      .subscribe(() => this.store.advanceAfterSplitSuccess());
  }

  protected onContinue(): void {
    this.store.advanceAfterSplitSuccess();
  }
}
