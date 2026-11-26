import type { FormControl } from '@angular/forms';

export interface ProductVariationsFilterFormValue {
  showExternalId: boolean;
  warehouse: string[];
}

export type ProductVariationsFilterFormControls = {
  [key in keyof ProductVariationsFilterFormValue]: FormControl<ProductVariationsFilterFormValue[key]>;
};
