import type { Plan as CorePlan } from '../../core/models/plan.model';
import type { RetailSetupType } from '../../core/models/retail-setup-type.model';
import type { WarehouseRef } from '../../core/models/warehouse-ref.model';
import type { ChannelType } from './channel-type.model';

export interface SalesRouting {
  plans: Plan[];
  retailSetupType?: RetailSetupType;
}

export interface Channel {
  channelType: ChannelType;
  id: string;
  name: string;
  warehouses: Warehouse[];
}

export interface Warehouse extends WarehouseRef {
  productVariationsCount: number;
}

export interface Plan extends CorePlan {
  channels: Channel[];
  cityName: string;
  imageUrl: string;
  placeName: string;
}
