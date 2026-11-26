import { adaptWarehouseRefApi } from '../../../core/api-adapters/adapt-warehouse-ref-api';
import type { DistributionChannelApi } from '../../models/api/product-variations/distributions-response.model';
import type { DistributionChannel } from '../../models/product-variations/distributions.model';

export function adaptDistributionChannelApi(channel: DistributionChannelApi): DistributionChannel {
  return {
    id: channel.id,
    name: channel.name,
    warehouses: channel.warehouses.map(adaptWarehouseRefApi),
  };
}
