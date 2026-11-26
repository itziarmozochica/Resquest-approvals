import type { RetailSetupType } from '../../../core/models/retail-setup-type.model';
import { noneSquareAccountCurrencyOptionId, type CreateRetailFormValue } from '../../models/form/create-retail-form.model';
import type { RetailSetupCreate } from '../../models/retail-setup/retail-setup.model';
import type { Warehouse } from '../../models/retail-setup/warehouse.model';

export interface CreateRetailWarehouse {
  externalId: string;
  name: string;
}

export function mapCreateRetailFormToSetup(
  formValue: CreateRetailFormValue,
  warehouses: readonly CreateRetailWarehouse[],
  type: RetailSetupType,
): RetailSetupCreate {
  const mappedWarehouses: Warehouse[] = warehouses.map(warehouse => ({
    externalId: warehouse.externalId,
    id: '',
    name: warehouse.name,
  }));

  const base = {
    currency: formValue.currency,
    name: formValue.integrationName,
    plans: [] as number[],
    warehouses: mappedWarehouses,
  };

  if (type === 'odoo') {
    return {
      ...base,
      configuration: {
        accountId: formValue.accountId,
        companyId: Number(formValue.companyId),
      },
      type: 'odoo',
    };
  }

  const catalogBase = {
    ...base,
    masterCatalogId: formValue.masterCatalogId,
  };

  if (type === 'square') {
    return {
      ...catalogBase,
      ...(hasSquareAccountCurrencyOverride(formValue.squareAccountCurrency)
        ? { overriddenExternalCurrency: formValue.squareAccountCurrency }
        : {}),
      type: 'square',
    };
  }

  return {
    ...catalogBase,
    type,
  };
}

// Untouched ('') and an explicit None both mean "no override", so neither reaches the domain model.
function hasSquareAccountCurrencyOverride(squareAccountCurrency: string): boolean {
  return squareAccountCurrency !== '' && squareAccountCurrency !== noneSquareAccountCurrencyOptionId;
}
