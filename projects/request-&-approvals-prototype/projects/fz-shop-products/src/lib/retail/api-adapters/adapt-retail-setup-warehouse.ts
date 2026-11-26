import type { WarehouseApi } from '../models/api/warehouse-api.model';
import type { Warehouse } from '../models/retail-setup/warehouse.model';

export function adaptRetailSetupWarehouseApi(dto: WarehouseApi): Warehouse {
  return {
    externalId: dto.external_id,
    id: dto.id,
    name: dto.name,
  };
}
