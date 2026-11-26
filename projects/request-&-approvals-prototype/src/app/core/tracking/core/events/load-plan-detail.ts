import { TrackingEvent } from '../../tracking-event';
import { TrackingEvents } from '../tracking-events';

interface LoadPlanDetailData {
  id: number;
  name: string;
}

export class LoadPlanDetailEvent extends TrackingEvent<LoadPlanDetailData> {
  constructor(readonly data: LoadPlanDetailData) {
    super(TrackingEvents.LoadPlanDetail, data);
  }
}
