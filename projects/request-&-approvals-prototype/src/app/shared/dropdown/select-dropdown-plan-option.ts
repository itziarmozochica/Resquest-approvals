import { SelectOption } from '../layout/filters/select/select.interface';
import { PlanStatus } from '../models/plan/plan-status.enum';

export interface SelectDropdownPlanOption extends SelectOption {
  id: number;
  status?: PlanStatus;
  nextSessionDate?: string;
  lastSessionDate?: string;
  nextSessionDateRegardlessOfAttendance?: string;
  lastSessionDateRegardlessOfExpirationAndAttendance?: string;
  isAssetBased?: boolean;
  hasSeatingProvider?: boolean;
  timezone?: string;
}
