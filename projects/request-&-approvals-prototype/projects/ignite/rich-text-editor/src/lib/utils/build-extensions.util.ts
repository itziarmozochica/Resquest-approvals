import type { AnyExtension, Editor } from '@tiptap/core';
import { Emoji, emojis } from '@tiptap/extension-emoji';
import { FileHandler } from '@tiptap/extension-file-handler';
import { ListKeymap } from '@tiptap/extension-list';
import { Placeholder } from '@tiptap/extension-placeholder';
import { Dropcursor, Gapcursor, TrailingNode, UndoRedo } from '@tiptap/extensions';

import { IgntRichTextEditorFeature } from '../models/enums/rich-text-editor-feature.enum';
import type { IgntRichTextEditorBuildOptions } from '../models/rich-text-editor-build-options.model';
import { buildSchemaExtensions, isFeatureEnabled } from './build-schema-extensions.util';
import { extractDataUriFromHtml, IMAGE_MIME_TYPES, isValidImageDataUri } from './file.util';

function hasListFeatures(features: ReadonlySet<IgntRichTextEditorFeature>): boolean {
  return (
    isFeatureEnabled(features, IgntRichTextEditorFeature.OrderedList) || isFeatureEnabled(features, IgntRichTextEditorFeature.BulletList)
  );
}

function buildEmojiExtension(): AnyExtension {
  return Emoji.configure({
    emojis,
    enableEmoticons: true,
  });
}

function buildFileHandlerExtension(options: IgntRichTextEditorBuildOptions): AnyExtension {
  return FileHandler.configure({
    allowedMimeTypes: IMAGE_MIME_TYPES,
    onDrop: (editor: Editor, files: File[], pos: number) => {
      for (const file of files) {
        options.onImageUpload(editor, file, pos);
      }
    },
    onPaste: (editor: Editor, files: File[], pasteContent?: string) => {
      const dataUri = pasteContent === undefined || pasteContent === '' ? null : extractDataUriFromHtml(pasteContent);

      if (options.allowBase64 && dataUri !== null && isValidImageDataUri(dataUri)) {
        return;
      }

      if (files.length > 0) {
        for (const file of files) {
          options.onImageUpload(editor, file);
        }

        return;
      }

      if (dataUri !== null) {
        options.onPasteDataUri(editor, dataUri);
      }
    },
  });
}

export function buildExtensionsFromFeatures(
  features: ReadonlySet<IgntRichTextEditorFeature>,
  options: IgntRichTextEditorBuildOptions,
): AnyExtension[] {
  const extensions = buildSchemaExtensions(options);

  // Caret placement, history and the trailing paragraph exist for someone typing, and so does the
  // keymap that edits lists — the list nodes themselves are already in the schema.
  extensions.push(Dropcursor, Gapcursor, UndoRedo, TrailingNode);

  if (hasListFeatures(features)) {
    extensions.push(ListKeymap);
  }

  extensions.push(
    Placeholder.configure({
      placeholder: options.placeholder,
    }),
  );

  if (isFeatureEnabled(features, IgntRichTextEditorFeature.Emoji)) {
    extensions.push(buildEmojiExtension());
  }

  // File handler (drag/drop + paste-to-upload) is authoring, so it stays gated unlike the image node.
  if (isFeatureEnabled(features, IgntRichTextEditorFeature.Image) && options.fileUploadEnabled) {
    extensions.push(buildFileHandlerExtension(options));
  }

  return extensions;
}

export { isFeatureEnabled };
