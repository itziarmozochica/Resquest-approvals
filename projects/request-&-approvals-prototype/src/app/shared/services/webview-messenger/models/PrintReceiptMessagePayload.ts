import { PrinterInstruction } from '../../../../modules/kiosk/services/printer/models/printer-instruction.model';

export interface PrintReceiptMessagePayload {
  instructions: Array<PrinterInstruction>;
}
