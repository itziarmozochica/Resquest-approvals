import { TrackingEvent } from '../../tracking-event';
import { TrackingEvents } from '../tracking-events';

interface PlanMoreInfoData {
  id: number;
  name: string;
  source: string;
  navigate_to: string;
}

export class PlanMoreInfoEvent extends TrackingEvent<PlanMoreInfoData> {
  constructor(readonly data: PlanMoreInfoData) {
    super(TrackingEvents.PlanMoreInfo, data);
  }
}
