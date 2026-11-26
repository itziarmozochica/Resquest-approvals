import { inject, Injectable } from '@angular/core';

import { HardwareTypeEnum } from '@fz-original/app/modules/box-office/shared/models/onsite-setup';

import { BrowserPdfPrintAdapter } from '../print-adapter-browser-pdf/browser-pdf-print.adapter';
import { ZebraDesktopPrintAdapter } from '../print-adapter-zebra-desktop/zebra-desktop-print.adapter';
import { ZebraDualScreenPrintAdapter } from '../print-adapter-zebra-dual-screen/zebra-dual-screen-print.adapter';
import { PrintAdapter } from '../print-adapter/print.adapter';
import { PrintDeviceHardwareType } from './models/print-block.model';
import { PrintCommandPrinterType } from './models/print-command.model';

type PrintAdapterEntry = PrintAdapter | Readonly<Partial<Record<PrintDeviceHardwareType, PrintAdapter>>>;

@Injectable({
  providedIn: 'root',
})
export class PrintAdapterResolverService {
  readonly #adapters: Readonly<Partial<Record<PrintCommandPrinterType, PrintAdapterEntry>>> = {
    [PrintCommandPrinterType.browser_pdf]: inject(BrowserPdfPrintAdapter),
    [PrintCommandPrinterType.zebra]: {
      [HardwareTypeEnum.desktop]: inject(ZebraDesktopPrintAdapter),
      [HardwareTypeEnum.dual_screen]: inject(ZebraDualScreenPrintAdapter),
    },
  };

  resolve(printerType: PrintCommandPrinterType, deviceHardwareType: PrintDeviceHardwareType | null): PrintAdapter | null {
    const entry: PrintAdapterEntry | undefined = this.#adapters[printerType];
    if (entry === undefined) {
      return null;
    }
    if (isPrintAdapter(entry)) {
      return entry;
    }

    return deviceHardwareType === null ? null : (entry[deviceHardwareType] ?? null);
  }
}

function isPrintAdapter(entry: PrintAdapterEntry): entry is PrintAdapter {
  return entry instanceof PrintAdapter;
}
