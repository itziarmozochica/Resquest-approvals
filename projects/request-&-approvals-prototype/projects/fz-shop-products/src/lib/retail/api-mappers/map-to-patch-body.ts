import type { RetailSetupUpdateApi } from '../models/api/retail-setup-update-api.model';
import type { RetailSetupUpdate } from '../models/retail-setup/retail-setup.model';

export function mapToPatchBody(partialRetail: RetailSetupUpdate): RetailSetupUpdateApi {
  return {
    ...(partialRetail.isAvailableUnitsTrackingEnabled !== undefined && {
      is_available_units_tracking_enabled: partialRetail.isAvailableUnitsTrackingEnabled,
    }),
    ...(partialRetail.isSyncEnabled !== undefined && { is_sync_enabled: partialRetail.isSyncEnabled }),
    ...(partialRetail.name !== undefined && { name: partialRetail.name }),
    ...(partialRetail.overriddenExternalCurrency !== undefined && {
      overridden_external_currency: partialRetail.overriddenExternalCurrency ?? '',
    }),
    ...(partialRetail.plans !== undefined && { plans: partialRetail.plans.map(id => ({ id })) }),
    ...(partialRetail.warehouses !== undefined && {
      warehouses: partialRetail.warehouses.map(warehouse => ({
        external_id: warehouse.externalId,
        id: warehouse.id,
        name: warehouse.name,
      })),
    }),
  };
}
