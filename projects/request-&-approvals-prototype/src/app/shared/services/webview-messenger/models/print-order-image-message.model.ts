import { WebViewMessage } from '@feverup/ts-webview';

import { WebViewTypeMessage } from './web-view-type-message.model';

export interface PrintOrderImageMessagePayload {
  base64Images: string[];
  cutterType: string;
  paperType?: string;
  planId?: number;
  orderId?: number;
  orders?: PrintOrderImageMessageOrderPayload[];
  orderPlanName?: string;
  orderTicketCodes?: string[];
  orderUserEmail?: string;
  orderUserId?: number;
  partnerName?: string;
  userEmail?: string;
  userId?: number;
  useUnifiedTicket?: boolean;
}

export interface PrintOrderImageMessageOrderPayload {
  planId?: number;
  orderId?: number;
  orderPlanName?: string;
  orderTicketCodes?: string[];
  orderUserEmail?: string;
  orderUserId?: number;
  userEmail?: string;
  userId?: number;
  useUnifiedTicket?: boolean;
}

export class PrintOrderImageMessage implements WebViewMessage<PrintOrderImageMessagePayload> {
  payload: PrintOrderImageMessagePayload;
  type = WebViewTypeMessage.print_order_image;

  constructor(payload: PrintOrderImageMessagePayload) {
    this.payload = payload;
  }
}
