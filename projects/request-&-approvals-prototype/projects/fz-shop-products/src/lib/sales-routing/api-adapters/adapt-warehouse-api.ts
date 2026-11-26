import { adaptWarehouseRefApi } from '../../core/api-adapters/adapt-warehouse-ref-api';
import type { SalesRoutingWarehouseApi } from '../models/api/sales-routing-response.model';
import type { Warehouse } from '../models/sales-routing.model';

export function adaptWarehouseApi(warehouse: SalesRoutingWarehouseApi): Warehouse {
  return {
    ...adaptWarehouseRefApi(warehouse),
    productVariationsCount: warehouse.product_variations_count,
  };
}
