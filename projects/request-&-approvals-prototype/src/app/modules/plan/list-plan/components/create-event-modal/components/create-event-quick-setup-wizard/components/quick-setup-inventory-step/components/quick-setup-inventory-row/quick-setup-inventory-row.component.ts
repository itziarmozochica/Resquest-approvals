import { CdkDragHandle } from '@angular/cdk/drag-drop';
import { getCurrencySymbol } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, DestroyRef, inject, input, LOCALE_ID, output, signal } from '@angular/core';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { FormControl, ReactiveFormsModule } from '@angular/forms';

import { RICH_TEXT_EDITOR_INLINE_LINK_LISTS_ALIGN_FEATURES } from '@fz-original/app/shared/components/rich-text-editor/rich-text-editor-features.const';
import { IgntTypeaheadModule } from '@fz-original/app/shared/layout/filters/ignt-typeahead/ignt-typeahead.module';
import { MultiSelectModule } from '@fz-original/app/shared/layout/filters/multi-select/multi-select.module';
import { SelectOption } from '@fz-original/app/shared/layout/filters/select/select.interface';
import { TypeaheadEvent } from '@fz-original/app/shared/layout/filters/typeahead/typeahead-event.model';
import { SessionTypeSelectionRule } from '@fz-original/app/shared/services/sessions/session-type.model';
import { IgntTooltipDirective } from '@ignite/common';
import { IgntIconComponent } from '@ignite/icon';
import { IgntFieldErrorComponent } from '@ignite/legacy/components/ignt-field-error/ignt-field-error.component';
import { IgntIconButtonComponent } from '@ignite/legacy/components/ignt-icon-button/ignt-icon-button.component';
import { IgntInputFieldComponent } from '@ignite/legacy/components/ignt-input-field/ignt-input-field.component';
import { IgntLinkComponent } from '@ignite/legacy/components/ignt-link/ignt-link.component';
import { IgntRichTextEditorComponent } from '@ignite/rich-text-editor';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { merge, Subject } from 'rxjs';
import { map, startWith, switchMap } from 'rxjs/operators';

import { QuickSetupInventoryItemForm } from '../../../../../../models/quick-setup-inventory.model';
import { ticketsAllowedRangeValidator } from '../../quick-setup-inventory-step.validators';
import { QUICK_SETUP_NO_RULE_OPTION_ID } from '../../utils/map-quick-setup-inventory-item.util';
import { ticketsAllowedErrorKeyFor } from '../../utils/tickets-allowed-error-key.util';
import { QuickSetupInventoryRowKind } from './quick-setup-inventory-row-kind.enum';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CdkDragHandle,
    IgntFieldErrorComponent,
    IgntIconButtonComponent,
    IgntIconComponent,
    IgntInputFieldComponent,
    IgntLinkComponent,
    IgntRichTextEditorComponent,
    IgntTooltipDirective,
    IgntTypeaheadModule,
    MultiSelectModule,
    ReactiveFormsModule,
    TranslateModule,
  ],
  selector: 'app-quick-setup-inventory-row',
  styleUrl: './quick-setup-inventory-row.component.scss',
  templateUrl: './quick-setup-inventory-row.component.html',
})
export class QuickSetupInventoryRowComponent {
  static readonly tierPriceFieldNames = ['valleyPrice', 'normalPrice', 'peakPrice'] as const;

