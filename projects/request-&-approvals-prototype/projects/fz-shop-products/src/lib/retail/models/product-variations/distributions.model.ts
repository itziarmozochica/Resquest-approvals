import type { Plan } from '../../../core/models/plan.model';
import type { WarehouseRef } from '../../../core/models/warehouse-ref.model';

export interface DistributionChannel {
  id: string;
  name: string;
  warehouses: WarehouseRef[];
}

export interface DistributionPlan extends Plan {
  channels: DistributionChannel[];
  cityId: number;
  hasActiveSession: boolean;
  productTypeLabel: string | null;
  sessionTypeId: number;
  venueId: number;
}

export interface Distributions {
  plans: DistributionPlan[];
}
