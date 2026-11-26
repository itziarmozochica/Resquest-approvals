import { PrinterInstruction } from '../../../../modules/kiosk/services/printer/models/printer-instruction.model';

export interface PrintErrorPaymentReceiptMessagePayload {
  instructions: Array<PrinterInstruction>;
}
