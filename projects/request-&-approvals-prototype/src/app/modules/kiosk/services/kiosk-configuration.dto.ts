export interface KioskConfigurationDto {
  api_key?: string;
  data_source_id?: string | null;
  id: string;
  name: string;
  onsite_setup_id: string;
  payment_terminal_id: string;
  payment_terminal_ip: string | null;
  pin: string;
  plan_ids: number[];
  saved_api_key: string;
  serial: string;
  subscription_channel?: string | null;
}