  readonly #destroyRef = inject(DestroyRef);
  readonly #locale = inject(LOCALE_ID);
  readonly #translateService = inject(TranslateService);
  readonly #productTypeClean = new Subject<void>();
  readonly #selectionRuleClean = new Subject<void>();
  readonly #isOptionsExpanded = signal(false);
  readonly #selectionRuleResets = signal(0);
  readonly #language = toSignal(this.#translateService.onLangChange.pipe(map(event => event.lang)), {
    initialValue: this.#translateService.currentLang,
  });

  readonly index = input.required<number>();
  readonly kind = input.required<QuickSetupInventoryRowKind>();
  readonly row = input.required<QuickSetupInventoryItemForm>();
  readonly canDelete = input(true);
  readonly currency = input<string | null>(null);
  readonly isDraggable = input(false);
  readonly isPricesByTier = input(false);
  readonly neededSessionTypeOptions = input<SelectOption[]>([]);
  readonly productTypeOptions = input<SelectOption[]>([]);
  readonly deleted = output<void>();

  protected readonly fieldIdPrefix = computed(() => `create-event-quick-setup-${this.kind()}`);
  protected readonly instructionsEditorFeatures = RICH_TEXT_EDITOR_INLINE_LINK_LISTS_ALIGN_FEATURES;
  protected readonly isOptionsExpanded = this.#isOptionsExpanded.asReadonly();
  protected readonly isTicket = computed(() => this.kind() === QuickSetupInventoryRowKind.Ticket);
  protected readonly productTypeClean$ = this.#productTypeClean.asObservable();
  protected readonly selectionRuleClean$ = this.#selectionRuleClean.asObservable();
  protected readonly selectionRuleOptions = computed<SelectOption[]>(() => {
    this.#language();

    return [
      {
        id: QUICK_SETUP_NO_RULE_OPTION_ID,
        title: this.#translateService.instant('createEvent.quickSetupWizard.step2.noRules'),
      },
      ...(this.isTicket()
        ? [
            {
              id: SessionTypeSelectionRule.required,
              title: this.#translateService.instant('createEvent.quickSetupWizard.step2.ruleRequired'),
            },
          ]
        : []),
      {
        id: SessionTypeSelectionRule.needsSessionType,
        title: this.#translateService.instant('createEvent.quickSetupWizard.step2.ruleNeedsSessionType'),
      },
    ];
  });
  readonly #rowState = toSignal(
    toObservable(this.row).pipe(
      switchMap(row =>
        merge(row.events, ...QuickSetupInventoryRowComponent.tierPriceFieldNames.map(fieldName => row.controls[fieldName].events)).pipe(
          startWith(null),
          map(() => ({
            hasTierPriceInteraction: QuickSetupInventoryRowComponent.tierPriceFieldNames.some(
              fieldName => row.controls[fieldName].dirty || row.controls[fieldName].touched,
            ),
            hasTierPricesInsufficient: row.errors?.['tierPricesInsufficient'] === true,
            isNeededTicketMissing:
              row.errors?.['neededSessionTypeRequired'] === true &&
              (row.controls.neededSessionTypes.touched || row.controls.selectionRule.touched),
            isProductTypeMissing: row.controls.productType.touched && row.controls.productType.hasError('required'),
            ticketsAllowedErrorKey: ticketsAllowedErrorKeyFor(row),
            value: row.getRawValue(),
          })),
        ),
      ),
    ),
  );
  protected readonly priceLabels = computed(() => {
    this.#language();
    const currency = this.currency()?.trim() ?? '';
    const symbol = currency.length > 0 ? getCurrencySymbol(currency, 'narrow', this.#locale).trim() : '';
    const label = (key: string): string => {
      const text = this.#translateService.instant(key);

      return symbol.length > 0
        ? this.#translateService.instant('createEvent.quickSetupWizard.step2.labelWithCurrency', { label: text, symbol })
        : text;
    };

    return {
      normalPrice: label('createEvent.quickSetupWizard.step2.normalLabel'),
      peakPrice: label('createEvent.quickSetupWizard.step2.peakLabel'),
      price: label('createEvent.quickSetupWizard.step2.pricePlaceholder'),
      valleyPrice: label('createEvent.quickSetupWizard.step2.valleyLabel'),
    };
  });

  protected readonly deleteLabelParams = computed(() => ({ name: this.#rowState()?.value.name ?? '' }));
  protected readonly hasTierPricesInsufficientError = computed(() => {
    const state = this.#rowState();

    return state !== undefined && state.hasTierPricesInsufficient && state.hasTierPriceInteraction;
  });
  protected readonly isNeededTicketMissing = computed(() => this.#rowState()?.isNeededTicketMissing === true);
  protected readonly isProductTypeMissing = computed(() => this.#rowState()?.isProductTypeMissing === true);
  protected readonly nameErrorParams = computed(() => ({ value: this.#rowState()?.value.name ?? '' }));
  protected readonly ticketsAllowedErrorKey = computed(() => this.#rowState()?.ticketsAllowedErrorKey ?? null);
  protected readonly isNeedsSessionTypeSelected = computed(
    () => this.#rowState()?.value.selectionRule === SessionTypeSelectionRule.needsSessionType,
  );
  protected readonly selectedNeededSessionTypeOptions = computed(() => {
    const neededSessionTypes = this.#rowState()?.value.neededSessionTypes ?? [];

    return this.neededSessionTypeOptions().filter(option => neededSessionTypes.includes(String(option.id)));
  });
  protected readonly neededSessionTypesSummary = computed(() => {
    this.#language();

    return this.#translateService.instant('createEvent.quickSetupWizard.step2.neededTicketsSelected', {
      count: this.selectedNeededSessionTypeOptions().length,
    });
  });
  protected readonly productTypeOption = computed(() => {
    const productType = this.#rowState()?.value.productType;

    if (!productType) {
      return undefined;
    }

    return this.productTypeOptions().find(option => option.id === productType);
  });
  protected readonly selectionRuleOption = computed(() => {
    const selectionRule = this.#rowState()?.value.selectionRule;

    if (selectionRule == null || selectionRule.length === 0) {
      return undefined;
    }

    const option = this.selectionRuleOptions().find(ruleOption => ruleOption.id === selectionRule);

    return option !== undefined && this.#selectionRuleResets() > 0 ? { ...option } : option;
  });

  constructor() {
    this.#destroyRef.onDestroy(() => {
      this.#productTypeClean.complete();
      this.#selectionRuleClean.complete();
    });
  }

  protected onNeededSessionTypesSelected(options: Pick<SelectOption, 'id'>[]): void {
    const row = this.row();

    row.controls.neededSessionTypes.setValue(options.map(option => String(option.id)));
    row.controls.neededSessionTypes.markAsTouched();
    row.updateValueAndValidity();
  }

  protected onProductTypeBlurred(event: TypeaheadEvent): void {
    this.#clearOnFreeText(event, this.row().controls.productType, '', this.#productTypeClean);
  }

  protected onProductTypeSelected(option: SelectOption | undefined): void {
    const productType = this.row().controls.productType;

    productType.setValue(option?.id != null ? String(option.id) : '');
    productType.markAsTouched();
    productType.updateValueAndValidity();
  }

  protected onSelectionRuleBlurred(event: TypeaheadEvent): void {
    const row = this.row();

    this.#clearOnFreeText(event, row.controls.selectionRule, QUICK_SETUP_NO_RULE_OPTION_ID, this.#selectionRuleClean, () => {
      row.controls.neededSessionTypes.setValue([]);
      row.updateValueAndValidity();
      this.#selectionRuleResets.update(resets => resets + 1);
    });
  }

  protected onSelectionRuleSelected(option: SelectOption | undefined): void {
    const row = this.row();
    const selectionRule = option?.id != null ? String(option.id) : QUICK_SETUP_NO_RULE_OPTION_ID;

    row.controls.selectionRule.setValue(selectionRule);

    if (selectionRule !== SessionTypeSelectionRule.needsSessionType) {
      row.controls.neededSessionTypes.setValue([]);
    }

    row.controls.selectionRule.markAsTouched();
    row.updateValueAndValidity();
  }

  protected toggleOptions(): void {
    const isCollapsing = this.#isOptionsExpanded();

    this.#isOptionsExpanded.set(!isCollapsing);

    if (isCollapsing) {
      this.#clearInvalidTicketsAllowedRange();
    }
  }

  #clearInvalidTicketsAllowedRange(): void {
    const row = this.row();

    if (ticketsAllowedRangeValidator()(row) === null) {
      return;
    }

    row.patchValue({
      maxToSell: null,
      minToSell: null,
    });
  }

  #clearOnFreeText<T>(event: TypeaheadEvent, control: FormControl<T>, clearValue: T, clean: Subject<void>, afterClear?: () => void): void {
    if (typeof event.selectedOption !== 'string') {
      return;
    }

    control.setValue(clearValue);
    control.markAsTouched();
    control.updateValueAndValidity();
    clean.next();
    afterClear?.();
  }
}
