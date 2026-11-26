import type { FormControl } from '@angular/forms';

import type { RetailSetupType } from '../../../core/models/retail-setup-type.model';

export interface SelectRetailFormValue {
  retailType: RetailSetupType;
}

export type SelectRetailFormControls = {
  [key in keyof SelectRetailFormValue]: FormControl<SelectRetailFormValue[key] | null>;
};
