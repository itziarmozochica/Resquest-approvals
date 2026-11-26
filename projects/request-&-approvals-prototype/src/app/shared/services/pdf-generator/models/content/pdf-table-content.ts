import { JsonObject } from '../../../../models/json-object';
import { PdfContent } from './pdf-content';

export interface PdfTableData {
  layout: string;
  content: JsonObject;
  headerRows?: number;
}

export class PdfTableContent extends PdfContent<PdfTableData> {
  generateContent(): JsonObject {
    return {
      layout: this.data.layout,
      table: this.data.content,
      style: this.style,
      headerRows: this.data.headerRows,
    };
  }
}
