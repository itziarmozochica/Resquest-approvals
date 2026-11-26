import type { IgntRichTextEditorFeature } from './enums/rich-text-editor-feature.enum';

export type IgntRichTextEditorToolbarItem = { kind: 'separator' } | { action: IgntRichTextEditorFeature; kind: 'button' };
