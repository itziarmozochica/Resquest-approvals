import { CurrencyPipe } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  ElementRef,
  inject,
  input,
  LOCALE_ID,
  output,
  signal,
  type OnInit,
  type Signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl, ReactiveFormsModule, Validators, type ValidatorFn } from '@angular/forms';

import { IgntTypeaheadModule } from '@fz-original/app/shared/layout/filters/ignt-typeahead/ignt-typeahead.module';
import type { SelectOption } from '@fz-original/app/shared/layout/filters/select/select.interface';
import type { TypeaheadEvent } from '@fz-original/app/shared/layout/filters/typeahead/typeahead-event.model';
import { IgntAlertComponent, IgntOptionTileComponent } from '@ignite/common';
import { IgntInputFieldComponent } from '@ignite/legacy/components/ignt-input-field/ignt-input-field.component';
import type { IngtFormError } from '@ignite/legacy/models/ignt-input.model';
import { TranslateModule, TranslateService } from '@ngx-translate/core';

import { partialRefundModes, type PartialRefundMode } from '../../models/partial-refund-mode.model';
import type { PartialRefundPreview } from '../../models/partial-refund-preview.model';
import { partialRefundReasonOrder, type PartialRefundReason } from '../../models/partial-refund-reason.model';
import type { RequestState } from '../../models/request-state.model';

/**
 * Zero is rejected along with the negatives: a refund of nothing is not a refund. Only a percentage
 * has a ceiling, because a fixed amount above what a ticket has left is legitimate and the engine
 * caps it per ticket, which the summary then reports.
 */
function valueValidatorsFor(mode: PartialRefundMode | null): ValidatorFn[] {
  const aboveZero = Validators.min(0.01);
  return mode === partialRefundModes.PERCENTAGE ? [aboveZero, Validators.max(100)] : [aboveZero];
}

/**
 * The three questions a partial refund asks — how much, calculated on what, and why — with no store
 * behind them: answers arrive as inputs and leave as outputs, so the bulk wizard and the single-order
 * flow can each keep their own state.
 */
@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    IgntAlertComponent,
    IgntInputFieldComponent,
    IgntOptionTileComponent,
    IgntTypeaheadModule,
    ReactiveFormsModule,
    TranslateModule,
  ],
  selector: 'app-partial-refund-definition-form',
  styleUrl: './partial-refund-definition-form.component.scss',
  templateUrl: './partial-refund-definition-form.component.html',
})
export class PartialRefundDefinitionFormComponent implements OnInit {
  readonly isSurchargeIncluded = input.required<boolean | null>();
  readonly mode = input.required<PartialRefundMode | null>();
  readonly preview = input.required<RequestState<PartialRefundPreview>>();
  /** Both describe the request the figures came back from, never the one being typed. */
  readonly previewedAmount = input.required<number | null>();
  readonly previewedRate = input.required<number | null>();
  readonly reason = input.required<PartialRefundReason | null>();
  readonly value = input.required<number | null>();

  readonly isSurchargeIncludedChange = output<boolean>();
  readonly modeChange = output<PartialRefundMode>();
  readonly reasonChange = output<PartialRefundReason | null>();
  /** The accepted value, or null when the field is empty or out of bounds. */
  readonly valueChange = output<number | null>();

  readonly #elementRef = inject<ElementRef<HTMLElement>>(ElementRef);
  readonly #locale = inject(LOCALE_ID);
  readonly #currency = new CurrencyPipe(this.#locale);
  readonly #translateService = inject(TranslateService);
  readonly #isInDialog = signal(false);

  protected readonly isInDialog: Signal<boolean> = this.#isInDialog.asReadonly();

  protected readonly modes = partialRefundModes;

  protected readonly modeIcons: Readonly<Record<PartialRefundMode, string>> = {
    [partialRefundModes.FIXED_AMOUNT]: 'money-bill',
    [partialRefundModes.PERCENTAGE]: 'chart-pie',
  };

  protected readonly baseIcons = {
    ticketPriceOnly: 'ticket-alt',
    withFees: 'receipt',
  } as const;

