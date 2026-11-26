import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';

import { MultiSelectModule } from '@fz-original/app/shared/layout/filters/multi-select/multi-select.module';
import type { SelectOption } from '@fz-original/app/shared/layout/filters/select/select.interface';
import { IGNT_DIALOG_DATA, IGNT_DIALOG_REF, IgntDialogModule, type IgntDialogRef } from '@ignite/common';
import { IgntButtonComponent } from '@ignite/legacy/components/ignt-button/ignt-button.component';
import { TranslateModule } from '@ngx-translate/core';
import { map, startWith } from 'rxjs';

import type {
  ProductVariationsFilterPanelData,
  ProductVariationsFilterResult,
} from '../../../models/dialog/product-variation/product-variation-filter-dialog.model';
import type { ProductVariationsFilterFormControls } from '../../../models/form/product-variation/product-variations-filter-form.model';
import type {
  MultiSelectFilterControl,
  ProductVariationsMultiSelectFilterField,
} from '../../../models/product-variations/multi-select-filter.model';
import { selectedOptionsFromIds, warehousesToOptions } from '../../../utils/product-variations/multi-select-filter.utils';
import { FzRetailColumnVisibilityComponent } from './column-visibility/fz-retail-column-visibility.component';

const RETAIL_PRODUCT_VARIATIONS_FILTERS_I18N = 'retailSetup.productVariations.filters' as const;

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    IgntButtonComponent,
    IgntDialogModule,
    MultiSelectModule,
    ReactiveFormsModule,
    TranslateModule,
    FzRetailColumnVisibilityComponent,
  ],
  selector: 'fz-retail-product-variations-table-filter-content',
  standalone: true,
  templateUrl: './product-variations-table-filter-content.component.html',
})
export class ProductVariationsTableFilterContentComponent {
  readonly #dialogData = inject<ProductVariationsFilterPanelData>(IGNT_DIALOG_DATA);
  readonly #dialogRef = inject<IgntDialogRef<ProductVariationsFilterResult | undefined>>(IGNT_DIALOG_REF);

  protected readonly filterForm = new FormGroup<ProductVariationsFilterFormControls>({
    showExternalId: new FormControl<boolean>(this.#dialogData.selection.showExternalId, { nonNullable: true }),
    warehouse: new FormControl<string[]>(this.#dialogData.selection.warehouse, { nonNullable: true }),
  });

  readonly #warehouseOptions = signal(warehousesToOptions(this.#dialogData.warehouses));

  readonly #filterFormValue = toSignal(
    this.filterForm.valueChanges.pipe(
      map(() => this.filterForm.getRawValue()),
      startWith(this.filterForm.getRawValue()),
    ),
    { initialValue: this.filterForm.getRawValue() },
  );

  protected readonly multiSelectFields = computed<ProductVariationsMultiSelectFilterField[]>(() => {
    const value = this.#filterFormValue();
    const warehouseOpts = this.#warehouseOptions();
    return [
      {
        filterName: 'warehouse',
        label: `${RETAIL_PRODUCT_VARIATIONS_FILTERS_I18N}.warehouseLabel`,
        options: warehouseOpts,
        searchPlaceholder: `${RETAIL_PRODUCT_VARIATIONS_FILTERS_I18N}.warehouseLabelPlaceholder`,
        selected: selectedOptionsFromIds(warehouseOpts, value.warehouse),
        testId: 'product-variations-warehouse-filter',
      },
    ];
  });

  protected applyFilter(): void {
    this.#dialogRef.close({ selection: this.filterForm.getRawValue() });
  }

  protected clearFilters(): void {
    this.filterForm.reset({ showExternalId: false, warehouse: [] });
    this.#dialogRef.close({ selection: this.filterForm.getRawValue() });
  }

  protected onMultiSelectSelection(filterName: MultiSelectFilterControl, selected: SelectOption[]): void {
    this.filterForm.get(filterName)?.setValue(selected.map(option => String(option.id)));
  }
}
