import { Injectable } from '@angular/core';

import { PrinterErrors } from '@fz-original/app/shared/services/zebra-printer/models/printer-errors.enum';

import { DatadogLogService } from '../../../core/error/datadog/logger/datadog-log.service';
import { ZebraPrinter } from './models/zebra-printer.model';
import ZebraBrowserPrintWrapper from './zebra-browser-print-wrapper.service';

@Injectable({
  providedIn: 'root',
})
export abstract class ZebraPrinterService {
  private browserPrint: ZebraBrowserPrintWrapper;

  protected constructor(private datadogLogService: DatadogLogService) {
    this.browserPrint = new ZebraBrowserPrintWrapper(datadogLogService);
  }

  async getDefaultPrinter(): Promise<ZebraPrinter> {
    let zebraPrinter = this.browserPrint.getPrinter();
    if (!zebraPrinter || this.isNotValidPrinter(zebraPrinter)) {
      const printerList: ZebraPrinter[] = await this.browserPrint.getAvailablePrinters();
      if (printerList.length === 0 || this.isNotValidPrinter(printerList[0])) {
        throw PrinterErrors.UnableEstablishConnection;
      }
      zebraPrinter = printerList[0];
    }
    this.setDefaultPrinter(zebraPrinter);
    return zebraPrinter;
  }

  async sendToPrinter(zplCode: string, orderId?: number): Promise<void> {
    const printerStatus = await this.browserPrint.checkPrinterStatus(orderId);

    if (printerStatus.isReadyToPrint) {
      return await this.browserPrint.print(zplCode, orderId!);
    } else {
      const error = printerStatus.errors[0];
      if (error !== PrinterErrors.UnableEstablishConnection && error !== PrinterErrors.UnauthorizedDeviceError) {
        throw error;
      }
      const printerList: ZebraPrinter[] = await this.browserPrint.getAvailablePrinters();
      if (printerList.length === 0 || this.isNotValidPrinter(printerList[0])) {
        throw PrinterErrors.UnableEstablishConnection;
      }
      const newZebraPrinter = printerList[0];
      this.setDefaultPrinter(newZebraPrinter);
      return this.sendToPrinter(zplCode, orderId);
    }
  }

  setDefaultPrinter(device: ZebraPrinter): void {
    return this.browserPrint.setPrinter(device);
  }

  private isNotValidPrinter(zebraPrinter: ZebraPrinter): boolean {
    const uidPattern = /(^|[^a-z0-9])d6[a-z]\d{9}($|[^a-z0-9])/i;
    return !zebraPrinter.name || zebraPrinter.uid === ':9100' || !uidPattern.test(zebraPrinter.uid);
  }
}
