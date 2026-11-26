export interface HtmlRenderResult {
  base64Images: string[];
  documentCount: number;
  rasterizeDurationMs: number;
  requestDurationMs: number;
  slowestDocumentMs: number;
  templateLayoutName: string;
}
