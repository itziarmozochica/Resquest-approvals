import { PrintImagesPrinterSettings } from '@fz-original/app/shared/services/webview-messenger/models/print-images-message.model';

import { PrintableObject } from '../../print-v2/models/print-command.model';

export interface ZebraPrintChunkEntry {
  printable: PrintableObject;
  ticketCodes: string[];
}

export interface ZebraPrintChunk {
  base64Images: string[];
  entries: ZebraPrintChunkEntry[];
  // One print-images message carries one set of printer settings, so a chunk never mixes two.
  printerSettings?: PrintImagesPrinterSettings;
}