  protected readonly reasonOptions: SelectOption[] = partialRefundReasonOrder.map(reason => ({
    id: reason,
    title: String(this.#translateService.instant(`common.refundReasons.${reason}`)),
  }));

  protected readonly selectedReasonOption: Signal<SelectOption | undefined> = computed(() =>
    this.reasonOptions.find(option => option.id === this.reason()),
  );

  protected readonly valueLabelKey: Signal<string> = computed(() => {
    switch (this.mode()) {
      case partialRefundModes.PERCENTAGE:
        return 'orders.bulkPartialRefunds.defineRefund.howMuch.percentageLabel';
      case partialRefundModes.FIXED_AMOUNT:
        return 'orders.bulkPartialRefunds.defineRefund.howMuch.fixedAmountLabel';
      default:
        return 'orders.bulkPartialRefunds.defineRefund.howMuch.pendingLabel';
    }
  });

  /** Keyed by the validator that failed, so the message names the bound the agent crossed. */
  protected readonly valueErrors: Signal<IngtFormError[]> = computed(() =>
    this.mode() === partialRefundModes.PERCENTAGE
      ? [
          { message: this.#translateService.instant('orders.bulkPartialRefunds.defineRefund.howMuch.percentageAboveZero'), type: 'min' },
          { message: this.#translateService.instant('orders.bulkPartialRefunds.defineRefund.howMuch.percentageAtMost'), type: 'max' },
        ]
      : [{ message: this.#translateService.instant('orders.bulkPartialRefunds.defineRefund.howMuch.amountAboveZero'), type: 'min' }],
  );

  /**
   * The engine's own figures restated in words, never recomputed, and never mixed with an input the
   * engine has not answered for yet: the rate comes from the request that produced these amounts, so
   * the sentence cannot read "20% of each ticket" beside the amounts 10% returned while the next
   * request is still in flight. A row is a bucket of tickets sharing a type, a price and an amount
   * already refunded, so one row can be quoted exactly while several only support the rule plus the
   * span across them.
   */
  protected readonly workedExample: Signal<string | null> = computed(() => {
    const sections = this.preview().data?.sections ?? [];
    const rows = sections[0]?.rows ?? [];
    // One sentence cannot span two currencies, and quoting the first would misdescribe the rest.
    if (rows.length === 0 || sections.length > 1) {
      return null;
    }

    // Only a percentage has a rate, so its absence is what marks the answered request as fixed-amount.
    const rate = this.previewedRate();
    const currency = rows[0].currency;
    const perTicket = rows.map(row => row.refundAmountPerTicket);

    if (rows.length === 1) {
      return this.#translateService.instant(
        rate === null
          ? 'orders.bulkPartialRefunds.defineRefund.howMuch.examples.fixedAmountSingle'
          : 'orders.bulkPartialRefunds.defineRefund.howMuch.examples.percentageSingle',
        {
          base: this.#money(rows[0].refundableBasePerTicket, currency),
          perTicket: this.#money(perTicket[0], currency),
          rate,
          ticketType: rows[0].ticketTypeLabel,
        },
      );
    }

    const min = Math.min(...perTicket);
    const max = Math.max(...perTicket);

    // Several buckets can still settle on one amount, which is what a fixed amount does whenever
    // every ticket has more than it left, so this is the ordinary case and not an edge one. Quoting
    // it as a span reads as a broken range rather than as one rate applying throughout.
    if (min === max) {
      return this.#translateService.instant(
        rate === null
          ? 'orders.bulkPartialRefunds.defineRefund.howMuch.examples.fixedAmountFlat'
          : 'orders.bulkPartialRefunds.defineRefund.howMuch.examples.percentageFlat',
        { perTicket: this.#money(min, currency), rate },
      );
    }

    return this.#translateService.instant(
      rate === null
        ? 'orders.bulkPartialRefunds.defineRefund.howMuch.examples.fixedAmountRange'
        : 'orders.bulkPartialRefunds.defineRefund.howMuch.examples.percentageRange',
      {
        max: this.#money(max, currency),
        min: this.#money(min, currency),
        rate,
      },
    );
  });

  /**
   * A fixed amount carries no currency: fever2's `RefundAmount` holds a bare decimal, and the engine
   * applies that same number in each order's own currency. Across currencies "50" therefore means
   * EUR 50 on one ticket and JPY 50 on another, which is not the same instruction and is nowhere
   * near the same money. Until the contract can carry a currency the figures are at least named, so
   * nobody confirms a per-ticket amount they did not intend. Quoted per currency off the answered
   * request, so it cannot disagree with the summary beside it.
   */
  protected readonly multiCurrencyAmountWarning: Signal<string | null> = computed(() => {
    const amount = this.previewedAmount();
    const currencies = [...new Set((this.preview().data?.sections ?? []).map(section => section.currency))];
    if (amount === null || currencies.length < 2) {
      return null;
    }

    return this.#translateService.instant('orders.bulkPartialRefunds.defineRefund.howMuch.multiCurrencyAmount', {
      amounts: currencies.map(currency => `${this.#money(amount, currency)} (${currency})`).join(', '),
    });
  });

  /**
   * Created empty and seeded in `ngOnInit`, because inputs cannot be read before then. The host is
   * destroyed on navigation and seeds them again from its own state, which is what makes Back lossless.
   * Later changes to `reason` or `value` never reach the controls, so a host that resets or swaps the
   * answers in place has to recreate the form instead. Only the value validators follow `mode`.
   */
  protected readonly reasonControl = new FormControl<PartialRefundReason | null>(null, Validators.required);
  protected readonly valueControl = new FormControl<number | null>(null);

  constructor() {
    this.reasonControl.valueChanges.pipe(takeUntilDestroyed()).subscribe(reason => this.reasonChange.emit(reason));

    /**
     * A number outside the bounds leaves as nothing at all, so the engine is never asked about it,
     * the summary falls back to empty and Continue stays shut. An empty field is not an error, only
     * an unanswered question, so it clears the figures without turning the field red.
     */
    this.valueControl.valueChanges.pipe(takeUntilDestroyed()).subscribe(() => this.valueChange.emit(this.#acceptedValue()));

    /**
     * The ceiling follows the mode the host holds, so the field never judges a number by a mode the
     * host did not take. Neither change emits, so a revalidation never reads as a new answer.
     */
    effect(() => {
      const mode = this.mode();
      this.valueControl.setValidators(valueValidatorsFor(mode));
      if (mode === null) {
        this.valueControl.disable({ emitEvent: false });
      } else {
        this.valueControl.enable({ emitEvent: false });
      }
      this.valueControl.updateValueAndValidity({ emitEvent: false });
    });
  }

  ngOnInit(): void {
    this.reasonControl.setValue(this.reason(), { emitEvent: false });
    this.valueControl.setValue(this.value(), { emitEvent: false });
    this.#isInDialog.set(this.#elementRef.nativeElement.closest('.cdk-overlay-pane') !== null);
  }

  /**
   * The reason is asked for once the agent has been in the field and left it empty, which is the
   * feedback `field-select` gives for the same case. `Continue` disabling itself says something is
   * missing but never which, and this is the only answer on the step whose absence is silent: the
   * two above it are tile groups, visibly unanswered, where this one just sits on a placeholder.
   */
  protected isReasonMissing(): boolean {
    return this.reasonControl.touched && this.reasonControl.hasError('required');
  }

  protected onBaseChange(isSurchargeIncluded: boolean): void {
    if (this.isSurchargeIncluded() === isSurchargeIncluded) {
      return;
    }

    this.isSurchargeIncludedChange.emit(isSurchargeIncluded);
  }

  /**
   * Switching mode clears the value: 33 means a third of each ticket as a percentage and 33 of the
   * currency as a fixed amount, so carrying it over would silently change what the agent asked for.
   * The reset drives `valueChanges`, which emits the cleared value.
   */
  protected onModeChange(mode: PartialRefundMode): void {
    if (this.mode() === mode) {
      return;
    }

    this.modeChange.emit(mode);
    this.valueControl.reset(null);
  }

  protected onReasonInteraction(interaction: TypeaheadEvent): void {
    if (interaction.event instanceof FocusEvent) {
      this.reasonControl.markAsTouched();
    }
  }

  protected onReasonSelected(option: SelectOption): void {
    const reason = partialRefundReasonOrder.find(candidate => candidate === option.id) ?? null;
    this.reasonControl.markAsTouched();
    this.reasonControl.setValue(reason);
  }

  #acceptedValue(): number | null {
    const value = this.valueControl.value;
    return this.valueControl.invalid || value === null || Number.isNaN(value) ? null : Number(value);
  }

  #money(amount: number, currency: string): string {
    return this.#currency.transform(amount, currency, 'symbol-narrow', undefined, this.#locale) ?? String(amount);
  }
}
