import { ChangeDetectionStrategy, Component, forwardRef, Input, OnChanges, SimpleChanges } from '@angular/core';
import { ControlValueAccessor, FormControl, FormGroup, NG_VALUE_ACCESSOR, ReactiveFormsModule } from '@angular/forms';

import { IgntRadioGroupComponent } from '@ignite/legacy/components/ignt-radio/ignt-radio-group.component';
import { IgntRadioComponent } from '@ignite/legacy/components/ignt-radio/ignt-radio.component';
import { IgntWrapperCardComponent } from '@ignite/legacy/components/ignt-wrapper-card/ignt-wrapper-card.component';
import { TranslateModule } from '@ngx-translate/core';

import { ValidationSectionConfig } from '../../models/settings-configs.model';
import { ValidationMethod, ValidationWindow } from '../../models/validation-section.enum';

export interface ValidationSectionData {
  validationMethod: ValidationMethod;
  validationWindow: ValidationWindow;
}

@Component({
  selector: 'app-validation-section',
  templateUrl: './validation-section.component.html',
  styleUrls: ['./validation-section.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: true,
  imports: [IgntRadioComponent, IgntRadioGroupComponent, IgntWrapperCardComponent, ReactiveFormsModule, TranslateModule],
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => ValidationSectionComponent),
      multi: true,
    },
  ],
})
export class ValidationSectionComponent implements ControlValueAccessor, OnChanges {
  #isFormGloballyDisabled = false;
  #onChange: (value: ValidationSectionData) => void = () => {};
  #onTouched: () => void = () => {};

  @Input() config: ValidationSectionConfig | null = null;

  get allowedValidationMethods(): ValidationMethod[] {
    return this.config?.validationMethod.allowed ?? [];
  }

  get canDisplayValidationWindow(): boolean {
    return this.canViewValidationWindow && this.validationForm.controls.validationMethod.value !== ValidationMethod.NO_VALIDATION;
  }

  get canEditValidationMethod(): boolean {
    return this.config?.validationMethod.editable ?? true;
  }

  get canEditValidationWindow(): boolean {
    return this.config?.validationWindow.editable ?? true;
  }

  get canViewValidationMethod(): boolean {
    return this.config?.validationMethod.visible ?? true;
  }

  get canViewValidationWindow(): boolean {
    return this.config?.validationWindow.visible ?? true;
  }

  validationForm = new FormGroup({
    validationMethod: new FormControl<ValidationMethod>(ValidationMethod.PARTNERS_APP),
    validationWindow: new FormControl<ValidationWindow>(ValidationWindow.STANDARD_TIME),
  });

  ValidationMethod = ValidationMethod;
  ValidationWindow = ValidationWindow;

  constructor() {
    this.validationForm.valueChanges.subscribe(() => {
      const rawValue = this.validationForm.getRawValue();
      const valueToEmit: Partial<ValidationSectionData> = {};
      if (this.canViewValidationMethod && rawValue.validationMethod !== null) {
        valueToEmit.validationMethod = rawValue.validationMethod;
      }
      if (this.canDisplayValidationWindow && rawValue.validationWindow !== null) {
        valueToEmit.validationWindow = rawValue.validationWindow;
      }
      if (this.canViewValidationMethod || this.canViewValidationWindow) {
        this.#onChange(valueToEmit as ValidationSectionData);
        this.#onTouched();
      }
    });
  }

  isValidationMethodAllowed(method: ValidationMethod): boolean {
    return this.allowedValidationMethods.length === 0 || this.allowedValidationMethods.includes(method);
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['config']) {
      if (!this.#isFormGloballyDisabled) {
        this.#updateFieldStates();
      }
    }
  }

  registerOnChange(fn: (value: ValidationSectionData) => void): void {
    this.#onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.#onTouched = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    this.#isFormGloballyDisabled = isDisabled;
    if (isDisabled) {
      this.validationForm.disable({ emitEvent: false });
    } else {
      this.validationForm.enable({ emitEvent: false });
      // Apply individual field permissions
      this.#updateFieldStates();
    }
  }

  writeValue(value: ValidationSectionData): void {
    if (value != null) {
      this.validationForm.patchValue(value, { emitEvent: false });
      if (!this.#isFormGloballyDisabled) {
        this.#updateFieldStates();
      }
    }
  }

  #updateFieldStates(): void {
    if (!this.canEditValidationMethod) {
      this.validationForm.get('validationMethod')?.disable({ emitEvent: false });
    } else {
      this.validationForm.get('validationMethod')?.enable({ emitEvent: false });
    }
    if (!this.canEditValidationWindow) {
      this.validationForm.get('validationWindow')?.disable({ emitEvent: false });
    } else {
      this.validationForm.get('validationWindow')?.enable({ emitEvent: false });
    }
  }
}
