import { TrackingEvent } from '../../tracking-event';
import { TrackingEvents } from '../tracking-events';

export interface UpdateGalleryPlanData {
  action_type: string;
  plan_id: number;
  plan_name: string;
}

export class UpdateGalleryPlanEvent extends TrackingEvent<UpdateGalleryPlanData> {
  constructor(readonly data: UpdateGalleryPlanData) {
    super(TrackingEvents.UpdateGalleryPlan, data);
  }
}
