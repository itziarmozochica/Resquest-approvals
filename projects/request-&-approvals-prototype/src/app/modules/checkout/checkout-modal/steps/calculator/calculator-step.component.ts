import { ChangeDetectionStrategy, Component, computed, inject, type Signal } from '@angular/core';

import { Money } from '@fz-original/app/shared/models/money.model';

import { CashCalculatorComponent } from '../../components/cash-calculator/cash-calculator.component';
import { CheckoutStore } from '../../store/checkout.store';

/**
 * On-demand cash helper opened from method selection. Composes the presentational cash calculator
 * with checkout amounts for change preview only — it never mutates the checkout context.
 */
@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CashCalculatorComponent],
  selector: 'app-calculator-step',
  standalone: true,
  templateUrl: './calculator-step.component.html',
})
export class CalculatorStepComponent {
  readonly #store = inject(CheckoutStore);

  protected readonly amountDue: Signal<Money> = computed(() =>
    this.#store.isSplitFlow() ? this.#store.currentSplitAmount() : this.#store.remainingAmount(),
  );
  protected readonly locale: Signal<string> = computed(() => this.#store.context().locale);
}
