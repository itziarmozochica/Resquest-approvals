import { ChangeDetectionStrategy, Component, computed, inject, signal, type Signal, type WritableSignal } from '@angular/core';

import { NumericKeypadComponent } from '@fz-original/app/shared/components/numeric-keypad/numeric-keypad.component';
import { IgntCheckboxComponent } from '@ignite/legacy/components/ignt-checkbox/ignt-checkbox.component';
import { TranslateModule } from '@ngx-translate/core';

import { PaymentSummaryPanelComponent } from '../../components/payment-summary-panel/payment-summary-panel.component';
import { SplitSummaryPanelComponent } from '../../components/split-summary-panel/split-summary-panel.component';
import { CheckoutStore } from '../../store/checkout.store';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IgntCheckboxComponent, NumericKeypadComponent, PaymentSummaryPanelComponent, SplitSummaryPanelComponent, TranslateModule],
  selector: 'app-amount-entry-step',
  standalone: true,
  styleUrl: './amount-entry-step.component.scss',
  templateUrl: './amount-entry-step.component.html',
})
export class AmountEntryStepComponent {
  protected readonly store = inject(CheckoutStore);

  /** True while the last keypad press was rejected for exceeding the remaining balance. */
  protected readonly maxAmountExceeded: WritableSignal<boolean> = signal(false);

  protected readonly formattedRemaining: Signal<string> = computed(() =>
    this.store.remainingAmount().toString(this.store.context().locale),
  );

  protected onAmountChange(amount: number): void {
    this.maxAmountExceeded.set(false);
    this.store.setSplitAmountOverride(amount > 0 ? amount : null);
  }

  protected onLimitExceeded(): void {
    this.maxAmountExceeded.set(true);
  }

  protected onPayRemainingChange(payRemaining: boolean): void {
    this.maxAmountExceeded.set(false);
    this.store.togglePayRemaining(payRemaining);
  }

  protected onViewHistory(): void {
    this.store.transition('viewHistory');
  }
}
