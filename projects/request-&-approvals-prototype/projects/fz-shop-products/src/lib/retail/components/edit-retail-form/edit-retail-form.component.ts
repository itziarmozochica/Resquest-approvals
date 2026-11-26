import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';

import { IgntTypeaheadModule } from '@fz-original/app/shared/layout/filters/ignt-typeahead/ignt-typeahead.module';
import type { SelectOption } from '@fz-original/app/shared/layout/filters/select/select.interface';
import { IGNT_DIALOG_DATA, IGNT_DIALOG_REF, IgntButtonComponent, IgntDialogModule } from '@ignite/common';
import { IgntInputFieldComponent } from '@ignite/legacy/components/ignt-input-field/ignt-input-field.component';
import { IgntToggleComponent } from '@ignite/legacy/components/ignt-toggle/ignt-toggle.component';
import { TranslateModule, TranslateService } from '@ngx-translate/core';

import type { RetailCurrencyCode } from '../../../core/models/retail-currency.model';
import type { RetailEditDialogData } from '../../models/dialog/retail-edit-dialog.model';
import type { EditRetailFormControls } from '../../models/form/edit-retail-form.model';
import { retailTextValidators } from '../../utils/form-utils/retail-validatiors.util';

const NONE_CURRENCY_OPTION_ID = 'none';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '[attr.data-testid]': '"edit-retail-sheet"',
  },
  imports: [
    IgntButtonComponent,
    IgntDialogModule,
    IgntInputFieldComponent,
    IgntToggleComponent,
    IgntTypeaheadModule,
    ReactiveFormsModule,
    TranslateModule,
  ],
  selector: 'fz-edit-retail-form',
  standalone: true,
  styleUrl: './edit-retail-form.component.scss',
  templateUrl: './edit-retail-form.component.html',
})
export class EditRetailFormComponent {
  readonly #dialogData = inject<RetailEditDialogData>(IGNT_DIALOG_DATA);
  readonly #dialogRef = inject(IGNT_DIALOG_REF);
  readonly #translate = inject(TranslateService);

  protected readonly showOverriddenExternalCurrency = this.#dialogData.currencySelectOptions.length > 0;
  protected readonly currencySelectOptions: SelectOption[] = this.showOverriddenExternalCurrency
    ? [
        {
          id: NONE_CURRENCY_OPTION_ID,
          title: String(this.#translate.instant('retailSetup.editIntegrationForm.overriddenExternalCurrencyNone')),
        },
        ...this.#dialogData.currencySelectOptions.map(
          (code: RetailCurrencyCode): SelectOption => ({
            id: code,
            title: code,
          }),
        ),
      ]
    : [];

  protected readonly form = new FormGroup<EditRetailFormControls>({
    isAvailableUnitsTrackingEnabled: new FormControl<boolean>(this.#dialogData.isAvailableUnitsTrackingEnabled, {
      nonNullable: true,
    }),
    isSyncEnabled: new FormControl<boolean>(this.#dialogData.isSyncEnabled, {
      nonNullable: true,
    }),
    overriddenExternalCurrency: new FormControl<string>(this.#dialogData.overriddenExternalCurrency, {
      nonNullable: true,
    }),
    retailName: new FormControl<string>(this.#dialogData.retailName, {
      nonNullable: true,
      validators: retailTextValidators,
    }),
  });

  readonly #overriddenExternalCurrency = toSignal(this.form.controls.overriddenExternalCurrency.valueChanges, {
    initialValue: this.form.controls.overriddenExternalCurrency.value,
  });

  protected readonly selectedCurrencyOption = computed((): SelectOption | undefined => {
    const value = this.#overriddenExternalCurrency();
    const optionId = value === '' ? NONE_CURRENCY_OPTION_ID : value;
    return this.currencySelectOptions.find(option => option.id === optionId);
  });

  protected onClose(): void {
    this.form.patchValue({
      isAvailableUnitsTrackingEnabled: this.#dialogData.isAvailableUnitsTrackingEnabled,
      isSyncEnabled: this.#dialogData.isSyncEnabled,
      overriddenExternalCurrency: this.#dialogData.overriddenExternalCurrency,
      retailName: this.#dialogData.retailName,
    });
    this.#dialogRef.close();
  }

  protected onCurrencySelected(option: SelectOption): void {
    const currency = option.id === NONE_CURRENCY_OPTION_ID ? '' : String(option.id);
    this.form.controls.overriddenExternalCurrency.setValue(currency);
  }

  protected onIsAvailableUnitsTrackingEnabledChange(event: Event): void {
    this.form.controls.isAvailableUnitsTrackingEnabled.setValue((event.target as HTMLInputElement).checked);
  }

  protected onIsSyncEnabledChange(event: Event): void {
    this.form.controls.isSyncEnabled.setValue((event.target as HTMLInputElement).checked);
  }

  protected onSave(): void {
    if (!this.form.valid) {
      return;
    }
    const rawValue = this.form.getRawValue();
    this.#dialogRef.close({
      isAvailableUnitsTrackingEnabled: rawValue.isAvailableUnitsTrackingEnabled,
      isSyncEnabled: rawValue.isSyncEnabled,
      overriddenExternalCurrency: rawValue.overriddenExternalCurrency,
      retailName: rawValue.retailName,
      retailSetupId: this.#dialogData.retailSetupId,
      type: 'save',
    });
  }
}
