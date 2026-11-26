import { WebViewMessage } from '@feverup/ts-webview';

import { WebViewTypeMessage } from './web-view-type-message.model';

export class CashDrawerOpenMessage implements WebViewMessage<null> {
  // eslint-disable-next-line @typescript-eslint/no-inferrable-types
  payload: null = null;
  type = WebViewTypeMessage.cash_drawer_open;
}
