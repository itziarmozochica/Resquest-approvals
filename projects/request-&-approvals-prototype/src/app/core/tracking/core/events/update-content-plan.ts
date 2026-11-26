import { PlanSaveContext } from '../../../../modules/plan/tracking/models/plan-tracking.model';
import { TrackingEvent } from '../../tracking-event';
import { TrackingEvents } from '../tracking-events';

export interface UpdateContentPlanData {
  context?: PlanSaveContext;
  event_type?: string;
  plan_id: number;
  plan_name: string;
  previous_plan_name?: string;
  new_plan_name?: string;
  previous_plan_description?: string;
  new_plan_description?: string;
}

export class UpdateContentPlanEvent extends TrackingEvent<UpdateContentPlanData> {
  constructor(readonly data: UpdateContentPlanData) {
    super(TrackingEvents.UpdateContentPlan, data);
  }
}
