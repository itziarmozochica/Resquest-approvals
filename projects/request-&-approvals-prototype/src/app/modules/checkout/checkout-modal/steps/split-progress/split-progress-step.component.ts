import { ChangeDetectionStrategy, Component, computed, inject, type Signal } from '@angular/core';

import { TimelineItemContentDirective } from '@fz-original/app/shared/components/timeline/directives/timeline-item-content.directive';
import { TimelineComponent } from '@fz-original/app/shared/components/timeline/timeline.component';
import { IgntIconComponent } from '@ignite/icon';
import { TranslateModule, TranslateService } from '@ngx-translate/core';

import { SplitSummaryPanelComponent } from '../../components/split-summary-panel/split-summary-panel.component';
import type { CheckoutTransactionItem, CheckoutTransactionTimelineItem } from '../../models/transaction-history.model';
import { CheckoutStore } from '../../store/checkout.store';
import { buildCheckoutTransactionTimelineItems, buildPlaceholderCheckoutTransactions } from '../../utils/checkout-transaction-history.util';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IgntIconComponent, SplitSummaryPanelComponent, TimelineComponent, TimelineItemContentDirective, TranslateModule],
  selector: 'app-split-progress-step',
  standalone: true,
  styleUrl: './split-progress-step.component.scss',
  templateUrl: './split-progress-step.component.html',
})
export class SplitProgressStepComponent {
  protected readonly store = inject(CheckoutStore);
  readonly #translate = inject(TranslateService);

  protected readonly transactions: Signal<CheckoutTransactionItem[]> = computed(() =>
    buildPlaceholderCheckoutTransactions(
      this.store.context(),
      (key, params) => this.#translate.instant(key, params),
      this.store.currentSplitAmount(),
    ),
  );

  protected readonly timelineItems: Signal<CheckoutTransactionTimelineItem[]> = computed(() =>
    buildCheckoutTransactionTimelineItems(
      this.transactions(),
      (key, params) => this.#translate.instant(key, params),
      this.store.context().locale,
    ),
  );

  protected onReturnToPaymentProcess(): void {
    this.store.returnToPaymentProcess();
  }
}
