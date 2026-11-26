import type { WarehouseApi } from './warehouse-api.model';

export interface RetailSetupUpdateApi {
  is_available_units_tracking_enabled?: boolean;
  is_sync_enabled?: boolean;
  name?: string;
  overridden_external_currency?: string;
  plans?: { id: number }[];
  warehouses?: WarehouseApi[];
}
