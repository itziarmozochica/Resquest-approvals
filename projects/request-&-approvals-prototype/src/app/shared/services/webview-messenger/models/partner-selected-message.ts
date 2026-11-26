import { WebViewMessage } from '@feverup/ts-webview';

import { WebViewTypeMessage } from './web-view-type-message.model';

export interface PartnerSelectedData {
  partnerId: number;
  partnerName: string;
}

export class PartnerSelectedMessage implements WebViewMessage<PartnerSelectedData> {
  payload: PartnerSelectedData;
  type = WebViewTypeMessage.partner_selected;

  constructor(payload: PartnerSelectedData) {
    this.payload = payload;
  }
}
