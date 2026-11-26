import { IgntRichTextEditorFeature } from '../models/enums/rich-text-editor-feature.enum';
import { isFeatureEnabled } from './build-extensions.util';

export function collectToolbarActions(
  toolbarFeatures: ReadonlySet<IgntRichTextEditorFeature>,
  matches: (feature: IgntRichTextEditorFeature) => boolean,
): ReadonlySet<IgntRichTextEditorFeature> {
  const collected = new Set<IgntRichTextEditorFeature>();

  for (const feature of Object.values(IgntRichTextEditorFeature)) {
    if (isFeatureEnabled(toolbarFeatures, feature) && matches(feature)) {
      collected.add(feature);
    }
  }

  return collected;
}
