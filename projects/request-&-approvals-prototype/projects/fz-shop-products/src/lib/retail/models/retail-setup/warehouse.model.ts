import type { WarehouseRef } from '../../../core/models/warehouse-ref.model';

export interface Warehouse extends WarehouseRef {
  externalId: string;
}

export interface WarehousePrice {
  amount: string;
  currency: string;
}
