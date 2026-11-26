import { PlanReviewRequestStatus } from '../../models/plan-review/plan-review-request.model';
import { PlanKind } from '../../models/plan/plan-kind.enum';
import { PlanStatus } from '../../models/plan/plan-status.enum';
import { PlaceOption } from './place-option.model';

/**
 * @todo consolidate with ListPlanItem from
 * `src/app/modules/attendees/list-attendees/models/list-plan-item.model.ts`
 */
export class PlanOption {
  constructor(
    public id: number,
    public name: string,
    public status: PlanStatus,
    public kind: PlanKind,
    public places: PlaceOption[],
    public isAssetBased: boolean,
    public nextSessionDate?: string | null,
    public lastSessionDate?: string | null,
    public nextSessionDateRegardlessOfAttendance?: string | null,
    public lastSessionDateRegardlessOfExpirationAndAttendance?: string | null,
    public hasSeatingProvider: boolean = false,
    public reviewStatus?: PlanReviewRequestStatus,
    public hasDeclarativeInventory: boolean = false,
  ) {}
}
