import { TrackingEvent } from '../../tracking-event';
import { TrackingEvents } from '../tracking-events';
import { ShiftDetailData } from './open-shift-detail';

export class PrintShiftDetailEvent extends TrackingEvent<ShiftDetailData> {
  constructor(readonly data: ShiftDetailData) {
    super(TrackingEvents.PrintShiftDetail, data);
  }
}
