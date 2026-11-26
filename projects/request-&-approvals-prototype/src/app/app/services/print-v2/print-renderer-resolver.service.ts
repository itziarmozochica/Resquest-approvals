import { inject, Injectable } from '@angular/core';

import { BrowserPdfPrintRenderer } from '../print-renderer-browser-pdf/browser-pdf-print.renderer';
import { ZebraPrintRenderer } from '../print-renderer-zebra/zebra-print.renderer';
import { PrintRenderer } from '../print-renderer/print.renderer';
import { PrintCommandPrinterType } from './models/print-command.model';

@Injectable({
  providedIn: 'root',
})
export class PrintRendererResolverService {
  readonly #renderers: Readonly<Partial<Record<PrintCommandPrinterType, PrintRenderer>>> = {
    [PrintCommandPrinterType.browser_pdf]: inject(BrowserPdfPrintRenderer),
    [PrintCommandPrinterType.zebra]: inject(ZebraPrintRenderer),
  };

  resolve(printerType: PrintCommandPrinterType): PrintRenderer | null {
    return this.#renderers[printerType] ?? null;
  }
}
