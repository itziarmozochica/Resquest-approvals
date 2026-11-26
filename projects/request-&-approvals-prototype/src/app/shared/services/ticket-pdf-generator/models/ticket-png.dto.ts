export interface RenderedPrintDocumentImageDTO {
  code_id: number | null;
  pngs: string[];
}

export interface RenderedPrintDocumentZebraPrinterSettingsDTO {
  backfeed_before_cut: boolean;
  mark_offset_dots: number;
}

// Keyed by the printer the settings apply to.
export interface RenderedPrintDocumentPrinterSettingsDTO {
  zebra?: RenderedPrintDocumentZebraPrinterSettingsDTO;
}

export interface RenderedPrintDocumentImagesDTO {
  documents: RenderedPrintDocumentImageDTO[];
  template_layout_name: string;
  // Null, or missing on a backend that predates it, when the layout prints with the printer's defaults.
  printer_settings?: RenderedPrintDocumentPrinterSettingsDTO | null;
}

export interface RenderedPrintDocumentImagesApiResponseBody {
  data: RenderedPrintDocumentImagesDTO | null;
  error: unknown;
}
