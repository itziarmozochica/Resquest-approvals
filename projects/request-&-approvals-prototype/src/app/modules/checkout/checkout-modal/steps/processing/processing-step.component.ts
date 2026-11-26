import { ChangeDetectionStrategy, Component, computed, inject, type Signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';

import { LocalTerminalPaymentService } from '@fz-original/app/payments/services/local-terminal-payment.service';
import { IgntButtonComponent } from '@ignite/common';
import { IgntIconComponent } from '@ignite/icon';
import { TranslateModule } from '@ngx-translate/core';
import { timer } from 'rxjs';
import { map } from 'rxjs/operators';

import { PaymentSummaryPanelComponent } from '../../components/payment-summary-panel/payment-summary-panel.component';
import { SplitSummaryPanelComponent } from '../../components/split-summary-panel/split-summary-panel.component';
import { CheckoutStore } from '../../store/checkout.store';
import { getCheckoutPaymentMethodLabel, getCheckoutPaymentMethodLabelSuffixKey } from '../../utils/checkout-payment.util';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IgntButtonComponent, IgntIconComponent, PaymentSummaryPanelComponent, SplitSummaryPanelComponent, TranslateModule],
  selector: 'app-processing-step',
  standalone: true,
  styleUrl: './processing-step.component.scss',
  templateUrl: './processing-step.component.html',
})
export class ProcessingStepComponent {
  protected readonly store = inject(CheckoutStore);

  protected readonly paymentMethodLabel: Signal<string | null> = computed(() => getCheckoutPaymentMethodLabel(this.store.context()));

  protected readonly paymentMethodLabelSuffixKey: Signal<string | null> = computed(() =>
    getCheckoutPaymentMethodLabelSuffixKey(this.store.context()),
  );

  /** True when this step settles a real split leg through the payment port. */
  readonly #realSplitLeg: boolean;

  protected readonly tapToPayCancelling: Signal<boolean> = computed(() => this.store.context().tapToPayCancelRequested);

  readonly #cancelArmed: Signal<boolean>;

  protected readonly cancelDisabled: Signal<boolean> = computed(() => this.tapToPayCancelling() || !this.#cancelArmed());

  constructor() {
    this.#realSplitLeg = this.store.isSplitFlow() && this.store.hasRealPayment();
    this.store.startPaymentLeg();
    const { legInFlight, legStartedAt } = this.store.context();
    const legElapsedMs: number = legInFlight && legStartedAt !== undefined ? Date.now() - legStartedAt : 0;
    this.#cancelArmed = toSignal(timer(Math.max(0, LocalTerminalPaymentService.cancelArmingDelayMs - legElapsedMs)).pipe(map(() => true)), {
      initialValue: false,
    });
  }

  /**
   * A real leg must be aborted through the payment port (terminal abort + driver unwind); its
   * `cancelled` result then drives the modal. The simulated split flows (no driven port) have no
   * such result coming, so the store cancels the pending leg outcome itself before jumping back to
   * method selection.
   */
  protected onCancelCurrentSplit(): void {
    if (this.store.isTapToPayPayment()) {
      this.store.cancelTapToPayPayment();
      return;
    }
    if (this.#realSplitLeg) {
      this.store.cancelPaymentLeg();
      return;
    }
    this.store.cancelSimulatedSplitLeg();
  }

  protected onCancelPayment(): void {
    if (this.store.isTapToPayPayment()) {
      this.store.cancelTapToPayPayment();
      return;
    }
    this.store.cancelPayment();
  }

  protected onViewHistory(): void {
    this.store.transition('viewHistory');
  }
}
