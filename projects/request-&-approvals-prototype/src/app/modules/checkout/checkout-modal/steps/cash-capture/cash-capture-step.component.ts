import { afterNextRender, ChangeDetectionStrategy, Component, computed, inject, type Signal } from '@angular/core';

import { Money } from '@fz-original/app/shared/models/money.model';
import { CashDrawerOpenMessage } from '@fz-original/app/shared/services/webview-messenger/models/cash-drawer-open-message';
import { WebviewMessengerService } from '@fz-original/app/shared/services/webview-messenger/webview-messenger.service';

import { CashCalculatorComponent } from '../../components/cash-calculator/cash-calculator.component';
import { CheckoutStore } from '../../store/checkout.store';
import { isCashCaptureMandatory } from '../../utils/checkout-cash-tendered.util';

/**
 * Cash-tendered capture: shows the change to return on every delegated cash leg. Composes the
 * presentational cash calculator and mirrors the received amount into the checkout context so the
 * modal can gate confirmation and later payment wiring. The cash drawer opens as the calculator
 * appears, so the cashier can count the cash and hand back the change before confirming.
 */
@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CashCalculatorComponent],
  selector: 'app-cash-capture-step',
  standalone: true,
  templateUrl: './cash-capture-step.component.html',
})
export class CashCaptureStepComponent {
  readonly #store = inject(CheckoutStore);
  readonly #webviewMessenger = inject(WebviewMessengerService);

  constructor() {
    afterNextRender(() => this.#webviewMessenger.sendWebViewMessage(new CashDrawerOpenMessage()));
  }

  protected readonly amountDue: Signal<Money> = computed(() =>
    this.#store.isSplitFlow() ? this.#store.currentSplitAmount() : this.#store.remainingAmount(),
  );
  protected readonly locale: Signal<string> = computed(() => this.#store.context().locale);
  protected readonly subtitleKey: Signal<string | null> = computed(() =>
    isCashCaptureMandatory(this.#store.context()) ? 'checkout.cashCapture.subtitle' : null,
  );

  protected onReceivedChange(amount: number): void {
    this.#store.setCalculatorReceivedAmount(amount > 0 ? amount : null);
  }
}
