import { PrinterInstruction } from '@fz-original/app/modules/kiosk/services/printer/models/printer-instruction.model';

const ALIGN_CENTER = 1;
const ALIGN_LEFT = 0;
const BOLD_ON = 1;
const BOLD_OFF = 0;
const NEW_LINE = 0;
const QR_MODULE_SIZE = 6;
const FULL_CUT = 0;

export interface PrinterTestReceiptContent {
  deviceName: string;
  printedAt: string;
  qrContent: string;
  setupName: string;
  title: string;
}

/** ESC/POS instructions in the JSON shape kiosk-android's `EscPosCommandParser` reads. */
export function buildPrinterTestReceipt(content: PrinterTestReceiptContent): PrinterInstruction[] {
  return [
    { parameters: [ALIGN_CENTER], type: 'SetAlignment' },
    { parameters: [BOLD_ON], type: 'SetBold' },
    { parameters: ['Fever Zone', NEW_LINE], type: 'PrintString' },
    { parameters: [content.title, NEW_LINE], type: 'PrintString' },
    { parameters: [BOLD_OFF], type: 'SetBold' },
    { parameters: [1], type: 'PrintFeedline' },
    { parameters: [ALIGN_LEFT], type: 'SetAlignment' },
    { parameters: [content.setupName, NEW_LINE], type: 'PrintString' },
    { parameters: [content.deviceName, NEW_LINE], type: 'PrintString' },
    { parameters: [content.printedAt, NEW_LINE], type: 'PrintString' },
    { parameters: [1], type: 'PrintFeedline' },
    { parameters: [ALIGN_CENTER], type: 'SetAlignment' },
    { parameters: [QR_MODULE_SIZE, content.qrContent], type: 'PrintQrCodeT500II' },
    { parameters: [4], type: 'PrintFeedline' },
    { parameters: [FULL_CUT], type: 'PrintCutpaper' },
  ];
}
