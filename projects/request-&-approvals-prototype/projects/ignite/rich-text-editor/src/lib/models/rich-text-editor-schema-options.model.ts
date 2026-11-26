import type { IgntRichTextEditorBlockTag } from './enums/rich-text-editor-block-tag.enum';

export interface IgntRichTextEditorSchemaOptions {
  allowBase64: boolean;
  blockTag: IgntRichTextEditorBlockTag;
  characterLimit?: number | null;
  imageResizeEnabled: boolean;
}
