import { CutterTypeEnum, HardwareTypeEnum, PaperTypeEnum } from '@fz-original/app/modules/box-office/shared/models/onsite-setup';
import { DeviceType } from '@fz-original/app/shared/models/device/device.model';
import { Order } from '@fz-original/app/shared/models/order/order.model';

import { PrintDeviceHardwareType } from './print-block.model';

export const printCommandDefaultLocale = 'en';

export const printCommandMaxCodeIdsPerPrintable = 100;

export const printCommandBackendLocales: Record<string, string> = {
  de: 'de_DE',
  en: 'en',
  es: 'es_ES',
  fr: 'fr_FR',
  it: 'it_IT',
  ko: 'ko_KR',
  pt: 'pt_PT',
  'pt-BR': 'pt_BR',
  'pt-PT': 'pt_PT',
};

export enum PrintV2Outcome {
  blocked = 'blocked',
  pdf_requested = 'pdf_requested',
  printed_failure = 'printed_failure',
  printed_success = 'printed_success',
}

export enum PrintCommandBuildError {
  no_partner = 'no_partner',
  no_printable_orders = 'no_printable_orders',
}

export enum PrintCommandRenderType {
  backend = 'backend',
}

export enum PrintCommandDocumentType {
  ticket = 'ticket',
}

export enum PrintCommandPrinterType {
  adyen = 'adyen',
  browser_pdf = 'browser_pdf',
  zebra = 'zebra',
}

export interface PrintContext {
  deviceHardwareType: PrintDeviceHardwareType | null;
  deviceType: DeviceType | null;
  locale: string;
  onsiteSetupId: string | undefined;
  partnerId: number;
  setupHardwareType: HardwareTypeEnum;
}

export interface DocumentSpecificConfig {
  documentType: PrintCommandDocumentType;
  renderType: PrintCommandRenderType;
}

export interface PrintableObject {
  codeIds: string[];
  hidePrice: boolean;
  order: Order;
  shouldRotate: boolean;
  unifyTickets: boolean;
}

export interface AdyenPrinterConfig {
  printerType: PrintCommandPrinterType.adyen;
}

export interface BrowserPdfPrinterConfig {
  isForced: boolean;
  printerType: PrintCommandPrinterType.browser_pdf;
  shouldDownload: boolean;
}

export interface ZebraPrinterConfig {
  appVersion: string | null;
  cutterType: CutterTypeEnum;
  paperType: PaperTypeEnum;
  printerType: PrintCommandPrinterType.zebra;
  shouldCutEveryTicket: boolean;
}

export type PrinterSpecificConfig = AdyenPrinterConfig | BrowserPdfPrinterConfig | ZebraPrinterConfig;

export interface PrintCommand {
  context: PrintContext;
  document: DocumentSpecificConfig;
  printables: PrintableObject[];
  printer: PrinterSpecificConfig;
}

export type PrintCommandBuildResult = { command: PrintCommand } | { error: PrintCommandBuildError };

export class PrintRenderAbandonedError extends Error {
  readonly renderError: unknown;

  constructor(renderError: unknown) {
    super('The operator declined to retry the render');
    this.name = 'PrintRenderAbandonedError';
    this.renderError = renderError;
  }
}
