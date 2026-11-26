import type { Editor } from '@tiptap/core';

import type { IgntRichTextEditorImageAlign, IgntRichTextEditorImageWidthMode } from '../extensions/rich-text-editor-image.extension';
import { IgntRichTextEditorFeature } from '../models/enums/rich-text-editor-feature.enum';

const IMAGE_ALIGN_BY_FEATURE = new Map<IgntRichTextEditorFeature, Exclude<IgntRichTextEditorImageAlign, null>>([
  [IgntRichTextEditorFeature.ImageAlignLeft, 'left'],
  [IgntRichTextEditorFeature.ImageAlignCenter, 'center'],
  [IgntRichTextEditorFeature.ImageAlignRight, 'right'],
]);

/** Returns the alignment a feature maps to, or `undefined` if it is not an image-alignment feature. */
export function imageAlignForFeature(feature: IgntRichTextEditorFeature): Exclude<IgntRichTextEditorImageAlign, null> | undefined {
  return IMAGE_ALIGN_BY_FEATURE.get(feature);
}

export function isImageAlignFeature(feature: IgntRichTextEditorFeature): boolean {
  return IMAGE_ALIGN_BY_FEATURE.has(feature);
}

/** Aligns the selected image and clears full width (the two are mutually exclusive). */
export function applyImageAlign(editor: Editor, align: IgntRichTextEditorImageAlign): void {
  if (!editor.isActive('image')) {
    return;
  }

  editor.chain().focus().updateAttributes('image', { imageAlign: align, imageWidthMode: null }).run();
}

export function isImageAlignActive(editor: Editor, align: IgntRichTextEditorImageAlign): boolean {
  return editor.isActive('image') && (editor.getAttributes('image').imageAlign as IgntRichTextEditorImageAlign) === align;
}

/** Toggles full width on the selected image, clearing any alignment when enabling it. */
export function toggleImageFullWidth(editor: Editor): void {
  if (!editor.isActive('image')) {
    return;
  }

  if ((editor.getAttributes('image').imageWidthMode as IgntRichTextEditorImageWidthMode) === 'full') {
    editor.chain().focus().updateAttributes('image', { imageWidthMode: null }).run();

    return;
  }

  editor.chain().focus().updateAttributes('image', { height: null, imageAlign: null, imageWidthMode: 'full', width: null }).run();
}

export function isImageFullWidthActive(editor: Editor): boolean {
  return editor.isActive('image') && (editor.getAttributes('image').imageWidthMode as IgntRichTextEditorImageWidthMode) === 'full';
}
