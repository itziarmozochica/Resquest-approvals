import { Validators, type AbstractControl, type FormGroup, type ValidationErrors } from '@angular/forms';

/**
 * Validators for retail text fields: required, max length 50, no leading/trailing spaces.
 * Used for integration name, warehouse name, master catalog ID, external ID, and retail name.
 */
export const retailTextValidators = [
  (control: AbstractControl): ValidationErrors | null => Validators.required(control),
  (control: AbstractControl): ValidationErrors | null => Validators.maxLength(50)(control),
  (control: AbstractControl): ValidationErrors | null => Validators.pattern(/^(?!\s)(?!.*\s$).*$/u)(control),
];

export const retailCurrencyValidators = [(control: AbstractControl): ValidationErrors | null => Validators.required(control)];

export const retailCompanyIdValidators = [
  (control: AbstractControl): ValidationErrors | null => Validators.required(control),
  (control: AbstractControl): ValidationErrors | null => Validators.pattern(/^[1-9]\d*$/u)(control),
];

export const markFormGroupAsInvalid = (formGroup: FormGroup): void => {
  Object.values(formGroup.controls).forEach(control => {
    control.markAsDirty();
    control.updateValueAndValidity();
  });
};
