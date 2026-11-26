import { CurrencyPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, input, OnInit, output } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormControl, NonNullableFormBuilder, ReactiveFormsModule } from '@angular/forms';

import { IgntButtonComponent } from '@ignite/common';
import { IgntFieldErrorComponent } from '@ignite/legacy/components/ignt-field-error/ignt-field-error.component';
import { IgntInputFieldComponent } from '@ignite/legacy/components/ignt-input-field/ignt-input-field.component';
import { IgntListItemComponent } from '@ignite/legacy/components/ignt-list-item/ignt-list-item.component';
import { IgntRadioComponent } from '@ignite/legacy/components/ignt-radio/ignt-radio.component';
import { IgntTextareaFieldComponent } from '@ignite/legacy/components/ignt-textarea-field/ignt-textarea-field.component';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { map } from 'rxjs/operators';

import { IgntTypeaheadModule } from '../../../layout/filters/ignt-typeahead/ignt-typeahead.module';
import { SelectOption } from '../../../layout/filters/select/select.interface';
import {
  CartSessionManualPrice,
  CartSessionManualPriceChange,
  CartSessionManualPriceDraft,
  ManualPriceEntryErrors,
} from '../../../models/cart/cart-session-manual-price.model';
import { Money } from '../../../models/money.model';
import {
  computeManualUnitPrice,
  getLineTotal,
  hasManualPriceEntryErrors,
  parseManualPriceAmount,
  validateManualPriceDraft,
} from '../../../utils/cart-manual-price.util';
import { CartAdjustmentPriceCalculation, CartAdjustmentPriceOperation } from '../../models/cart-adjustment-price.model';

/**
 * Inline editor of the manual price of one cart line (GAME-1722): a fixed amount per ticket or a percentage, reduced or added,
 * and a mandatory reason. It only computes and validates; the parent applies the entry to the cart.
 */
@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CurrencyPipe,
    IgntButtonComponent,
    IgntFieldErrorComponent,
    IgntInputFieldComponent,
    IgntListItemComponent,
    IgntRadioComponent,
    IgntTextareaFieldComponent,
    IgntTypeaheadModule,
    ReactiveFormsModule,
    TranslateModule,
  ],
  selector: 'app-cart-line-price-editor',
  styleUrl: './cart-line-price-editor.component.scss',
  templateUrl: './cart-line-price-editor.component.html',
})
export class CartLinePriceEditorComponent implements OnInit {
  readonly #formBuilder = inject(NonNullableFormBuilder);
  readonly #translate = inject(TranslateService);

  /** Emitted with the validated entry and the trimmed reason when the staff member applies the price. */
  readonly applied = output<CartSessionManualPriceChange>();
  /** True while the cart update is in flight: Apply waits for it. */
  readonly busy = input(false);
  readonly cancelled = output<void>();
  readonly catalogUnitPrice = input.required<Money>();
  /** Left out, the amounts follow the app's `LOCALE_ID`, as the currency pipe does. */
  readonly locale = input<string | undefined>(undefined);
  /** The price already set on the line: the editor reopens from its entry and reason. */
  readonly manualPrice = input<CartSessionManualPrice | null>(null);
  /** Why the backend refused the last change, as a translation key. */
  readonly refusal = input<string | null>(null);
  readonly surchargePerTicket = input<Money | null>(null);
  /** A change sent and not confirmed yet (in flight or refused): the editor reopens from it, not from the price on the line. */
  readonly unconfirmedChange = input<CartSessionManualPriceChange | null>(null);
  readonly units = input.required<number>();

  protected readonly calculations = CartAdjustmentPriceCalculation;
  protected readonly operations = CartAdjustmentPriceOperation;
  protected readonly form = this.#formBuilder.group({
    amount: new FormControl<number | string | null>(null),
    calculation: this.#formBuilder.control(CartAdjustmentPriceCalculation.FIXED),
    concept: this.#formBuilder.control(''),
    operation: this.#formBuilder.control(CartAdjustmentPriceOperation.SUBTRACT),
  });
  /** Reduce or Add, in the dropdown the order adjustment editor uses too. */
  protected readonly operationOptions: SelectOption[] = [
    { id: CartAdjustmentPriceOperation.SUBTRACT, title: this.#translate.instant('cart.adjustment.reduce') },
    { id: CartAdjustmentPriceOperation.ADD, title: this.#translate.instant('cart.adjustment.increase') },
  ];
  readonly #draft = toSignal(this.form.valueChanges.pipe(map((): CartSessionManualPriceDraft => this.#readDraft())), {
    initialValue: this.#readDraft(),
  });
  protected readonly errors = computed((): ManualPriceEntryErrors => validateManualPriceDraft(this.catalogUnitPrice(), this.#draft()));
  protected readonly isApplyDisabled = computed(() => this.busy() || hasManualPriceEntryErrors(this.errors()));
  protected readonly isPercentage = computed(() => this.#draft().calculation === CartAdjustmentPriceCalculation.PERCENTAGE);
  protected readonly isReduction = computed(() => this.#draft().operation === CartAdjustmentPriceOperation.SUBTRACT);
  protected readonly selectedOperation = computed(
    (): SelectOption =>
      this.operationOptions.find((option: SelectOption) => option.id === this.#draft().operation) ?? this.operationOptions[0],
  );
  protected readonly currentTotal = computed(() => getLineTotal(this.catalogUnitPrice(), this.surchargePerTicket(), this.units()));
  /** An estimate: the backend recomputes a percentage booking fee on the new price once the price is applied. */
  protected readonly newTotal = computed((): Money | null => {
    const { amount, calculation, operation } = this.#draft();
    if (amount === null || this.errors().amount !== null) {
      return null;
    }
    const unitPrice = computeManualUnitPrice(this.catalogUnitPrice(), { amount, calculation, operation });
    return getLineTotal(unitPrice, this.surchargePerTicket(), this.units());
  });

  ngOnInit(): void {
    const manualPrice = this.manualPrice();
    const change =
      this.unconfirmedChange() ?? (manualPrice?.entry != null ? { concept: manualPrice.concept, entry: manualPrice.entry } : null);
    if (change === null) {
      return;
    }
    this.form.setValue({
      amount: change.entry.amount,
      calculation: change.entry.calculation,
      concept: change.concept,
      operation: change.entry.operation,
    });
  }

  protected selectCalculation(calculation: CartAdjustmentPriceCalculation): void {
    this.form.controls.calculation.setValue(calculation);
  }

  protected selectOperation(option: SelectOption): void {
    const operation = Object.values(CartAdjustmentPriceOperation).find((value: string) => value === option.id);
    if (operation !== undefined) {
      this.form.controls.operation.setValue(operation);
    }
  }

  protected apply(): void {
    const { amount, calculation, concept, operation } = this.#readDraft();
    if (this.isApplyDisabled() || amount === null) {
      this.form.markAllAsTouched();
      return;
    }
    this.applied.emit({ concept: concept.trim(), entry: { amount, calculation, operation } });
  }

  #readDraft(): CartSessionManualPriceDraft {
    const { amount, ...rest } = this.form.getRawValue();
    return { ...rest, amount: parseManualPriceAmount(amount) };
  }
}
