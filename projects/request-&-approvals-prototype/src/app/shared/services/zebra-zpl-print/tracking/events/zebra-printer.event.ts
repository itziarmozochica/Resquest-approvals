import { defineEvent } from '@fz/fz-tracking/src/public-api';

export interface ZebraPrinterData {
  success: boolean;
  afterRetry?: boolean;
  errorMessage?: string;
  errorMessageTranslate?: string;
  orderId?: number;
  planName?: string;
  printer?: string;
  zpl?: string;
}

export const zebraPrinter = defineEvent<ZebraPrinterData>('zebra.printer');
