import { KioskPlanItem } from '@fz-original/app/modules/kiosk/models/kiosk-plan.model';
import { BaseErrorResponse } from '@fz-original/app/shared/models/base-response';

export interface KioskCategory {
  description: string | null;
  has_more_plans: boolean;
  id: string | null;
  name: string | null;
  total_plans: number;
}

export interface KioskCategoryGroup {
  category: KioskCategory;
  plans: KioskPlanItem[];
}

export interface KioskGroupedPlansResponse {
  data?: KioskCategoryGroup[];
  error: BaseErrorResponse | null;
}
