import type { IgntIconName } from '@ignite/icon';

import { IgntRichTextEditorFeature } from '../enums/rich-text-editor-feature.enum';

export type IgntRichTextEditorToolbarActionLabelKey =
  | 'alignmentMenu.alignCenter'
  | 'alignmentMenu.alignLeft'
  | 'alignmentMenu.alignRight'
  | 'toolbar.bold'
  | 'toolbar.bulletList'
  | 'toolbar.clearFormat'
  | 'toolbar.emoji'
  | 'toolbar.image'
  | 'toolbar.imageAlignCenter'
  | 'toolbar.imageAlignLeft'
  | 'toolbar.imageAlignRight'
  | 'toolbar.imageFullWidth'
  | 'toolbar.italic'
  | 'toolbar.link'
  | 'toolbar.orderedList'
  | 'toolbar.sourceHtml'
  | 'toolbar.strike'
  | 'toolbar.underline';

export interface IgntRichTextEditorFeatureConfig {
  icon: IgntIconName;
  labelKey: IgntRichTextEditorToolbarActionLabelKey;
}

export const IGNT_RICH_TEXT_EDITOR_TOOLBAR_ACTION_CONFIG: Record<IgntRichTextEditorFeature, IgntRichTextEditorFeatureConfig> = {
  [IgntRichTextEditorFeature.AlignCenter]: {
    icon: 'align-center',
    labelKey: 'alignmentMenu.alignCenter',
  },
  [IgntRichTextEditorFeature.AlignLeft]: {
    icon: 'align-left',
    labelKey: 'alignmentMenu.alignLeft',
  },
  [IgntRichTextEditorFeature.AlignRight]: {
    icon: 'align-right',
    labelKey: 'alignmentMenu.alignRight',
  },
  [IgntRichTextEditorFeature.Bold]: {
    icon: 'bold',
    labelKey: 'toolbar.bold',
  },
  [IgntRichTextEditorFeature.BulletList]: {
    icon: 'list-ul',
    labelKey: 'toolbar.bulletList',
  },
  [IgntRichTextEditorFeature.Clean]: {
    icon: 'eraser',
    labelKey: 'toolbar.clearFormat',
  },
  [IgntRichTextEditorFeature.Emoji]: {
    icon: 'face-smile',
    labelKey: 'toolbar.emoji',
  },
  [IgntRichTextEditorFeature.Image]: {
    icon: 'image',
    labelKey: 'toolbar.image',
  },
  [IgntRichTextEditorFeature.ImageAlignCenter]: {
    icon: 'align-center',
    labelKey: 'toolbar.imageAlignCenter',
  },
  [IgntRichTextEditorFeature.ImageAlignLeft]: {
    icon: 'align-left',
    labelKey: 'toolbar.imageAlignLeft',
  },
  [IgntRichTextEditorFeature.ImageAlignRight]: {
    icon: 'align-right',
    labelKey: 'toolbar.imageAlignRight',
  },
  [IgntRichTextEditorFeature.ImageFullWidth]: {
    icon: 'expand',
    labelKey: 'toolbar.imageFullWidth',
  },
  [IgntRichTextEditorFeature.Italic]: {
    icon: 'italic',
    labelKey: 'toolbar.italic',
  },
  [IgntRichTextEditorFeature.Link]: {
    icon: 'link',
    labelKey: 'toolbar.link',
  },
  [IgntRichTextEditorFeature.OrderedList]: {
    icon: 'list-ol',
    labelKey: 'toolbar.orderedList',
  },
  [IgntRichTextEditorFeature.SourceHtml]: {
    icon: 'code',
    labelKey: 'toolbar.sourceHtml',
  },
  [IgntRichTextEditorFeature.Strike]: {
    icon: 'strikethrough',
    labelKey: 'toolbar.strike',
  },
  [IgntRichTextEditorFeature.Underline]: {
    icon: 'underline',
    labelKey: 'toolbar.underline',
  },
};

export const IGNT_RICH_TEXT_EDITOR_TOOLBAR_TOGGLE_ACTIONS: ReadonlySet<IgntRichTextEditorFeature> = new Set([
  IgntRichTextEditorFeature.AlignCenter,
  IgntRichTextEditorFeature.AlignLeft,
  IgntRichTextEditorFeature.AlignRight,
  IgntRichTextEditorFeature.Bold,
  IgntRichTextEditorFeature.BulletList,
  IgntRichTextEditorFeature.Emoji,
  IgntRichTextEditorFeature.ImageAlignCenter,
  IgntRichTextEditorFeature.ImageAlignLeft,
  IgntRichTextEditorFeature.ImageAlignRight,
  IgntRichTextEditorFeature.ImageFullWidth,
  IgntRichTextEditorFeature.Italic,
  IgntRichTextEditorFeature.Link,
  IgntRichTextEditorFeature.OrderedList,
  IgntRichTextEditorFeature.SourceHtml,
  IgntRichTextEditorFeature.Strike,
  IgntRichTextEditorFeature.Underline,
]);
