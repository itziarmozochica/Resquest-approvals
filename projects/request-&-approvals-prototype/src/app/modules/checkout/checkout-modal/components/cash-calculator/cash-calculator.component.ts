import { CurrencyPipe } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  input,
  output,
  signal,
  untracked,
  type InputSignal,
  type OutputEmitterRef,
  type Signal,
  type WritableSignal,
} from '@angular/core';

import { NumericKeypadComponent } from '@fz-original/app/shared/components/numeric-keypad/numeric-keypad.component';
import { TranslateModule } from '@ngx-translate/core';

import type { CashCalculatorField } from './cash-calculator.model';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CurrencyPipe, NumericKeypadComponent, TranslateModule],
  selector: 'app-cash-calculator',
  standalone: true,
  styleUrl: './cash-calculator.component.scss',
  templateUrl: './cash-calculator.component.html',
})
export class CashCalculatorComponent {
  changeLabelKey: InputSignal<string> = input<string>('checkout.calculator.change');
  currency: InputSignal<string> = input.required<string>();
  locale: InputSignal<string> = input<string>('en-US');
  lockTotalToPay: InputSignal<boolean> = input<boolean>(false);
  receivedLabelKey: InputSignal<string> = input<string>('checkout.calculator.received');
  subtitleKey: InputSignal<string | null> = input<string | null>(null);
  totalToPay: InputSignal<number> = input.required<number>();
  totalToPayLabelKey: InputSignal<string> = input<string>('checkout.calculator.totalToPay');

  receivedChange: OutputEmitterRef<number> = output<number>();
  totalToPayChange: OutputEmitterRef<number> = output<number>();

  protected readonly focusedField: WritableSignal<CashCalculatorField> = signal<CashCalculatorField>('received');
  protected readonly received: WritableSignal<number> = signal<number>(0);
  readonly #manualTotalToPay: WritableSignal<number | undefined> = signal<number | undefined>(undefined);

  protected readonly editableTotalToPay: Signal<number> = computed(() => this.#manualTotalToPay() ?? this.totalToPay());

  protected readonly change: Signal<number> = computed(() => this.editableTotalToPay() - this.received());
  protected readonly keypadValue: Signal<number> = computed(() =>
    this.focusedField() === 'received' ? this.received() : this.editableTotalToPay(),
  );

  constructor() {
    effect(() => {
      this.totalToPay();
      untracked(() => this.#manualTotalToPay.set(undefined));
    });
  }

  protected focusField(field: CashCalculatorField): void {
    if (this.lockTotalToPay() && field === 'totalToPay') {
      return;
    }
    this.focusedField.set(field);
  }

  protected onKeypadValueChange(amount: number): void {
    if (this.focusedField() === 'received') {
      this.received.set(amount);
      this.receivedChange.emit(amount);
      return;
    }

    if (this.lockTotalToPay()) {
      return;
    }

    this.#manualTotalToPay.set(amount);
    this.totalToPayChange.emit(amount);
  }
}
