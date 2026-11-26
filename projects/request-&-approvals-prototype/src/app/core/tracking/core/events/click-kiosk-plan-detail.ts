import { TrackingEvent } from '../../tracking-event';
import { TrackingEvents } from '../tracking-events';

export interface ClickKioskPlanDetailData {
  planId: string;
}

export class ClickKioskPlanDetailEvent extends TrackingEvent<ClickKioskPlanDetailData> {
  constructor(readonly data: ClickKioskPlanDetailData) {
    super(TrackingEvents.ClickKioskPlanDetail, data);
  }
}
