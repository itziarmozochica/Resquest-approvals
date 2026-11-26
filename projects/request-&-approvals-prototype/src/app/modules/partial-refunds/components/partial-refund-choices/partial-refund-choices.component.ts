import { CurrencyPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, input, LOCALE_ID, type Signal } from '@angular/core';

import { TranslateModule, TranslateService } from '@ngx-translate/core';

import { partialRefundModes, type PartialRefundMode } from '../../models/partial-refund-mode.model';
import type { PartialRefundReason } from '../../models/partial-refund-reason.model';

/**
 * The answers that produced the amounts, restated before anything is sent. What was selected is
 * the host's to phrase, since a bulk run and a single order describe their tickets differently.
 */
@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [TranslateModule],
  selector: 'app-partial-refund-choices',
  styleUrl: './partial-refund-choices.component.scss',
  templateUrl: './partial-refund-choices.component.html',
})
export class PartialRefundChoicesComponent {
  /** Every currency the engine answered in, which is what a fixed amount is formatted in. */
  readonly currencies = input.required<readonly string[]>();
  readonly includeSurcharge = input.required<boolean | null>();
  readonly mode = input.required<PartialRefundMode | null>();
  readonly reason = input.required<PartialRefundReason | null>();
  readonly selectionLabel = input.required<string>();
  readonly value = input.required<number | null>();

  readonly #locale = inject(LOCALE_ID);
  readonly #currency = new CurrencyPipe(this.#locale);
  readonly #translateService = inject(TranslateService);

  protected readonly baseLabel: Signal<string> = computed(() =>
    this.#translateService.instant(
      this.includeSurcharge() === true
        ? 'orders.bulkPartialRefunds.reviewConfirm.choices.baseWithFees'
        : 'orders.bulkPartialRefunds.reviewConfirm.choices.baseTicketPrice',
    ),
  );

  protected readonly reasonLabel: Signal<string> = computed(() => {
    const reason = this.reason();
    return reason === null ? '—' : this.#translateService.instant(`common.refundReasons.${reason}`);
  });

  protected readonly refundLabel: Signal<string> = computed(() => {
    const value = this.value();
    if (value === null) {
      return '—';
    }

    if (this.mode() === partialRefundModes.PERCENTAGE) {
      return this.#translateService.instant('orders.bulkPartialRefunds.reviewConfirm.choices.refundPercentage', { value });
    }

    // A fixed amount carries no currency, so the engine applies the same number in each order's own.
    // Naming only the first currency would restate a multi-currency refund as one sum of euros.
    const currencies = this.currencies();
    const amounts = currencies.length === 0 ? String(value) : currencies.map(currency => this.#money(value, currency)).join(', ');

    return this.#translateService.instant('orders.bulkPartialRefunds.reviewConfirm.choices.refundFixedAmount', {
      value: amounts,
    });
  });

  /**
   * A percentage is stated as one; a fixed amount is money, so it is formatted in the currency the
   * engine answered in rather than shown as a bare number.
   */
  #money(amount: number, currency: string): string {
    return this.#currency.transform(amount, currency, 'symbol-narrow', undefined, this.#locale) ?? String(amount);
  }
}
