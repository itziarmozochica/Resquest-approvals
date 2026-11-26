import type { PlanApi } from './plan-api.model';
import type { WarehouseApi } from './warehouse-api.model';

export interface RetailSetupApi {
  created_at: string;
  is_available_units_tracking_enabled: boolean;
  is_sync_enabled: boolean;
  last_synced_at: string | null;
  master_catalog_id: string;
  name: string;
  overridden_external_currency: string | null;
  partner_id: number;
  plans: PlanApi[];
  type: string;
  warehouses: WarehouseApi[];
  product_variations_count?: number;
}
