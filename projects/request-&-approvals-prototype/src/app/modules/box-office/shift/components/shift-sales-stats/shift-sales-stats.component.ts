import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

import { TranslateModule } from '@ngx-translate/core';

import { PaymentMethodSummary } from '../../../shared/models/shifts.model';
import { ShiftTicketCounts, sumShiftTicketCounts } from '../../utils/payment-method-summaries-totals';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [TranslateModule],
  selector: 'app-shift-sales-stats',
  styleUrl: './shift-sales-stats.component.scss',
  templateUrl: './shift-sales-stats.component.html',
})
export class ShiftSalesStatsComponent {
  readonly paymentSummaries = input.required<ReadonlyArray<PaymentMethodSummary>>();

  protected readonly totals = computed<ShiftTicketCounts>(() => sumShiftTicketCounts(this.paymentSummaries()));
}
