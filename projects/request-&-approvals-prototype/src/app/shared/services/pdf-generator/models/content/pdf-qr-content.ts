import { JsonObject } from '../../../../models/json-object';
import { PdfContent } from './pdf-content';

export interface PdfQrData {
  fit: number;
  qr: string;
}

export class PdfQrContent extends PdfContent<PdfQrData> {
  generateContent(): JsonObject {
    return {
      fit: this.data.fit,
      qr: this.data.qr,
      style: this.style,
    };
  }
}
