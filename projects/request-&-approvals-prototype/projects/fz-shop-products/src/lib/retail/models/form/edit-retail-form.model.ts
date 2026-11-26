import type { FormControl } from '@angular/forms';

export interface EditRetailFormValue {
  isAvailableUnitsTrackingEnabled: boolean;
  isSyncEnabled: boolean;
  overriddenExternalCurrency: string;
  retailName: string;
}

export type EditRetailFormControls = {
  [key in keyof EditRetailFormValue]: FormControl<EditRetailFormValue[key]>;
};
