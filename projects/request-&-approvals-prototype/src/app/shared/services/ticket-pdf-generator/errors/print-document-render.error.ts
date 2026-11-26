// A timeout, a count mismatch, a 5xx from the endpoint and a canvas that never rasterized are four
// different incidents with four different owners, and they all surface as the same rejected promise. The
// reason travels with the error so the print path can log something alertable instead of one flat message.
export type PrintDocumentRenderFailureReason =
  | 'config_error'
  | 'count_mismatch'
  | 'empty_response'
  | 'http_error'
  | 'page_overflow'
  | 'raster_error';

export class PrintDocumentRenderError extends Error {
  readonly apiCode?: string;
  readonly reason: PrintDocumentRenderFailureReason;
  readonly status?: number;

  constructor(message: string, reason: PrintDocumentRenderFailureReason, status?: number, apiCode?: string) {
    super(message);
    this.name = 'PrintDocumentRenderError';
    this.apiCode = apiCode;
    this.reason = reason;
    this.status = status;
  }
}
