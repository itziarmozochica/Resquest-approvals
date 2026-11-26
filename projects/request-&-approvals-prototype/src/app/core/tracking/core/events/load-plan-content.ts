import { TrackingEvent } from '../../tracking-event';
import { TrackingEvents } from '../tracking-events';

interface LoadPlanContentData {
  id: number;
  name: string;
}

export class LoadPlanContentEvent extends TrackingEvent<LoadPlanContentData> {
  constructor(readonly data: LoadPlanContentData) {
    super(TrackingEvents.LoadPlanContent, data);
  }
}
