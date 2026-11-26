import { PlanReviewRequestStatus } from '../../../../shared/models/plan-review/plan-review-request.model';
import { PlanKind } from '../../../../shared/models/plan/plan-kind.enum';
import { PlanStatus } from '../../../../shared/models/plan/plan-status.enum';
import { PlaceOption } from '../../../../shared/search-bar/models/place-option.model';

/**
 * @todo consolidate with PlanOption from
 * `src/app/shared/search-bar/models/plan-option.model.ts`
 */
export interface ListPlanItem {
  id: number;
  kind?: PlanKind;
  name: string;
  status?: PlanStatus;
  reviewStatus?: PlanReviewRequestStatus;
  places?: PlaceOption[];
  isAssetBased?: boolean;
  hasSeatingProvider?: boolean;
  hasDeclarativeInventory?: boolean;
  nextSessionDate?: string;
  lastSessionDate?: string;
  nextSessionDateRegardlessOfAttendance?: string;
  lastSessionDateRegardlessOfExpirationAndAttendance?: string;
  timezone?: string;
}
