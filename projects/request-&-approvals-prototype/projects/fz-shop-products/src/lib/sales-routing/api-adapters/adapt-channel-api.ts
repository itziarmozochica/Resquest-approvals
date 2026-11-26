import type { SalesRoutingChannelApi } from '../models/api/sales-routing-response.model';
import type { Channel } from '../models/sales-routing.model';
import { adaptWarehouseApi } from './adapt-warehouse-api';

export function adaptChannelApi(channel: SalesRoutingChannelApi): Channel {
  return {
    channelType: channel.channel_type,
    id: channel.id,
    name: channel.name,
    warehouses: channel.warehouses.map(adaptWarehouseApi),
  };
}
