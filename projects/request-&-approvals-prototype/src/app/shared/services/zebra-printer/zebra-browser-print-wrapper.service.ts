import { StorageKey } from '@fz-original/app/app/enums/storage.enum';

import { DatadogLogService } from '../../../core/error/datadog/logger/datadog-log.service';
import { PrinterErrors } from './models/printer-errors.enum';
import { PrinterStatus } from './models/printer-status.model';
import { ZebraPrinter } from './models/zebra-printer.model';

const API_URL = 'http://localhost:9100/';
const statusCommand = '~HS';

export default class ZebraBrowserPrintWrapper {
  device: ZebraPrinter | null = null;

  constructor(private datadogLogService: DatadogLogService) {}

  getDefaultPrinter = async (): Promise<ZebraPrinter | null> => {
    if (this.device != null) {
      return this.device;
    }
    const config = {
      method: 'GET',
      headers: {
        'Content-Type': 'text/plain;charset=UTF-8',
      },
    };

    const endpoint = API_URL + 'default';

    try {
      const res = await fetch(endpoint, config);
      const data = await res.text();

      if (data && typeof data !== 'object' && data.split('\n\t').length === 7) {
        const deviceRaw = data.split('\n\t');

        const name = this.cleanUpString(deviceRaw[1]);
        const deviceType = this.cleanUpString(deviceRaw[2]);
        const connection = this.cleanUpString(deviceRaw[3]);
        const uid = this.cleanUpString(deviceRaw[4]);
        const provider = this.cleanUpString(deviceRaw[5]);
        const manufacturer = this.cleanUpString(deviceRaw[6]);

        const printer: ZebraPrinter = {
          connection,
          deviceType,
          manufacturer,
          name,
          provider,
          uid,
          version: 0,
        };
        this.sendLogsInfo(`getDefaultPrinter: ${printer}`, { printer });

        return printer;
      }
      return null;
    } catch (error) {
      this.sendLogsError(`getDefaultPrinter: NoDefaultPrinterConfigured, error: ${error}`, { printer: this.device });
      throw PrinterErrors.NoDefaultPrinterConfigured;
    }
  };

  setPrinter = (device: ZebraPrinter): void => {
    this.device = device;
    if (JSON.stringify(device) !== localStorage.getItem(StorageKey.zebraPrinter)) {
      localStorage.setItem(StorageKey.zebraPrinter, JSON.stringify(device));
      this.sendLogsInfo(`setPrinter to localStorage: ${device}`, { printer: device });
    }
  };

  getPrinter = (): ZebraPrinter | null => {
    const storedPrinter = localStorage.getItem(StorageKey.zebraPrinter);
    this.sendLogsInfo(`getPrinter from localStorage: ${storedPrinter}`, { printer: storedPrinter });
    return storedPrinter ? JSON.parse(storedPrinter) : null;
  };

  clearPrinter = () => {
    localStorage.removeItem(StorageKey.zebraPrinter);
    this.device = null;
    this.sendLogsInfo(`clearPrinter`, { printer: this.device });
  };

  getAvailablePrinters = async () => {
    const config = {
      method: 'GET',
      headers: {
        'Content-Type': 'text/plain;charset=UTF-8',
      },
    };

    const endpoint = API_URL + 'available';

    const res = await fetch(endpoint, config);

    const data = await res.json();

    if (data?.printer?.length > 0) {
      this.sendLogsInfo(`getAvailablePrinters: ${data.printer}`, { printers: data.printer });
      return data.printer;
    }
    this.sendLogsError('getAvailablePrinters: No printers available');
    return [];
  };

  cleanUpString = (str: string): string => {
    const arr = str.split(':');
    return arr[1].trim();
  };

