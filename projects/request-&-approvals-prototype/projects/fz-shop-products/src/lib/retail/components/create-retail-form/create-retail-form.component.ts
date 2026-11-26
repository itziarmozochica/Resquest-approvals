import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  input,
  output,
  Signal,
  signal,
  untracked,
  WritableSignal,
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormGroup, NonNullableFormBuilder, ReactiveFormsModule } from '@angular/forms';

import { IgntTypeaheadModule } from '@fz-original/app/shared/layout/filters/ignt-typeahead/ignt-typeahead.module';
import type { SelectOption } from '@fz-original/app/shared/layout/filters/select/select.interface';
import type { TypeaheadEvent } from '@fz-original/app/shared/layout/filters/typeahead/typeahead-event.model';
import { IgntAlertComponent } from '@ignite/common';
import { IgntButtonComponent } from '@ignite/legacy/components/ignt-button/ignt-button.component';
import { IgntIconButtonComponent } from '@ignite/legacy/components/ignt-icon-button/ignt-icon-button.component';
import { IgntInputFieldComponent } from '@ignite/legacy/components/ignt-input-field/ignt-input-field.component';
import { IgntWrapperCardComponent } from '@ignite/legacy/components/ignt-wrapper-card/ignt-wrapper-card.component';
import { TranslateModule, TranslateService } from '@ngx-translate/core';

import { catalogCurrencyCodes, type CatalogCurrencyCode } from '../../../core/models/catalog-currency.model';
import { getRetailCurrencyOptions, retailCurrencyDictionary, type RetailCurrencyCode } from '../../../core/models/retail-currency.model';
import type { RetailSetupType } from '../../../core/models/retail-setup-type.model';
import {
  noneSquareAccountCurrencyOptionId,
  type CreateRetailFormControls,
  type WarehouseFormControls,
} from '../../models/form/create-retail-form.model';
import type { RetailSetupAccount } from '../../models/retail-setup/retail-setup-account.model';
import type { RetailSetupCreate } from '../../models/retail-setup/retail-setup.model';
import { retailGuideUrls } from '../../models/retail-type.model';
import { mapCreateRetailFormToSetup, type CreateRetailWarehouse } from '../../utils/form-utils/map-create-retail-form-to-setup.util';
import {
  markFormGroupAsInvalid,
  retailCompanyIdValidators,
  retailCurrencyValidators,
  retailTextValidators,
} from '../../utils/form-utils/retail-validatiors.util';
import { SquareAccountCurrencyFieldComponent } from './square-account-currency-field/square-account-currency-field.component';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    IgntAlertComponent,
    IgntButtonComponent,
    IgntIconButtonComponent,
    IgntInputFieldComponent,
    IgntTypeaheadModule,
    IgntWrapperCardComponent,
    ReactiveFormsModule,
    SquareAccountCurrencyFieldComponent,
    TranslateModule,
  ],
  selector: 'fz-create-retail-form',
  standalone: true,
  styleUrl: './create-retail-form.component.scss',
  templateUrl: './create-retail-form.component.html',
})
export class CreateRetailFormComponent {
  readonly #formBuilder = inject(NonNullableFormBuilder);
  readonly #translate = inject(TranslateService);

  protected readonly translationBase = signal('retailSetup.createRetailForm');

  readonly error = input<unknown>(null);
  readonly isLoading = input<boolean>(false);
  readonly retailSetupAccounts = input<readonly RetailSetupAccount[]>([]);
  readonly selectedRetailOptionType = input<RetailSetupType | null>(null);

  readonly cancelCreation = output();
  readonly createRetail = output<RetailSetupCreate>();

