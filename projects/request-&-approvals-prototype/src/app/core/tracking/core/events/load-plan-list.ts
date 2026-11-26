import { TrackingEvent } from '../../tracking-event';
import { TrackingEvents } from '../tracking-events';

export interface LoadPlanListData {
  time: string;
  default_filter: boolean;
  status: string;
  kind: string;
  has_results: boolean;
}

export class LoadPlanListEvent extends TrackingEvent<LoadPlanListData> {
  constructor(readonly data: LoadPlanListData) {
    super(TrackingEvents.LoadPlanList, data);
  }
}
