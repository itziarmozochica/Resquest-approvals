import { DecimalPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, input, Signal, signal, WritableSignal } from '@angular/core';

import { TranslateModule } from '@ngx-translate/core';

import { AutoformatNumericInputModule } from '../../../../../shared/directives/autoformat-numeric-input/autoformat-numeric-input.module';
import { MINIMUM_SPLIT_AMOUNT_CENTS } from '../../constants/split-payment.constants';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [AutoformatNumericInputModule, DecimalPipe, TranslateModule],
  selector: 'app-split-amount-input',
  standalone: true,
  styleUrl: './split-amount-input.component.scss',
  templateUrl: './split-amount-input.component.html',
})
export class SplitAmountInputComponent {
  static readonly MINIMUM_SPLIT_AMOUNT_CENTS = MINIMUM_SPLIT_AMOUNT_CENTS;

  currency = input.required<string>();
  remainingAmount = input.required<number>();
  disabled = input<boolean>(false);
  paidSplitsCount = input<number>(0);

  customAmountInput: WritableSignal<number | null> = signal(null);
  numberOfSplitsInput: WritableSignal<number | null> = signal(null);

  suggestedAmount: Signal<number | null> = computed(() => {
    const n = this.numberOfSplitsInput();
    if (n == null || n <= 0) return null;
    const remainingCents = Math.round(this.remainingAmount() * 100);
    if (remainingCents <= 0) return null;
    const remainingSplits = Math.max(n - this.paidSplitsCount(), 1);
    return Math.round(remainingCents / remainingSplits) / 100;
  });

  effectiveAmount: Signal<number | null> = computed(() => {
    const custom = this.customAmountInput();
    return custom != null && custom > 0 ? custom : this.suggestedAmount();
  });

  isAmountExceedingRemaining: Signal<boolean> = computed(() => {
    const amt = this.effectiveAmount();
    if (amt == null) return false;
    return Math.round(amt * 100) > Math.round(this.remainingAmount() * 100);
  });

  isAmountTooLow: Signal<boolean> = computed(() => {
    const amt = this.effectiveAmount();
    if (amt == null) return false;
    return Math.round(amt * 100) < MINIMUM_SPLIT_AMOUNT_CENTS;
  });

  wouldLeaveInsufficient: Signal<boolean> = computed(() => {
    const amt = this.effectiveAmount();
    if (amt == null) return false;
    const afterCents = Math.round(this.remainingAmount() * 100) - Math.round(amt * 100);
    return afterCents > 0 && afterCents < MINIMUM_SPLIT_AMOUNT_CENTS;
  });

  isValid: Signal<boolean> = computed(
    () => this.effectiveAmount() != null && !this.isAmountExceedingRemaining() && !this.isAmountTooLow() && !this.wouldLeaveInsufficient(),
  );

  get minimumAmountFormatted(): string {
    return (MINIMUM_SPLIT_AMOUNT_CENTS / 100).toFixed(2);
  }

  onCustomAmountRawValue(value: number): void {
    this.customAmountInput.set(Number.isFinite(value) && value > 0 ? value : null);
  }

  onNumberOfSplitsChange(event: Event): void {
    const el = event.target as HTMLInputElement;
    this.numberOfSplitsInput.set(+el.value || null);
  }
}
