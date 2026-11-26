import { TrackingEvent } from '../../tracking-event';
import { TrackingEvents } from '../tracking-events';
import { LoadPlanListData } from './load-plan-list';

interface LoadResellerPlanListData extends LoadPlanListData {
  resseller_category: 'ambassador' | 'affiliate';
}

export class LoadResellerPlanListEvent extends TrackingEvent<LoadResellerPlanListData> {
  constructor(readonly data: LoadResellerPlanListData) {
    super(TrackingEvents.LoadResellerPlanList, data);
  }
}