  getPrinterStatus(hsResponse: string | null | undefined): PrinterStatus {
    const result: PrinterStatus = {
      isReadyToPrint: false,
      errors: [],
    };
    let isPausedStatus = false;
    if (!hsResponse || hsResponse.trim() === '') {
      result.errors.push(PrinterErrors.EmptyStateError);
      return result;
    }
    if (hsResponse.includes('Unable to establish connection')) {
      result.errors.push(PrinterErrors.UnableEstablishConnection);
      return result;
    } else if (hsResponse.includes('TypeError: Failed to fetch')) {
      result.errors.push(PrinterErrors.FailedToFetchError);
      return result;
    } else if (hsResponse.includes('Unauthorized device detected') || hsResponse.includes('Value null at device')) {
      result.errors.push(PrinterErrors.UnauthorizedDeviceError);
      return result;
    } else if (hsResponse.includes('No value for device')) {
      result.errors.push(PrinterErrors.NoDefaultPrinterConfigured);
      return result;
    } else if (hsResponse.includes('Software caused connection abort')) {
      result.errors.push(PrinterErrors.SoftwareCausedConnection);
      return result;
    }

    const cleanedResponse = hsResponse
      // eslint-disable-next-line no-control-regex
      .replace(/\x02/g, '')
      // eslint-disable-next-line no-control-regex
      .replace(/\x03\r?\n?/g, '\n')
      // eslint-disable-next-line no-control-regex
      .replace(/\x03/g, '');

    const lines = cleanedResponse.trim().split(/\r?\n/);
    if (lines.length < 1) {
      result.errors.push(PrinterErrors.IncorrectErrorCode); //'Respuesta ~HS inválida (no hay suficientes líneas).');
      return result;
    }
    let isCurrentlyReady = true;
    if (lines[0]) {
      const fieldsL1 = lines[0].split(',');
      if (fieldsL1.length >= 12) {
        if (fieldsL1[1] === '1') {
          isCurrentlyReady = false;
          result.errors.push(PrinterErrors.PaperOut);
        }
        if (fieldsL1[2] === '1') {
          isCurrentlyReady = false;
          isPausedStatus = true;
        }
        if (fieldsL1[9] === '1') {
          isCurrentlyReady = false;
          result.errors.push(PrinterErrors.CorruptRAMError);
        }
        if (fieldsL1[10] === '1') {
          isCurrentlyReady = false;
          result.errors.push(PrinterErrors.PrinterTemperatureTooLow);
        }
        if (fieldsL1[11] === '1') {
          isCurrentlyReady = false;
          result.errors.push(PrinterErrors.PrinterTemperatureTooHigh);
        }
      } else {
        isCurrentlyReady = false;
        result.errors.push(PrinterErrors.IncorrectErrorCode);
      }
    } else {
      isCurrentlyReady = false;
      result.errors.push(PrinterErrors.IncorrectErrorCode);
    }

    let thermalTransferModeSelected = false;
    if (lines.length > 1 && lines[1]) {
      const fieldsL2 = lines[1].split(',');
      if (fieldsL2.length >= 5) {
        if (fieldsL2[2] === '1') {
          isCurrentlyReady = false;
          result.errors.push(PrinterErrors.MediaDoorOpen);
        }
        thermalTransferModeSelected = fieldsL2[4] === '1';
        if (thermalTransferModeSelected && fieldsL2[3] === '1') {
          isCurrentlyReady = false;
          result.errors.push(PrinterErrors.RibbonOut);
        }
      } else {
        if (isCurrentlyReady) {
          isCurrentlyReady = false;
          result.errors.push(PrinterErrors.IncorrectErrorCode);
        }
      }
    } else if (lines.length <= 1 && isCurrentlyReady) {
      isCurrentlyReady = false;
      result.errors.push(PrinterErrors.IncorrectErrorCode);
    }
    result.isReadyToPrint = isCurrentlyReady;
    if (!isCurrentlyReady && isPausedStatus) {
      result.errors.push(PrinterErrors.PrinterPaused);
    }
    if (!isCurrentlyReady && result.errors.length === 0) {
      result.errors.push(PrinterErrors.IncorrectErrorCode);
    }
    if (isCurrentlyReady && result.errors.length > 0) {
      result.isReadyToPrint = false;
    }
    if (isCurrentlyReady) {
      result.errors = [];
    }
    return result;
  }

  checkPrinterStatus = async (orderId?: number, singleRetry?: boolean): Promise<PrinterStatus> => {
    const waitToStatusResponseMs = 500;
    const waitToStatusResponseAfterAutoRetryMs = 2000;
    await this.write(statusCommand);
    await new Promise(resolve => setTimeout(resolve, waitToStatusResponseMs));
    let result = await this.read(orderId);
    this.sendLogsInfo(`After command(${statusCommand}), status:${result}`, {
      orderId,
      command: statusCommand,
      printerStatus: result,
      printer: this.device,
    });
    if (!result || result.length === 0) {
      this.sendLogsWarn(`Detect empty status`, { orderId, printerStatus: result, printer: this.device });
      await new Promise(resolve => setTimeout(resolve, waitToStatusResponseAfterAutoRetryMs));
      result = await this.read(orderId);
      this.sendLogsInfo(`Status after (${waitToStatusResponseAfterAutoRetryMs} ms)  and auto-retry, status:${result}`, {
        orderId,
        command: statusCommand,
        printerStatus: result,
        printer: this.device,
      });

      if (!result || result.length === 0) {
        return {
          isReadyToPrint: false,
          errors: [PrinterErrors.EmptyStateError],
        };
      }
    }
    const status = this.getPrinterStatus(result);

    if (status.errors.length > 0 && status.errors[0] === PrinterErrors.PrinterPaused && !singleRetry) {
      this.sendLogsWarn('Detect Paused status and auto-retry unpaused', { orderId, printer: this.device });
      await this.write('~PS');
      this.sendLogsInfo('Auto-send unpaused command: ~PS', { orderId, printer: this.device });
      await new Promise(resolve => setTimeout(resolve, waitToStatusResponseMs));
      return await this.checkPrinterStatus(orderId, true);
    }
    return status;
  };

