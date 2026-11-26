import { WebViewMessage } from '@feverup/ts-webview';

import { PrintOrderMessagePayload } from './PrintOrderMessagePayload';
import { WebViewTypeMessage } from './web-view-type-message.model';

export class PrintOrderMessageV2 implements WebViewMessage<PrintOrderMessagePayload> {
  type = WebViewTypeMessage.print_order_v2;
  payload: PrintOrderMessagePayload;

  constructor(payload: PrintOrderMessagePayload) {
    this.payload = payload;
  }
}
