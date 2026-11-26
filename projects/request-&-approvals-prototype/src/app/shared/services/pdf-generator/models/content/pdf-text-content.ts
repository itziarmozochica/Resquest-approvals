import { JsonObject } from '../../../../models/json-object';
import { PdfContent } from './pdf-content';

export class PdfTextContent extends PdfContent<string> {
  generateContent(): JsonObject {
    return {
      text: this.data,
      style: this.style,
    };
  }
}
