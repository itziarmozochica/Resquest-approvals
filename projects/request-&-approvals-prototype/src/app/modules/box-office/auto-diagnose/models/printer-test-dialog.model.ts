import { TicketPrinterSetup } from './printer-diagnose.model';

export interface PrinterTestDialogData {
  deviceName: string;
  hasReceiptPrinter: boolean;
  setupName: string;
  ticketPrinter: TicketPrinterSetup | null;
}

export enum ReceiptTestPhase {
  awaitingConfirmation = 'awaitingConfirmation',
  idle = 'idle',
}
