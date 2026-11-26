import { IgntRichTextEditorFeature } from '../enums/rich-text-editor-feature.enum';

export const IGNT_RICH_TEXT_EDITOR_TOOLBAR_GROUPS: readonly (readonly IgntRichTextEditorFeature[])[] = [
  [IgntRichTextEditorFeature.AlignLeft, IgntRichTextEditorFeature.AlignCenter, IgntRichTextEditorFeature.AlignRight],
  [
    IgntRichTextEditorFeature.Bold,
    IgntRichTextEditorFeature.Italic,
    IgntRichTextEditorFeature.Underline,
    IgntRichTextEditorFeature.Strike,
    IgntRichTextEditorFeature.Clean,
  ],
  [IgntRichTextEditorFeature.OrderedList, IgntRichTextEditorFeature.BulletList],
  [
    IgntRichTextEditorFeature.Link,
    IgntRichTextEditorFeature.Image,
    IgntRichTextEditorFeature.ImageFullWidth,
    IgntRichTextEditorFeature.ImageAlignLeft,
    IgntRichTextEditorFeature.ImageAlignCenter,
    IgntRichTextEditorFeature.ImageAlignRight,
  ],
  [IgntRichTextEditorFeature.Emoji],
  [IgntRichTextEditorFeature.SourceHtml],
];
