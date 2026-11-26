import { TrackingEvent } from '../../tracking-event';
import { TrackingEvents } from '../tracking-events';

export interface LoadAmbassadorProgramDetailData {
  time: string;
  program_id: string;
  user_id: string;
  current_points: number;
  partner_id: number;
  plan_id: string | null;
  channel_id: string | null;
  success: boolean;
  error_code?: string;
}

export class LoadAmbassadorProgramDetailEvent extends TrackingEvent<LoadAmbassadorProgramDetailData> {
  constructor(readonly data: LoadAmbassadorProgramDetailData) {
    super(TrackingEvents.LoadAmbassadorProgramDetail, data);
  }
}
