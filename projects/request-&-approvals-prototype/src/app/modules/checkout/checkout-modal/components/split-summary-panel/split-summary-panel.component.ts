import { CurrencyPipe } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
  output,
  type InputSignal,
  type OutputEmitterRef,
  type Signal,
} from '@angular/core';

import { Money } from '@fz-original/app/shared/models/money.model';
import { IgntIconComponent } from '@ignite/icon';
import { TranslateModule } from '@ngx-translate/core';

type SplitSummaryRow = 'paid' | 'toPay';
type SplitSummaryChevron = 'chevron-down' | 'chevron-right';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CurrencyPipe, IgntIconComponent, TranslateModule],
  selector: 'app-split-summary-panel',
  standalone: true,
  styleUrl: './split-summary-panel.component.scss',
  templateUrl: './split-summary-panel.component.html',
})
export class SplitSummaryPanelComponent {
  paid: InputSignal<Money> = input.required<Money>();
  toPay: InputSignal<Money> = input.required<Money>();
  activeRow: InputSignal<SplitSummaryRow | null> = input<SplitSummaryRow | null>(null);
  locale: InputSignal<string> = input<string>('en-US');
  toPayLabelKey: InputSignal<string> = input<string>('checkout.split.summary.toPayEqually');
  paidClick: OutputEmitterRef<void> = output<void>();
  toPayClick: OutputEmitterRef<void> = output<void>();

  protected readonly toPayActive: Signal<boolean> = computed(() => this.activeRow() !== 'paid');
  protected readonly paidActive: Signal<boolean> = computed(() => this.activeRow() === 'paid');
  protected readonly toPayClickable: Signal<boolean> = computed(() => this.activeRow() === 'paid');
  protected readonly paidClickable: Signal<boolean> = computed(() => this.activeRow() === 'toPay');
  protected readonly toPayChevron: Signal<SplitSummaryChevron | null> = computed(() => this.#chevronFor('toPay'));
  protected readonly paidChevron: Signal<SplitSummaryChevron | null> = computed(() => this.#chevronFor('paid'));

  protected onPaidActivate(): void {
    if (this.paidClickable()) {
      this.paidClick.emit();
    }
  }

  protected onToPayActivate(): void {
    if (this.toPayClickable()) {
      this.toPayClick.emit();
    }
  }

  #chevronFor(row: SplitSummaryRow): SplitSummaryChevron | null {
    const active = this.activeRow();
    if (active === null) {
      return null;
    }
    return active === row ? 'chevron-right' : 'chevron-down';
  }
}