  readonly createRetailForm: FormGroup<CreateRetailFormControls> = this.#formBuilder.group({
    accountId: this.#formBuilder.control(
      { value: '', disabled: true },
      {
        validators: retailTextValidators,
      },
    ),
    companyId: this.#formBuilder.control(
      { value: '', disabled: true },
      {
        validators: retailCompanyIdValidators,
      },
    ),
    currency: this.#formBuilder.control('', {
      validators: retailCurrencyValidators,
    }),
    integrationName: this.#formBuilder.control('', {
      validators: retailTextValidators,
    }),
    masterCatalogId: this.#formBuilder.control('', {
      validators: retailTextValidators,
    }),
    squareAccountCurrency: this.#formBuilder.control(''),
  });
  readonly warehouseForm: FormGroup<WarehouseFormControls> = this.#formBuilder.group({
    externalId: this.#formBuilder.control('', {
      validators: retailTextValidators,
    }),
    warehouseName: this.#formBuilder.control('', {
      validators: retailTextValidators,
    }),
  });
  readonly warehouses: WritableSignal<readonly CreateRetailWarehouse[]> = signal<readonly CreateRetailWarehouse[]>([]);

  readonly #accountId = toSignal(this.createRetailForm.controls.accountId.valueChanges, {
    initialValue: this.createRetailForm.controls.accountId.value,
  });

  readonly #accountIdEvents = toSignal(this.createRetailForm.controls.accountId.events);

  readonly #createRetailFormStatus = toSignal(this.createRetailForm.statusChanges, {
    initialValue: this.createRetailForm.status,
  });

  readonly #currency = toSignal(this.createRetailForm.controls.currency.valueChanges, {
    initialValue: this.createRetailForm.controls.currency.value,
  });

  readonly #currencyEvents = toSignal(this.createRetailForm.controls.currency.events);

  readonly #squareAccountCurrency = toSignal(this.createRetailForm.controls.squareAccountCurrency.valueChanges, {
    initialValue: this.createRetailForm.controls.squareAccountCurrency.value,
  });

  protected readonly currencySelectOptions: SelectOption[] = catalogCurrencyCodes.map(
    (code: CatalogCurrencyCode): SelectOption => ({
      id: code,
      title: code,
    }),
  );

  protected readonly selectedCurrencyOption = computed((): SelectOption | undefined => {
    const currency = this.#currency();
    return this.currencySelectOptions.find(option => option.id === currency);
  });

  protected readonly showCurrencyError = computed(() => {
    this.#currencyEvents();

    const currencyControl = this.createRetailForm.controls.currency;
    return currencyControl.touched && currencyControl.invalid;
  });

  protected readonly squareAccountCurrencyCodes = computed((): readonly RetailCurrencyCode[] =>
    getRetailCurrencyOptions(retailCurrencyDictionary, this.selectedRetailOptionType() ?? ''),
  );

  protected readonly showSquareAccountCurrency = computed((): boolean => this.squareAccountCurrencyCodes().length > 0);

  protected readonly squareAccountCurrencySelectOptions = computed((): SelectOption[] => [
    {
      id: noneSquareAccountCurrencyOptionId,
      title: String(this.#translate.instant(`${this.translationBase()}.integrationDetails.squareAccountCurrency.none`)),
    },
    ...this.squareAccountCurrencyCodes().map(
      (code: RetailCurrencyCode): SelectOption => ({
        id: code,
        title: code,
      }),
    ),
  ]);

  protected readonly selectedSquareAccountCurrencyOption = computed((): SelectOption | undefined => {
    const selectedOptionId = this.#squareAccountCurrency();
    return this.squareAccountCurrencySelectOptions().find(option => option.id === selectedOptionId);
  });

  protected readonly isOdooType = computed(() => this.selectedRetailOptionType() === 'odoo');

  protected readonly accountSelectOptions = computed((): SelectOption[] =>
    this.retailSetupAccounts().map(account => ({
      id: account.id,
      title: account.label,
    })),
  );

  protected readonly selectedAccountOption = computed((): SelectOption | undefined => {
    const accountId = this.#accountId();
    return this.accountSelectOptions().find(option => option.id === accountId);
  });

  protected readonly showAccountError = computed(() => {
    this.#accountIdEvents();

    if (!this.isOdooType()) {
      return false;
    }

    const accountIdControl = this.createRetailForm.controls.accountId;
    return accountIdControl.touched && accountIdControl.invalid;
  });

  constructor() {
    effect(() => {
      const isOdooType = this.isOdooType();

      untracked(() => {
        const masterCatalogIdControl = this.createRetailForm.controls.masterCatalogId;
        const accountIdControl = this.createRetailForm.controls.accountId;
        const companyIdControl = this.createRetailForm.controls.companyId;

        if (isOdooType) {
          masterCatalogIdControl.disable({ emitEvent: false });
          accountIdControl.enable({ emitEvent: false });
          companyIdControl.enable({ emitEvent: false });
        } else {
          masterCatalogIdControl.enable({ emitEvent: false });
          accountIdControl.disable({ emitEvent: false });
          companyIdControl.disable({ emitEvent: false });
        }
      });
    });

    effect(() => {
      this.selectedRetailOptionType();

      untracked(() => {
        const squareAccountCurrencyControl = this.createRetailForm.controls.squareAccountCurrency;
        squareAccountCurrencyControl.setValue('');
        squareAccountCurrencyControl.markAsUntouched();
      });
    });

    effect(() => {
      const isOdooType = this.isOdooType();
      const accounts = this.retailSetupAccounts();

      untracked(() => {
        if (!isOdooType) {
          return;
        }

        if (accounts.length === 1) {
          this.createRetailForm.controls.accountId.setValue(accounts[0].id);
        }
      });
    });
  }

  onAccountSelected(option: SelectOption): void {
    this.createRetailForm.controls.accountId.setValue(String(option.id));
    this.createRetailForm.controls.accountId.markAsTouched();
  }

  onAccountTypeaheadInteraction(event: TypeaheadEvent): void {
    if (event.event instanceof FocusEvent) {
      this.createRetailForm.controls.accountId.markAsTouched();
    }
  }

  onAddWarehouse(): void {
    if (this.warehouseForm.invalid) {
      this.#markWharehouseFormAsInvalid();
      return;
    }
    this.warehouses.update(list => [
      ...list,
      { externalId: this.warehouseForm.controls.externalId.value, name: this.warehouseForm.controls.warehouseName.value },
    ]);
    this.warehouseForm.reset({}, { emitEvent: false });

    if (this.isOdooType() && this.createRetailForm.controls.accountId.invalid) {
      this.createRetailForm.controls.accountId.markAsTouched();
    }
  }

  onCancel(): void {
    this.cancelCreation.emit();
  }

  onCreate(): void {
    if (this.isLoading()) {
      return;
    }

    if (this.createRetailForm.invalid || this.warehouses().length === 0) {
      this.createRetailForm.markAllAsTouched();
      return;
    }

    const type = this.selectedRetailOptionType();
    if (type === null) {
      return;
    }

    this.createRetail.emit(mapCreateRetailFormToSetup(this.createRetailForm.getRawValue(), this.warehouses(), type));
  }

  readonly isCreateDisabled: Signal<boolean> = computed<boolean>(() => {
    this.#createRetailFormStatus();
    const hasWarehouses = this.warehouses().length > 0;
    return this.createRetailForm.invalid || !hasWarehouses || this.isLoading();
  });

  readonly catalogGuideUrl = computed((): string | null => {
    const type = this.selectedRetailOptionType();
    return type === null ? null : retailGuideUrls[type];
  });

  onCurrencySelected(option: SelectOption): void {
    this.createRetailForm.controls.currency.setValue(String(option.id));
    this.createRetailForm.controls.currency.markAsTouched();
  }

  onCurrencyTypeaheadInteraction(event: TypeaheadEvent): void {
    if (event.event instanceof FocusEvent) {
      this.createRetailForm.controls.currency.markAsTouched();
    }
  }

  onRemoveWarehouse(warehouseIndex: number): void {
    this.warehouses.update(list => list.filter((_item, index) => index !== warehouseIndex));
  }

  onSquareAccountCurrencySelected(option: SelectOption): void {
    this.createRetailForm.controls.squareAccountCurrency.setValue(String(option.id));
  }

  #markWharehouseFormAsInvalid(): void {
    markFormGroupAsInvalid(this.warehouseForm);
  }
}
