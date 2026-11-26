import { PrintImagesPrinterSettings } from '@fz-original/app/shared/services/webview-messenger/models/print-images-message.model';

import { PrintableObject } from '../../print-v2/models/print-command.model';

export enum PrintRepresentationType {
  images = 'images',
  pdf = 'pdf',
}

export interface PrintableImagesRepresentation {
  base64Images: string[];
  type: PrintRepresentationType.images;
  // Known only once the images are rendered, so they travel with them rather than with the printer config.
  printerSettings?: PrintImagesPrinterSettings;
}

export interface PrintablePdfRepresentation {
  fileName: string;
  pdf: Blob;
  type: PrintRepresentationType.pdf;
}

export type PrintableRepresentation = PrintableImagesRepresentation | PrintablePdfRepresentation;

export class UnsupportedPrintRepresentationError extends Error {
  readonly adapter: string;
  readonly representationType: PrintRepresentationType;

  constructor(adapter: string, representationType: PrintRepresentationType) {
    super(`${adapter} cannot print a "${representationType}" representation`);
    this.name = 'UnsupportedPrintRepresentationError';
    this.adapter = adapter;
    this.representationType = representationType;
  }
}

export interface RenderedPrintable {
  printable: PrintableObject;
  representation: PrintableRepresentation;
}

export class PrintAdapterError extends Error {
  readonly printerStatus?: string;
  readonly reason: string;

  constructor(message: string, reason: string, printerStatus?: string) {
    super(message);
    this.name = 'PrintAdapterError';
    this.printerStatus = printerStatus;
    this.reason = reason;
  }
}

export class PrintPdfRequestedError extends PrintAdapterError {
  constructor(printerStatus?: string) {
    super('The operator chose to download the tickets as a PDF', 'pdf_requested', printerStatus);
    this.name = 'PrintPdfRequestedError';
  }
}
