export interface KioskConfiguration {
  apiKey: string;
  channelId?: string | null;
  dataSourceName?: string | null;
  dataSourceId?: string | null;
  id: string;
  name: string;
  onsiteSetupId: string;
  paymentTerminalId: string;
  paymentTerminalIp: string | null;
  pin: string;
  plan_ids: number[];
  serial: string;
}
