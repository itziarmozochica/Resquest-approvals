import { AbstractControl } from '@angular/forms';

import type { IngtFormError } from '@ignite/legacy/models/ignt-input.model';

export interface EditControlSyncModalData {
  formControl: AbstractControl;
  inputType: 'email' | 'tel' | 'text';
  label: string;
  formErrors: IngtFormError[];
  title: string;
}

export interface EditControlSyncModalResult {
  confirmed: true;
}
