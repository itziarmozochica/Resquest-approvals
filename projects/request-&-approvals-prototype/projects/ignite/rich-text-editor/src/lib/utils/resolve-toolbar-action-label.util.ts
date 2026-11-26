import type { IgntRichTextEditorToolbarActionLabelKey } from '../models/constants/rich-text-editor-toolbar-action-config.const';
import type { ResolvedIgntRichTextEditorTranslations } from '../models/rich-text-editor-translations.model';

const TOOLBAR_MODIFIER_LABEL = 'Ctrl';

export function resolveIgntRichTextEditorToolbarActionLabel(
  translations: ResolvedIgntRichTextEditorTranslations,
  labelKey: IgntRichTextEditorToolbarActionLabelKey,
): string {
  const [section, key] = labelKey.split('.') as ['alignmentMenu' | 'toolbar', string];

  if (section === 'alignmentMenu') {
    return translations.alignmentMenu[key as keyof ResolvedIgntRichTextEditorTranslations['alignmentMenu']];
  }

  const toolbarValue = translations.toolbar[key as keyof ResolvedIgntRichTextEditorTranslations['toolbar']];

  if (typeof toolbarValue === 'function') {
    return toolbarValue(TOOLBAR_MODIFIER_LABEL);
  }

  return toolbarValue;
}
