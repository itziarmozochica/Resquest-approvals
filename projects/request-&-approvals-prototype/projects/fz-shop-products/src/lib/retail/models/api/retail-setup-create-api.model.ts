import type { WarehouseApi } from './warehouse-api.model';

export interface RetailSetupOdooConfigurationApi {
  account_id: string;
  company_id: number;
}

interface RetailSetupCreateApiBase {
  currency: string;
  name: string;
  plans: { id: number }[];
  warehouses?: WarehouseApi[];
}

interface RetailSetupCreateCatalogApiBase extends RetailSetupCreateApiBase {
  master_catalog_id: string;
}

export type RetailSetupCreateApi =
  | (RetailSetupCreateApiBase & { configuration: RetailSetupOdooConfigurationApi; type: 'odoo' })
  | (RetailSetupCreateCatalogApiBase & { overridden_external_currency?: string; type: 'square' })
  | (RetailSetupCreateCatalogApiBase & { type: 'onebox' | 'shopify' });