  write = async (data: string) => {
    try {
      const endpoint = API_URL + 'write';

      const myData = {
        device: this.device,
        data,
      };

      const config = {
        method: 'POST',
        headers: {
          'Content-Type': 'text/plain;charset=UTF-8',
        },
        body: JSON.stringify(myData),
      };
      this.sendLogsInfo(`write: ${data}`, { printer: this.device });
      await fetch(endpoint, config);
    } catch (error) {
      this.sendLogsError(`write: ${error}`, { printer: this.device });
      throw new Error(error as string);
    }
  };

  writeBlob = async (data: Blob) => {
    try {
      const endpoint = API_URL + 'write';

      const deviceData = {
        device: this.device,
      };

      const formData = new FormData();
      formData.append('json', JSON.stringify(deviceData));
      formData.append('blob', data);

      const config = {
        method: 'POST',
        body: formData,
      };

      this.sendLogsInfo(`writeBlob: ${data}`, { printer: this.device });
      await fetch(endpoint, config);
    } catch (error) {
      this.sendLogsError(`writeBlob: ${error}`, { printer: this.device });
      throw new Error(error as string);
    }
  };

  writeUrl = async (url: string) => {
    try {
      const endpoint = API_URL + 'write';

      const deviceData = {
        device: this.device,
      };

      const contentBlob = await fetch(url).then(r => r.blob());

      const formData = new FormData();
      formData.append('json', JSON.stringify(deviceData));
      formData.append('blob', contentBlob);

      const config = {
        method: 'POST',
        body: formData,
      };

      this.sendLogsInfo(`writeUrl: ${url}`, { printer: this.device });
      await fetch(endpoint, config);
    } catch (error) {
      this.sendLogsError(`writeUrl: ${error}`, { printer: this.device });
      throw new Error(error as string);
    }
  };

  read = async (orderId?: number) => {
    try {
      const endpoint = API_URL + 'read';

      const myData = {
        device: this.device,
      };

      const config = {
        method: 'POST',
        headers: {
          'Content-Type': 'text/plain;charset=UTF-8',
        },
        body: JSON.stringify(myData),
      };

      const res = await fetch(endpoint, config);
      const data = await res.text();
      this.sendLogsInfo(`read: ${data}`, { orderId, printer: this.device });
      return data;
    } catch (error) {
      this.sendLogsError(`read: ${error}`, { orderId, printer: this.device });
      throw new Error(error as string);
    }
  };

  print = async (text: string, orderId: number) => {
    try {
      this.sendLogsInfo(`print: ${text}`, { orderId, printer: this.device });
      await this.write(text);
    } catch (error) {
      this.sendLogsError(`print: ${error}`, { orderId, printer: this.device });
      throw new Error(error as string);
    }
  };

  printBlob = async (text: Blob) => {
    try {
      await this.writeBlob(text);
    } catch (error) {
      this.sendLogsError(`printBlob: ${error}`, { printer: this.device });
      throw new Error(error as string);
    }
  };

  printUrl = async (url: string) => {
    try {
      await this.writeUrl(url);
    } catch (error) {
      this.sendLogsError(`printUrl: ${error}`, { printer: this.device });
      throw new Error(error as string);
    }
  };

  sendLogsInfo = (message: string, payload?: { [key: string]: any }): void => {
    const orderIdLog = payload?.orderId ? `orderId: ${payload.orderId}` : '';
    this.datadogLogService.logInfo(`[ZebraPrinter] ${orderIdLog}, ${message}`, payload);
  };

  sendLogsWarn = (message: string, payload?: { [key: string]: any }): void => {
    const orderIdLog = payload?.orderId ? `orderId: ${payload.orderId}` : '';
    this.datadogLogService.logWarn(`[ZebraPrinter] ${orderIdLog}, ${message}`, payload);
  };

  sendLogsError = (message: string, payload?: { [key: string]: any }): void => {
    const orderIdLog = payload?.orderId ? `orderId: ${payload.orderId}` : '';
    this.datadogLogService.logError(`[ZebraPrinter] ${orderIdLog}, ${message}`, payload);
  };
}
