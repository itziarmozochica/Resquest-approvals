import { JsonObject } from '../../../../models/json-object';
import { PdfContent } from './pdf-content';

export interface PdfImageData {
  image: string;
  height?: number;
  width?: number;
}

export class PdfImageContent extends PdfContent<PdfImageData> {
  generateContent(): JsonObject {
    return {
      width: this.data.width,
      height: this.data.height,
      image: this.data.image,
      style: this.style,
    };
  }
}
