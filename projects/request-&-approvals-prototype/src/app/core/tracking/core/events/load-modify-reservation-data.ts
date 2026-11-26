export interface LoadModifyReservationData {
  city_id: number;
  city_name: string;
  plan_id: number;
  plan_name: string;
  place_id: number;
  place_name: string;
  time: string;
  default_filter: boolean;
  has_results: boolean;
  channel: string;
  business_type?: string;
}
