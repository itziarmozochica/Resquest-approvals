import type { Editor } from '@tiptap/core';

import type { IgntRichTextEditorSchemaOptions } from './rich-text-editor-schema-options.model';

export interface IgntRichTextEditorBuildOptions extends IgntRichTextEditorSchemaOptions {
  fileUploadEnabled: boolean;
  placeholder: () => string;
  onImageUpload: (editor: Editor, file: File, insertPos?: number) => void;
  onPasteDataUri: (editor: Editor, dataUri: string) => void;
}
