import type { AnyExtension } from '@tiptap/core';
import { Bold } from '@tiptap/extension-bold';
import { Document } from '@tiptap/extension-document';
import { HardBreak } from '@tiptap/extension-hard-break';
import { Italic } from '@tiptap/extension-italic';
import { BulletList, ListItem, OrderedList } from '@tiptap/extension-list';
import { Strike } from '@tiptap/extension-strike';
import { Text } from '@tiptap/extension-text';

import { IgntRichTextEditorStaleMetaTransactionGuard } from '../extensions/rich-text-editor-stale-meta-transaction-guard.extension';

export function buildCoreExtensions(): AnyExtension[] {
  // List nodes stay in the schema so legacy lists survive load; the keymap that edits them is
  // authoring, and is added by buildExtensionsFromFeatures.
  return [IgntRichTextEditorStaleMetaTransactionGuard, Document, Text, Bold, Italic, Strike, HardBreak, BulletList, OrderedList, ListItem];
}
