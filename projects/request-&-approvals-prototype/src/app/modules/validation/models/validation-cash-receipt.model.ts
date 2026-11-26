import { SafeHtml } from '@angular/platform-browser';

import type { IgntAlertSentiment } from '@ignite/common';

export interface ValidationCashReceiptServiceCreateBody {
  businessNumber: string;
  email?: string;
  totalAmount: number;
}

export interface ValidationCashReceiptComponentDialogData {
  orderId: number;
  orderPartnerId?: number;
}

export interface ValidationCashReceiptComponentAlertData {
  description: string | SafeHtml;
  sentiment: IgntAlertSentiment;
}
