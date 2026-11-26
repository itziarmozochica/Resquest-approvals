import { IgntIconName } from '@ignite/icon';

export interface PaymentConfigurationMethodsPreviewItem {
  caption: string;
  icon: IgntIconName;
  key: string;
  label: string;
}

const ICON_BY_CODE: Record<string, IgntIconName> = {
  bank_transfer: 'building-columns',
  card: 'credit-card',
  carta_valorada: 'file-invoice-dollar',
  carta_valorada_aatm: 'file-invoice-dollar',
  cash: 'money-bill',
  credit_card: 'credit-card',
  debit_card: 'credit-card',
  simple_payments_kr: 'qrcode',
  square_qr: 'qrcode',
};

export function paymentMethodPreviewIcon(code: string): IgntIconName {
  return ICON_BY_CODE[code] ?? 'dollar-sign';
}
