import { CurrencyPipe, DecimalPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, input, type Signal } from '@angular/core';

import { TranslateModule } from '@ngx-translate/core';

import type { PartialRefundPreviewSection } from '../../models/partial-refund-preview.model';
import { ScrollShadowComponent } from '../scroll-shadow/scroll-shadow.component';

/**
 * One currency's worth of the engine's arithmetic, ticket type by ticket type, with the section's
 * totals underneath. Read-only, and it recomputes nothing.
 */
@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CurrencyPipe, DecimalPipe, ScrollShadowComponent, TranslateModule],
  selector: 'app-partial-refund-rows-table',
  styleUrl: './partial-refund-rows-table.component.scss',
  templateUrl: './partial-refund-rows-table.component.html',
})
export class PartialRefundRowsTableComponent {
  /** What the answered preview was worked out from, never what is being typed. */
  readonly includeSurcharge = input.required<boolean | null>();
  readonly section = input.required<PartialRefundPreviewSection>();
  /** One row per ticket, so the count and per-ticket refund columns would only repeat the row. */
  readonly perTicket = input(false);

  /**
   * The column holds the refundable base, which is the ticket price alone or the ticket price plus
   * the service fee depending on what the answered preview was worked out from. Naming it "Ticket
   * price" in both cases would misreport the second.
   */
  protected readonly baseColumnLabel: Signal<string> = computed(() =>
    this.includeSurcharge() === true
      ? 'orders.bulkPartialRefunds.reviewConfirm.table.ticketPriceAndFees'
      : 'orders.bulkPartialRefunds.reviewConfirm.table.ticketPrice',
  );

  /** With no per-ticket figure beside it, the refund is just the refund, not a total of anything. */
  protected readonly refundColumnLabel: Signal<string> = computed(() =>
    this.perTicket() ? 'orders.partialRefund.review.table.refund' : 'orders.bulkPartialRefunds.reviewConfirm.table.refundTotal',
  );

  /** Per ticket, a column of zeros adds nothing; grouped rows keep it, as their note does not carry the amount. */
  protected readonly showAlreadyRefunded: Signal<boolean> = computed(
    () => !this.perTicket() || this.section().rows.some(row => row.alreadyRefundedAmount > 0),
  );
}
