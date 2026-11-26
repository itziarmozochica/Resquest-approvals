import { JsonObject } from '../../../../models/json-object';

export abstract class PdfContent<T> {
  protected data: T;
  protected style: string;

  constructor(data: T, style: string = '') {
    this.data = data;
    this.style = style;
  }

  abstract generateContent(): JsonObject;
}
