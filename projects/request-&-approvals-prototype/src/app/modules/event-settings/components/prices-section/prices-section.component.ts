import { NgIf } from '@angular/common';
import { ChangeDetectionStrategy, Component, forwardRef, inject, Input, OnChanges, SimpleChanges } from '@angular/core';
import { ControlValueAccessor, FormControl, FormGroup, NG_VALUE_ACCESSOR, ReactiveFormsModule } from '@angular/forms';

import { FeverOnlyMarkerComponent } from '@fz-original/app/shared/components/fever-only-marker/fever-only-marker.component';
import { UserService } from '@fz-original/app/shared/services/user/user.service';
import { IgntRadioGroupComponent } from '@ignite/legacy/components/ignt-radio/ignt-radio-group.component';
import { IgntRadioComponent } from '@ignite/legacy/components/ignt-radio/ignt-radio.component';
import { IgntWrapperCardComponent } from '@ignite/legacy/components/ignt-wrapper-card/ignt-wrapper-card.component';
import { TranslateModule } from '@ngx-translate/core';

import { PricesSectionConfig } from '../../models/settings-configs.model';
import { isSuperuserOnlyField as isSuperuserOnlyFieldUtil } from '../../utils/is-superuser-only-field.util';

interface PricesData {
  priceList: boolean;
  taxCalculation: boolean;
}

@Component({
  selector: 'app-prices-section',
  templateUrl: './prices-section.component.html',
  styleUrls: ['./prices-section.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: true,
  imports: [
    FeverOnlyMarkerComponent,
    IgntRadioComponent,
    IgntRadioGroupComponent,
    IgntWrapperCardComponent,
    NgIf,
    ReactiveFormsModule,
    TranslateModule,
  ],
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => PricesSectionComponent),
      multi: true,
    },
  ],
})
export class PricesSectionComponent implements ControlValueAccessor, OnChanges {
  #isFormGloballyDisabled = false;
  #onChange: (value: PricesData) => void = () => {};
  #onTouched: () => void = () => {};
  readonly #userService = inject(UserService);

  get canEditPriceList(): boolean {
    return this.config?.priceList.editable ?? true;
  }
  get canEditTaxCalculation(): boolean {
    return this.config?.taxCalculation.editable ?? true;
  }

  get canViewPriceList(): boolean {
    return this.config?.priceList.visible ?? true;
  }

  get canViewTaxCalculation(): boolean {
    return this.config?.taxCalculation.visible ?? true;
  }

  @Input() config: PricesSectionConfig | null = null;

  pricesForm = new FormGroup({
    taxCalculation: new FormControl<boolean>(false),
    priceList: new FormControl<boolean>(false),
  });

  constructor() {
    this.pricesForm.valueChanges.subscribe(() => {
      const rawValue = this.pricesForm.getRawValue();
      const valueToEmit: Partial<PricesData> = {};
      if (this.canViewTaxCalculation && rawValue.taxCalculation !== null) {
        valueToEmit.taxCalculation = rawValue.taxCalculation;
      }
      if (this.canViewPriceList && rawValue.priceList !== null) {
        valueToEmit.priceList = rawValue.priceList;
      }
      if (this.canViewTaxCalculation || this.canViewPriceList) {
        this.#onChange(valueToEmit as PricesData);
        this.#onTouched();
      }
    });
  }

  isSuperuserOnlyField(fieldConfig: Parameters<typeof isSuperuserOnlyFieldUtil>[0], isEditableInUi = true): boolean {
    return isSuperuserOnlyFieldUtil(fieldConfig, this.#userService.getUser()?.isStaff() ?? false, isEditableInUi);
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['config']) {
      if (!this.#isFormGloballyDisabled) {
        this.#updateFieldStates();
      }
    }
  }

  registerOnChange(fn: (value: PricesData) => void): void {
    this.#onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.#onTouched = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    this.#isFormGloballyDisabled = isDisabled;
    if (isDisabled) {
      this.pricesForm.disable({ emitEvent: false });
    } else {
      this.pricesForm.enable({ emitEvent: false });
      this.#updateFieldStates();
    }
  }

  writeValue(value: PricesData): void {
    if (value != null) {
      this.pricesForm.patchValue(value, { emitEvent: false });
      if (!this.#isFormGloballyDisabled) {
        this.#updateFieldStates();
      }
    }
  }

  #updateFieldStates(): void {
    if (!this.canEditTaxCalculation) {
      this.pricesForm.get('taxCalculation')?.disable({ emitEvent: false });
    } else {
      this.pricesForm.get('taxCalculation')?.enable({ emitEvent: false });
    }
    if (!this.canEditPriceList) {
      this.pricesForm.get('priceList')?.disable({ emitEvent: false });
    } else {
      this.pricesForm.get('priceList')?.enable({ emitEvent: false });
    }
  }
}
