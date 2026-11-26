export interface RenderedPrintDocumentDTO {
  code_id: number | null;
  html: string;
}

export interface RenderedPrintDocumentsDTO {
  documents: RenderedPrintDocumentDTO[];
  template_layout_name: string;
  shared_styles?: string;
}

export interface RenderedPrintDocumentsApiResponseBody {
  data: RenderedPrintDocumentsDTO | null;
  error: unknown;
}
