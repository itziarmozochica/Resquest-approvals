import { ReservationFlowTypeEnum } from '@fz-original/app/modules/reservation/models/reservation_flow_type.enum';

export interface LoadTicketingData {
  city_id: number;
  city_name: string;
  plan_id: number;
  plan_name: string;
  place_id: number;
  place_name: string;
  time: string;
  default_filter: boolean;
  has_results: boolean;
  obo_flow_type?: string;
  reservation_flow_type?: ReservationFlowTypeEnum;
}
