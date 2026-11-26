import type { PlanApi } from '../../../../core/models/api/plan-api.model';
import type { WarehouseRefApi } from '../../../../core/models/api/warehouse-ref-api.model';

export type DistributionWarehouseApi = WarehouseRefApi;

export interface DistributionChannelApi {
  id: string;
  name: string;
  warehouses: DistributionWarehouseApi[];
}

export interface DistributionPlanApi extends PlanApi {
  channels: DistributionChannelApi[];
  city_id: number;
  product_type_label: string;
  session_type_id: number;
  venue_id: number;
  has_active_session?: boolean;
}

export interface DistributionsResponse {
  data: { plans: DistributionPlanApi[] } | null;
  error?: unknown;
}
