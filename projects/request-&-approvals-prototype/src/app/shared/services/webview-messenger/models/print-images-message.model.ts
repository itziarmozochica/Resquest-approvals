import { WebViewMessage } from '@feverup/ts-webview';

import { PrintOrderImageMessageOrderPayload } from './print-order-image-message.model';
import { WebViewTypeMessage } from './web-view-type-message.model';

export type PrintImagesCut = 'full' | 'partial' | 'none';
export type PrintImagesPrinter = 'zebra' | 'epson';
export type PrintImagesPaper = 'basic-paper' | 'pre-printed-paper';
// When the printer backfeeds, as `~JS` sets it: `before` backfeeds entirely before each label and none
// after a cut.
export type PrintImagesBackfeedSequence = 'before' | 'normal';

// What the stock a layout prints on needs from the printer. The backfeed is resolved with the cutter the
// host cuts with, so the cut and the backfeed always follow the same setting.
export interface PrintImagesPrinterSettings {
  backfeedBeforeCut: boolean;
  markOffsetDots: number;
}

export interface PrintImagesMetadata {
  orderId?: number;
  orderPlanName?: string;
  orderTicketCodes?: string[];
  orderUserEmail?: string;
  orderUserId?: number;
  orders?: PrintOrderImageMessageOrderPayload[];
  planId?: number;
  useUnifiedTicket?: boolean;
  userEmail?: string;
  userId?: number;
}

export interface PrintImagesMessagePayload {
  base64Images: string[];
  finalCut: PrintImagesCut;
  metadata: PrintImagesMetadata;
  middleCuts: PrintImagesCut;
  paperType: PrintImagesPaper;
  printer: PrintImagesPrinter;
  // The Android host honours it on any paper, and one that predates it, or a value it does not know,
  // keeps the normal sequence.
  backfeedSequence?: PrintImagesBackfeedSequence;
  // How far from the black mark each label starts, for stock printed on the front. The Android host
  // honours it on pre-printed paper only, and one that predates it prints as it would without.
  markOffsetDots?: number;
}

export class PrintImagesMessage implements WebViewMessage<PrintImagesMessagePayload> {
  payload: PrintImagesMessagePayload;
  type = WebViewTypeMessage.print_images;

  constructor(payload: PrintImagesMessagePayload) {
    this.payload = payload;
  }
}
