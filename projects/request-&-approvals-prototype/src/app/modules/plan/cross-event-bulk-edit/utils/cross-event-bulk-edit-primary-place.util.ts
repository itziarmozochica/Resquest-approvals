import { Place } from '@fz-original/app/shared/models/plan/place.model';
import { Plan } from '@fz-original/app/shared/models/plan/plan.model';

export function crossEventBulkEditPrimaryPlace(plan: Pick<Plan, 'firstPlace' | 'places'>): Place | undefined {
  const addressName = plan.firstPlace?.addressName;
  return plan.places?.find(place => place.address === addressName) ?? plan.places?.[0];
}
