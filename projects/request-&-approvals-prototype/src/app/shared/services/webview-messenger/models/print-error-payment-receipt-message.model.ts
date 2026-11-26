import { WebViewMessage } from '@feverup/ts-webview';

import { PrintErrorPaymentReceiptMessagePayload } from './PrintErrorPaymentReceiptMessagePayload';
import { WebViewTypeMessage } from './web-view-type-message.model';

export class PrintErrorPaymentReceiptMessageModel implements WebViewMessage<PrintErrorPaymentReceiptMessagePayload> {
  type = WebViewTypeMessage.print_error_payment_receipt;
  payload: PrintErrorPaymentReceiptMessagePayload;

  constructor(payload: PrintErrorPaymentReceiptMessagePayload) {
    this.payload = payload;
  }
}
