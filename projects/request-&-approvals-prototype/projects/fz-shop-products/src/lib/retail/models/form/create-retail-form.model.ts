import type { FormControl } from '@angular/forms';

export const noneSquareAccountCurrencyOptionId = 'none';

export interface CreateRetailFormValue {
  accountId: string;
  companyId: string;
  currency: string;
  integrationName: string;
  masterCatalogId: string;
  squareAccountCurrency: string;
}

export type CreateRetailFormControls = {
  [key in keyof CreateRetailFormValue]: FormControl<CreateRetailFormValue[key]>;
};

export interface WarehouseFormValue {
  externalId: string;
  warehouseName: string;
}

export type WarehouseFormControls = {
  [key in keyof WarehouseFormValue]: FormControl<WarehouseFormValue[key]>;
};
