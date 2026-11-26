import { PrinterErrors } from '@fz-original/app/shared/services/zebra-printer/models/printer-errors.enum';

const failedToFetchMessage = 'TypeError: Failed to fetch';

export function isPrinterError(error: unknown): error is PrinterErrors {
  return typeof error === 'string' && (Object.values(PrinterErrors) as string[]).includes(error); // widening for the lookup only
}

export function toDesktopSendError(error: unknown): unknown {
  return String(error).includes(failedToFetchMessage) ? PrinterErrors.FailedToFetchError : error;
}

export function toDesktopPrinterLookupError(error: unknown): PrinterErrors {
  return error === PrinterErrors.UnableEstablishConnection ? PrinterErrors.UnableEstablishConnection : PrinterErrors.FailedToFetchError;
}

export function toFolioZeroPrinterError(error: unknown): PrinterErrors {
  if (isPrinterError(error)) {
    return error;
  }

  if (error instanceof Error && String(error).includes(failedToFetchMessage)) {
    return PrinterErrors.FailedToFetchError;
  }

  return PrinterErrors.UnknownError;
}
