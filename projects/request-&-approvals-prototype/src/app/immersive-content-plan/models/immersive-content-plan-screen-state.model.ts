export type ScreenState = 'document' | 'empty' | 'error' | 'failed' | 'generating' | 'loading';

export interface ImmersiveLocaleEntry {
  label: string;
  missing: number;
  value: string;
}

export interface ImmersiveContentPlanModuleGapView {
  fixed: boolean;
  gapCount: number;
  id: string;
  // This module's real position in `layout.schema.modules`: a product-hidden module type is
  // filtered out of the list this view travels in, so positions here compress relative to the
  // document, and this is what a reorder drop must translate back through — see
  // `resolveModuleMoveIndexes`.
  index: number;
  label: string;
  type: string;
  unsupported: boolean;
}
