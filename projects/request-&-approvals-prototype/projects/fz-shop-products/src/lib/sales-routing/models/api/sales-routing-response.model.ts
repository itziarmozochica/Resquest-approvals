import type { PlanApi } from '../../../core/models/api/plan-api.model';
import type { WarehouseRefApi } from '../../../core/models/api/warehouse-ref-api.model';
import type { RetailSetupType } from '../../../core/models/retail-setup-type.model';
import type { ChannelType } from '../channel-type.model';

export interface SalesRoutingWarehouseApi extends WarehouseRefApi {
  product_variations_count: number;
}

export interface SalesRoutingChannelApi {
  channel_type: ChannelType;
  id: string;
  name: string;
  warehouses: SalesRoutingWarehouseApi[];
}

export interface SalesRoutingPlanApi extends PlanApi {
  channels: SalesRoutingChannelApi[];
  city_name: string;
  image_url: string;
  place_name: string;
}

export interface SalesRoutingDataApi {
  plans: SalesRoutingPlanApi[];
  retail_setup_type?: RetailSetupType;
}

export interface SalesRoutingResponse {
  data: SalesRoutingDataApi | null;
  error?: unknown;
}
