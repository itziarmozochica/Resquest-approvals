import { SelectOption } from '../../../../shared/layout/filters/select/select.interface';

export interface KioskForm {
  dataSourceId: string | null;
  name: string;
  onsiteSetup: SelectOption;
  paymentTerminalId: string;
  paymentTerminalIp: string | null;
  plans: SelectOption[];
}
