import { CurrencyPipe, DecimalPipe, NgTemplateOutlet } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, input, type Signal } from '@angular/core';

import { IgntAlertComponent } from '@ignite/common';
import { IgntSkeletonBaseComponent } from '@ignite/legacy/components/ignt-skeleton/ignt-skeleton-base/ignt-skeleton-base.component';
import { TranslateModule } from '@ngx-translate/core';

import type { PartialRefundPreview } from '../../models/partial-refund-preview.model';
import type { RequestState } from '../../models/request-state.model';
import { cappedTicketCount, excludedOrderCount, excludedTicketCount } from '../../utils/classify-rejections.util';

/**
 * Dumb panel over the preview the engine returned. Amounts arrive as decimal strings and are
 * rendered as they came: FeverZone never recomputes a figure the engine is going to refund.
 */
@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CurrencyPipe, DecimalPipe, IgntAlertComponent, IgntSkeletonBaseComponent, NgTemplateOutlet, TranslateModule],
  selector: 'app-refund-summary-panel',
  styleUrl: './refund-summary-panel.component.scss',
  templateUrl: './refund-summary-panel.component.html',
})
export class RefundSummaryPanelComponent {
  readonly preview = input.required<RequestState<PartialRefundPreview>>();
  /**
   * Both describe the request the figures came back from, never the one being typed: the base names
   * what the total is a total of, the rate what the result was worked out at.
   */
  readonly includeSurcharge = input<boolean | null>(null);
  readonly rate = input<number | null>(null);
  /** Interpolated with `tickets` and `orders`; a host that covers a single order words it without the latter. */
  readonly skippedNoteKey = input<string>('orders.bulkPartialRefunds.defineRefund.summary.skipped');

  protected readonly baseTotalLabel: Signal<string> = computed(() =>
    this.includeSurcharge() === true
      ? 'orders.bulkPartialRefunds.defineRefund.summary.ticketPriceAndFeesTotal'
      : 'orders.bulkPartialRefunds.defineRefund.summary.ticketPriceTotal',
  );

  /**
   * Capped and skipped are different outcomes and get separate notices: a capped ticket still
   * returns what it has left, a skipped one returns nothing. Reporting them together would
   * misstate what the agent is about to do. The per-code breakdown belongs on the review step.
   */
  protected readonly cappedTickets: Signal<number> = computed(() => cappedTicketCount(this.preview().data?.sections ?? []));

  protected readonly skippedOrders: Signal<number> = computed(() =>
    excludedOrderCount(this.preview().data?.rejections ?? [], this.preview().data?.rejectedOrders ?? []),
  );

  protected readonly skippedTickets: Signal<number> = computed(() =>
    excludedTicketCount(this.preview().data?.rejections ?? [], this.preview().data?.rejectedOrders ?? []),
  );
}
