import { PrintImagesPrinterSettings } from '../../webview-messenger/models/print-images-message.model';

export interface PngRenderResult {
  documents: string[][];
  requestDurationMs: number;
  templateLayoutName: string;
  printerSettings?: PrintImagesPrinterSettings;
}
