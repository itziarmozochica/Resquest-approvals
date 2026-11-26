import { IgntRichTextEditorBlockTag } from './enums/rich-text-editor-block-tag.enum';

export type IgntRichTextEditorBlockElement = 'p' | 'div';

export const DEFAULT_IGNT_RICH_TEXT_EDITOR_BLOCK_ELEMENT: IgntRichTextEditorBlockElement = 'div';

export function toIgntRichTextEditorBlockTag(blockElement: IgntRichTextEditorBlockElement): IgntRichTextEditorBlockTag {
  return blockElement === 'p' ? IgntRichTextEditorBlockTag.P : IgntRichTextEditorBlockTag.Div;
}
