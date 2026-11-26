import { PrinterInstruction } from '../../../../modules/kiosk/services/printer/models/printer-instruction.model';

export interface PrintOrderMessagePayload {
  order_id: number;
  instructions: Array<PrinterInstruction>;
}
