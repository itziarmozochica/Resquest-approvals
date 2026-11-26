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
import { IgntCheckboxComponent } from '@ignite/legacy/components/ignt-checkbox/ignt-checkbox.component';
import { TranslateModule } from '@ngx-translate/core';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CurrencyPipe, IgntCheckboxComponent, TranslateModule],
  selector: 'app-payment-summary-panel',
  standalone: true,
  styleUrl: './payment-summary-panel.component.scss',
  templateUrl: './payment-summary-panel.component.html',
})
export class PaymentSummaryPanelComponent {
  amountToPay: InputSignal<Money> = input.required<Money>();
  currentSplitNumber: InputSignal<number> = input.required<number>();
  splitCount: InputSignal<number> = input.required<number>();
  total: InputSignal<Money> = input.required<Money>();
  locale: InputSignal<string> = input<string>('en-US');
  paymentMethodLabel: InputSignal<string | null> = input<string | null>(null);
  paymentMethodLabelSuffixKey: InputSignal<string | null> = input<string | null>(null);
  payRemaining: InputSignal<boolean> = input<boolean>(false);
  showPaymentMethod: InputSignal<boolean> = input<boolean>(true);
  showPayRemaining: InputSignal<boolean> = input<boolean>(false);
  payRemainingChange: OutputEmitterRef<boolean> = output<boolean>();

  protected readonly hasKnownSplitCount: Signal<boolean> = computed(() => this.splitCount() > 0);
}
