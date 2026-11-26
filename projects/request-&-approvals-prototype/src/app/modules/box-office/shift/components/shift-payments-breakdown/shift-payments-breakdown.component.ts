import { CurrencyPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

import { TranslateModule } from '@ngx-translate/core';

import { Money } from '../../../../../shared/models/money.model';
import { OrderPaymentMethodLabelPipe } from '../../../../../shared/pipes/order-payment-method-label/order-payment-method-label.pipe';
import { PaymentMethodSummary } from '../../../shared/models/shifts.model';
import {
  splitTillPaymentMethodSummaries,
  sumPaymentMethodSummaries,
  TillPaymentMethodSummaries,
} from '../../utils/payment-method-summaries-totals';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CurrencyPipe, OrderPaymentMethodLabelPipe, TranslateModule],
  selector: 'app-shift-payments-breakdown',
  styleUrl: './shift-payments-breakdown.component.scss',
  templateUrl: './shift-payments-breakdown.component.html',
})
export class ShiftPaymentsBreakdownComponent {
  readonly currency = input.required<string>();
  readonly paymentSummaries = input.required<ReadonlyArray<PaymentMethodSummary>>();

  protected readonly summaries = computed<TillPaymentMethodSummaries>(() => splitTillPaymentMethodSummaries(this.paymentSummaries()));
  protected readonly total = computed<Money>(() => sumPaymentMethodSummaries(this.summaries().till, this.currency()).total);
}
