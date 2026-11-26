import type { RetailSetupApi } from '../models/api/retail-setup-api.model';
import type { RetailSetup } from '../models/retail-setup/retail-setup.model';
import { adaptRetailSetupWarehouseApi } from './adapt-retail-setup-warehouse';

export function adaptRetailSetupApi(id: string, entry: RetailSetupApi): RetailSetup {
  return {
    createdAt: entry.created_at,
    id,
    isAvailableUnitsTrackingEnabled: entry.is_available_units_tracking_enabled,
    isSyncEnabled: entry.is_sync_enabled,
    lastSyncedAt: entry.last_synced_at,
    masterCatalogId: entry.master_catalog_id,
    name: entry.name,
    overriddenExternalCurrency: entry.overridden_external_currency,
    partnerId: entry.partner_id,
    plans: entry.plans.map(plan => plan.id),
    type: entry.type,
    warehouses: entry.warehouses.map(adaptRetailSetupWarehouseApi),
    ...(entry.product_variations_count !== undefined && {
      productVariationsCount: entry.product_variations_count,
    }),
  };
}
