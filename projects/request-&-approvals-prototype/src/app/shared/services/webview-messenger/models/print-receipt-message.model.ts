import { WebViewMessage } from '@feverup/ts-webview';

import { PrintReceiptMessagePayload } from './PrintReceiptMessagePayload';
import { WebViewTypeMessage } from './web-view-type-message.model';

export class PrintReceiptMessageModel implements WebViewMessage<PrintReceiptMessagePayload> {
  type = WebViewTypeMessage.print_receipt;
  payload: PrintReceiptMessagePayload;

  constructor(payload: PrintReceiptMessagePayload) {
    this.payload = payload;
  }
}
