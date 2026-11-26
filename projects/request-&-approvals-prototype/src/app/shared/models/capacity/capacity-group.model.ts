import { NameData } from '../data/data.model';
import { CapacityGroupHeader } from './capacity-group-header.model';

export interface SharedWithMainPlan {
  mainPlanId: number;
}

export interface CodePoolSummaryData extends NameData<number> {
  provider_name: string;
  fever_generated: boolean;
  image_generator: string;
  created_at: string;
  is_cancelled: boolean;
  available_codes: number;
  used_codes: number;
  capacity: number;
  occupancy: number;
  group: CapacityGroupHeader | null;
}

export class CapacityGroup {
  constructor(
    public id: string,
    public name: string,
    public isAssetBased: boolean = false,
    public createdAt: string,
    public isCancelled: boolean,
    public availableTickets: number,
    public usedTickets: number,
    public capacity: number,
    public occupancy: number,
    public blockedTickets: number | null,
    public group: CapacityGroupHeader | null,
    public sharedWithMainPlans: SharedWithMainPlan[] | null = null,
  ) {}
}
