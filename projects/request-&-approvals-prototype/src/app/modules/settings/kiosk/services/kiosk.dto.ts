export interface KioskDTO {
  data_source_id?: string | null;
  name: string;
  onsite_setup_id: string;
  payment_terminal_id: string;
  payment_terminal_ip: string | null;
  plan_ids: number[];
  subscription_channel_id?: string | null;
}
