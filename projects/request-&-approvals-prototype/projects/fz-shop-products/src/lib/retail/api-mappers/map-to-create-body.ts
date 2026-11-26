import type { RetailSetupCreateApi } from '../models/api/retail-setup-create-api.model';
import type { RetailSetupCreate } from '../models/retail-setup/retail-setup.model';
import type { Warehouse } from '../models/retail-setup/warehouse.model';

function mapWarehousesToApi(warehouses: Warehouse[]): Pick<RetailSetupCreateApi, 'warehouses'> {
  if (warehouses.length === 0) {
    return {};
  }

  return {
    warehouses: warehouses.map(warehouse => ({
      external_id: warehouse.externalId,
      id: warehouse.id,
      name: warehouse.name,
    })),
  };
}

export function mapToCreateBody(retailSetup: RetailSetupCreate): RetailSetupCreateApi {
  const warehouses = mapWarehousesToApi(retailSetup.warehouses);
  const base = {
    currency: retailSetup.currency,
    name: retailSetup.name,
    plans: retailSetup.plans.map(id => ({ id })),
    ...warehouses,
  };

  if (retailSetup.type === 'odoo') {
    return {
      ...base,
      configuration: {
        account_id: retailSetup.configuration.accountId,
        company_id: retailSetup.configuration.companyId,
      },
      type: 'odoo',
    };
  }

  const catalogBase = {
    ...base,
    master_catalog_id: retailSetup.masterCatalogId,
  };

  if (retailSetup.type === 'square') {
    return {
      ...catalogBase,
      ...(retailSetup.overriddenExternalCurrency === undefined
        ? {}
        : { overridden_external_currency: retailSetup.overriddenExternalCurrency }),
      type: 'square',
    };
  }

  return {
    ...catalogBase,
    type: retailSetup.type,
  };
}
