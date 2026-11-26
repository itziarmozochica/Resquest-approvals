export type ResendType = 'pdf' | 'wallet_passes' | 'whatsapp_purchase_confirmation';

export interface ResendTicketsModalData {
  canEditEmail: boolean;
  isWalletPassesEnabled: boolean;
  isWhatsappPurchaseConfirmationEnabled: boolean;
  orderEmail: string;
  orderPhone: string;
}

export interface ResendTicketsModalResult {
  includeQrCodes: boolean;
  type: ResendType;
  email?: string;
}

export interface ResendTypeOption {
  label: string;
  value: ResendType;
}
