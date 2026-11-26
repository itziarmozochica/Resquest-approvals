import { TrackingEvent } from '../../tracking-event';
import { TrackingEvents } from '../tracking-events';

export interface EditPriceListSettingsTimeslotData {
  start_date: string;
  end_date: string;
  weekdays: Array<string>;
  start_time: string;
  end_time: string;
}

export interface EditPriceListSettingsData {
  plan_id: number;
  price_list_id: string;
  timezone: string;
  previous_name?: string;
  new_name?: string;
  previous_channels?: Array<string>;
  new_channels?: Array<string>;
  previous_timeslots?: Array<EditPriceListSettingsTimeslotData>;
  new_timeslots?: Array<EditPriceListSettingsTimeslotData>;
  previous_tier?: string | null;
  new_tier?: string | null;
  previous_status?: boolean;
  new_status?: boolean;
  previous_activation_start_date?: string | null;
  new_activation_start_date?: string | null;
  previous_activation_end_date?: string | null;
  new_activation_end_date?: string | null;
}

export class EditPriceListSettingsEvent extends TrackingEvent<EditPriceListSettingsData> {
  constructor(readonly data: EditPriceListSettingsData) {
    super(TrackingEvents.EditPriceListSettings, data);
  }
}
