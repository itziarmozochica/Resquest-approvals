import { ValidatorFn } from '@angular/forms';

export type DynamicFormFieldType = 'text' | 'textarea' | 'select';

export interface DynamicFormFieldError {
  errorKey: string;
  message: string;
}

export interface DynamicFormFieldOption {
  value: string | number;
  label: string;
}

export interface DynamicFormField {
  name: string;
  label: string;
  type: DynamicFormFieldType;
  placeholder?: string;
  helpText?: string;
  required?: boolean;
  disabled?: boolean;
  validators?: ValidatorFn[];
  errorMessages?: DynamicFormFieldError[];
  rows?: number; // For textarea
  options?: DynamicFormFieldOption[]; // For select
  cssClass?: string;
  value?: string | number | null;
}

export interface DynamicFormConfig {
  fields: DynamicFormField[];
  submitButtonText?: string;
  cancelButtonText?: string;
  showCancelButton?: boolean;
}
