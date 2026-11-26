import type { Observable } from 'rxjs';

import { IgntRichTextEditorFeature } from '../models/enums/rich-text-editor-feature.enum';

export interface IgntRichTextEditorResolveFeaturesOptions {
  imageUpload: ((file: File) => Observable<string> | null) | null | undefined;
}

export function resolveFeatures(
  rawFeatures: ReadonlySet<IgntRichTextEditorFeature>,
  options: IgntRichTextEditorResolveFeaturesOptions,
): ReadonlySet<IgntRichTextEditorFeature> {
  const resolved = new Set(rawFeatures);
  const hasImageUpload = typeof options.imageUpload === 'function';
  const imageSubFeatures = [
    IgntRichTextEditorFeature.ImageFullWidth,
    IgntRichTextEditorFeature.ImageAlignLeft,
    IgntRichTextEditorFeature.ImageAlignCenter,
    IgntRichTextEditorFeature.ImageAlignRight,
  ];

  if (!hasImageUpload) {
    resolved.delete(IgntRichTextEditorFeature.Image);
  }

  // Image sub-actions (full width, alignment) only make sense alongside the image node itself.
  if (!resolved.has(IgntRichTextEditorFeature.Image)) {
    for (const feature of imageSubFeatures) {
      resolved.delete(feature);
    }
  }

  return resolved;
}
