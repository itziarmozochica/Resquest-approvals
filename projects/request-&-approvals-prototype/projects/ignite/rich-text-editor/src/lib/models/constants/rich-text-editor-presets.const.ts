import { IgntRichTextEditorFeature } from '../enums/rich-text-editor-feature.enum';

export const IGNT_RICH_TEXT_EDITOR_PRESET_MINIMAL: ReadonlySet<IgntRichTextEditorFeature> = new Set([
  IgntRichTextEditorFeature.Bold,
  IgntRichTextEditorFeature.Italic,
  IgntRichTextEditorFeature.Strike,
]);

export const IGNT_RICH_TEXT_EDITOR_PRESET_STANDARD: ReadonlySet<IgntRichTextEditorFeature> = new Set([
  IgntRichTextEditorFeature.Bold,
  IgntRichTextEditorFeature.Italic,
  IgntRichTextEditorFeature.Strike,
  IgntRichTextEditorFeature.Link,
  IgntRichTextEditorFeature.OrderedList,
  IgntRichTextEditorFeature.BulletList,
]);

export const IGNT_RICH_TEXT_EDITOR_PRESET_EXTENDED: ReadonlySet<IgntRichTextEditorFeature> = new Set([
  IgntRichTextEditorFeature.AlignLeft,
  IgntRichTextEditorFeature.AlignCenter,
  IgntRichTextEditorFeature.AlignRight,
  IgntRichTextEditorFeature.Bold,
  IgntRichTextEditorFeature.Italic,
  IgntRichTextEditorFeature.Underline,
  IgntRichTextEditorFeature.Strike,
  IgntRichTextEditorFeature.OrderedList,
  IgntRichTextEditorFeature.BulletList,
  IgntRichTextEditorFeature.Link,
  IgntRichTextEditorFeature.Image,
  IgntRichTextEditorFeature.ImageFullWidth,
  IgntRichTextEditorFeature.ImageAlignLeft,
  IgntRichTextEditorFeature.ImageAlignCenter,
  IgntRichTextEditorFeature.ImageAlignRight,
  IgntRichTextEditorFeature.Clean,
  IgntRichTextEditorFeature.Emoji,
]);
