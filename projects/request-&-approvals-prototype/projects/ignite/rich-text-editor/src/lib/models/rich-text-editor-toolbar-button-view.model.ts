import type { IgntIconName } from '@ignite/icon';

import type { IgntRichTextEditorFeature } from './enums/rich-text-editor-feature.enum';

export interface IgntRichTextEditorToolbarButtonView {
  action: IgntRichTextEditorFeature;
  ariaControls: string | null;
  ariaExpanded: string | null;
  ariaLabel: string;
  ariaPressed: string | null;
  disabled: boolean;
  icon: IgntIconName;
  isActive: boolean;
}
