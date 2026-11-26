import { TrackingEvent } from '../../tracking-event';
import { TrackingEvents } from '../tracking-events';

export interface LoadMyAmbassadorProgramsData {
  time: string;
  user_id: string;
  programs_count: number;
  has_results: boolean;
  partner_id: number;
  channel_id: string | null;
  success: boolean;
  error_code?: string;
}

export class LoadMyAmbassadorProgramsEvent extends TrackingEvent<LoadMyAmbassadorProgramsData> {
  constructor(readonly data: LoadMyAmbassadorProgramsData) {
    super(TrackingEvents.LoadMyAmbassadorPrograms, data);
  }
}
