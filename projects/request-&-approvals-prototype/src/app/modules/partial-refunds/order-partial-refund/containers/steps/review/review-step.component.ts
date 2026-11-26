import { CurrencyPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, LOCALE_ID, type Signal } from '@angular/core';

import { IgntAlertComponent } from '@ignite/common';
import { TranslateModule, TranslateService } from '@ngx-translate/core';

import { PartialRefundChoicesComponent } from '../../../../components/partial-refund-choices/partial-refund-choices.component';
import { PartialRefundRowsTableComponent } from '../../../../components/partial-refund-rows-table/partial-refund-rows-table.component';
import { ScrollShadowComponent } from '../../../../components/scroll-shadow/scroll-shadow.component';
import { ScrollShadowAxis } from '../../../../models/scroll-shadow-axis.model';
import {
  orderPartialRefundRejectionLabelKey,
  type OrderPartialRefundRejectionView,
} from '../../../models/order-partial-refund-rejection.model';
import { OrderPartialRefundStore } from '../../../store/order-partial-refund.store';

/** The last look before the money moves: the answers restated and the engine's figures, ticket by ticket. */
@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IgntAlertComponent, PartialRefundChoicesComponent, PartialRefundRowsTableComponent, ScrollShadowComponent, TranslateModule],
  selector: 'app-order-partial-refund-review-step',
  styleUrl: './review-step.component.scss',
  templateUrl: './review-step.component.html',
})
export class ReviewStepComponent {
  readonly #store = inject(OrderPartialRefundStore);

  protected readonly scrollShadowAxes = ScrollShadowAxis;

  protected readonly includeSurcharge = this.#store.includeSurcharge;
  protected readonly includesPriorRefund = this.#store.includesPriorRefund;
  protected readonly isReviewPerTicket = this.#store.isReviewPerTicket;
  protected readonly mode = this.#store.mode;
  protected readonly preview = this.#store.preview;
  protected readonly previewedIncludeSurcharge = this.#store.previewedIncludeSurcharge;
  protected readonly reason = this.#store.reason;
  protected readonly reviewSection = this.#store.reviewSection;
  protected readonly selectedTicketCount = this.#store.selectedTicketCount;
  protected readonly value = this.#store.value;

  readonly #locale = inject(LOCALE_ID);
  readonly #currency = new CurrencyPipe(this.#locale);
  readonly #translateService = inject(TranslateService);

  /** A fixed amount is restated in the currency the engine answered in. */
  protected readonly currencies: Signal<readonly string[]> = computed(() => [
    ...new Set((this.#store.preview().data?.sections ?? []).map(section => section.currency)),
  ]);

  /** One sentence per code the engine refused; on a single order a refusal covers the whole selection. */
  protected readonly rejections: Signal<readonly OrderPartialRefundRejectionView[]> = computed(() =>
    (this.#store.preview().data?.rejections ?? []).map(rejection => ({
      code: rejection.code,
      reason: this.#translateService.instant(orderPartialRefundRejectionLabelKey(rejection.code)),
    })),
  );

  protected readonly totalLabel: Signal<string> = computed(() => {
    const total = this.#store.refundTotal();
    return total === null
      ? '—'
      : (this.#currency.transform(total.amount, total.currency, 'symbol-narrow', undefined, this.#locale) ?? String(total.amount));
  });
}
