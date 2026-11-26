import { TrackingEvent } from '../../tracking-event';
import { TrackingEvents } from '../tracking-events';

interface LoadResellerAmbassadorProgramListData {
  has_results: boolean;
}

export class LoadResellerAmbassadorProgramListEvent extends TrackingEvent<LoadResellerAmbassadorProgramListData> {
  constructor(readonly data: LoadResellerAmbassadorProgramListData) {
    super(TrackingEvents.LoadResellerAmbassadorProgramList, data);
  }
}
