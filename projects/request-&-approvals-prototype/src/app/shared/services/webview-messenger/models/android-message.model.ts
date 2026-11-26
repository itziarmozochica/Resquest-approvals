import { WebViewTypeMessage } from './web-view-type-message.model';

export interface AndroidData {
  device: string;
  type: string;
  content: unknown;
}

export class AndroidMessage {
  data: AndroidData;
  type: WebViewTypeMessage = WebViewTypeMessage.android;

  constructor(public payload: string) {
    const parsedData: unknown = JSON.parse(payload);

    if (!this.#isValidAndroidData(parsedData)) {
      throw new Error('[AndroidMessage] Invalid payload structure. Expected AndroidData interface with device, type, and data properties.');
    }

    this.data = parsedData;
  }

  #isValidAndroidData(obj: unknown): obj is AndroidData {
    return (
      typeof obj === 'object' &&
      obj !== null &&
      'device' in obj &&
      'type' in obj &&
      'content' in obj &&
      typeof (obj as AndroidData).device === 'string' &&
      typeof (obj as AndroidData).type === 'string'
    );
  }
}
