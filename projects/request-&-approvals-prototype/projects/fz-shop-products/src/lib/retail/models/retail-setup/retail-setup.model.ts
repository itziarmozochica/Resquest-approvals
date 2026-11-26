import type { RetailSetupOdooConfiguration } from './retail-setup-odoo-configuration.model';
import type { Warehouse } from './warehouse.model';

export type RetailSetupId = string;

export interface RetailSetup {
  createdAt: string;
  id: RetailSetupId;
  isAvailableUnitsTrackingEnabled: boolean;
  isSyncEnabled: boolean;
  lastSyncedAt: string | null;
  masterCatalogId: string;
  name: string;
  overriddenExternalCurrency: string | null;
  partnerId: number;
  plans: number[];
  type: string;
  warehouses: Warehouse[];
  productVariationsCount?: number;
}

export type AvailableRetailSetup = Pick<RetailSetup, 'id' | 'name'>;

type RetailSetupCreateBase = Pick<RetailSetup, 'name' | 'plans' | 'warehouses'> & { currency: string };

type RetailSetupCreateCatalogBase = RetailSetupCreateBase & { masterCatalogId: string };

export type RetailSetupCreate =
  | (RetailSetupCreateBase & { configuration: RetailSetupOdooConfiguration; type: 'odoo' })
  | (RetailSetupCreateCatalogBase & { overriddenExternalCurrency?: string; type: 'square' })
  | (RetailSetupCreateCatalogBase & { type: 'onebox' | 'shopify' });

export type RetailSetupOption = Pick<RetailSetup, 'type'>;

export type RetailSetupUpdate = Partial<
  Pick<RetailSetup, 'isAvailableUnitsTrackingEnabled' | 'isSyncEnabled' | 'name' | 'overriddenExternalCurrency' | 'plans' | 'warehouses'>
>;
