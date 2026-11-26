import { FormControl, FormGroup } from '@angular/forms';

import { IngtFormError } from '@ignite/legacy/models/ignt-input.model';

import { DynamicFieldControlKind } from '../enums/dynamic-field-control-kind.enum';
import { DynamicField } from './dynamic-fields.model';

export type DynamicFieldControlValue = string | number | boolean | null;

export type DynamicFieldsForm = FormGroup<Record<string, FormControl<DynamicFieldControlValue>>>;

export interface DynamicFieldRow {
  controlKind: DynamicFieldControlKind;
  errors: IngtFormError[];
  field: DynamicField;
  helperText: string;
  inputType: 'date' | 'datetime-local' | 'number' | 'text';
  isOptional: boolean;
  label: string;
  placeholder: string;
  title: string;
  trailIcon: [string, string] | null;
}
