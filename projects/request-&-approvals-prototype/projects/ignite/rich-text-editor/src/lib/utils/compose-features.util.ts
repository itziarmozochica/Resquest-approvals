import type { IgntRichTextEditorFeature } from '../models/enums/rich-text-editor-feature.enum';

export interface IgntRichTextEditorComposeFeaturesOptions {
  add?: IgntRichTextEditorFeature[];
  remove?: IgntRichTextEditorFeature[];
}

export function composeIgntRichTextEditorFeatures(
  base: ReadonlySet<IgntRichTextEditorFeature>,
  options: IgntRichTextEditorComposeFeaturesOptions,
): ReadonlySet<IgntRichTextEditorFeature> {
  const composed = new Set(base);

  options.remove?.forEach((feature: IgntRichTextEditorFeature) => {
    composed.delete(feature);
  });

  options.add?.forEach((feature: IgntRichTextEditorFeature) => {
    composed.add(feature);
  });

  return composed;
}
