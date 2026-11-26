import { PaymentConfigurationMethodInput } from '../../../shared/models/payment-configuration';

export type PaymentConfigurationDirectButtonSlotId = 'primary' | 'secondary' | 'tertiary';
export type PaymentConfigurationDirectButtonSlotKind = 'method' | 'pay' | 'see_more';

export interface PaymentConfigurationDirectButtonChoice {
  id: string;
  label: string;
}

export interface PaymentConfigurationDirectButtonSlot {
  enabled: boolean;
  id: PaymentConfigurationDirectButtonSlotId;
  items: PaymentConfigurationDirectButtonChoice[];
  kind: PaymentConfigurationDirectButtonSlotKind;
  label: string | null;
  method: PaymentConfigurationMethodInput | null;
  selectedKey: string | null;
  toggleable: boolean;
  unavailable: boolean;
}

export interface PaymentConfigurationDirectButtonSlotChange {
  id: PaymentConfigurationDirectButtonSlotId;
  key: string;
}

export interface PaymentConfigurationDirectButtonSlotToggle {
  enabled: boolean;
  id: PaymentConfigurationDirectButtonSlotId;
}

export interface PaymentConfigurationDirectButtonLabels {
  pay: string;
  seeMore: string;
  methodLabel: (method: PaymentConfigurationMethodInput) => string;
}
