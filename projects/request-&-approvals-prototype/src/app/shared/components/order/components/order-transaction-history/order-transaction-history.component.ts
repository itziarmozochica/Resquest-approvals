import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';

import { TimelineItemContentDirective } from '@fz-original/app/shared/components/timeline/directives/timeline-item-content.directive';
import { TimelineA11yLabels } from '@fz-original/app/shared/components/timeline/models/timeline-item.model';
import { TimelineComponent } from '@fz-original/app/shared/components/timeline/timeline.component';
import { OrderTransaction } from '@fz-original/app/shared/models/order/order-transaction.model';
import { orderTransactionTimelineItems } from '@fz-original/app/shared/utils/payment-method-display/order-transaction-timeline.util';
import { translationRevisionSignal } from '@fz-original/app/shared/utils/translation-revision.signal.util';
import { TranslateModule, TranslateService } from '@ngx-translate/core';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [TimelineComponent, TimelineItemContentDirective, TranslateModule],
  selector: 'app-order-transaction-history',
  styleUrl: './order-transaction-history.component.scss',
  templateUrl: './order-transaction-history.component.html',
})
export class OrderTransactionHistoryComponent {
  readonly #translate = inject(TranslateService);
  readonly #translationRevision = translationRevisionSignal(this.#translate);

  readonly timezone = input<string | null>(null);
  readonly transactions = input<readonly OrderTransaction[]>([]);

  protected readonly a11yLabels = computed<TimelineA11yLabels>(() => {
    this.#translationRevision();
    return {
      collapseDetails: this.#translate.instant('validateTicketsNew.ticketHistory.collapse'),
      details: this.#translate.instant('validateTicketsNew.orderDetail.transactionHistory.title'),
      expandDetails: this.#translate.instant('validateTicketsNew.ticketHistory.expand'),
    };
  });
  protected readonly items = computed(() => {
    this.#translationRevision();
    return orderTransactionTimelineItems(this.#translate, this.transactions(), this.#translate.currentLang ?? 'en-US', this.timezone());
  });
}
