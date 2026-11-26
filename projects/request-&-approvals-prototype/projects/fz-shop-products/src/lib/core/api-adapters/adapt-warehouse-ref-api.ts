import type { WarehouseRefApi } from '../models/api/warehouse-ref-api.model';
import type { WarehouseRef } from '../models/warehouse-ref.model';

export function adaptWarehouseRefApi(warehouse: WarehouseRefApi): WarehouseRef {
  return {
    id: warehouse.id,
    name: warehouse.name,
  };
}
