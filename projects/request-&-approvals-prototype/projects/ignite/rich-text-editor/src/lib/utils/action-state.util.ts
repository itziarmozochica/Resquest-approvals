import type { Editor } from '@tiptap/core';

import { IgntRichTextEditorFeature } from '../models/enums/rich-text-editor-feature.enum';
import { imageAlignForFeature, isImageAlignActive, isImageFullWidthActive } from './image-align.util';
import { isSelectionAlignActive } from './selection-align.util';

export function isEditorActionActive(editor: Editor, action: IgntRichTextEditorFeature): boolean {
  const imageAlign = imageAlignForFeature(action);

  if (imageAlign !== undefined) {
    return isImageAlignActive(editor, imageAlign);
  }

  switch (action) {
    case IgntRichTextEditorFeature.AlignCenter:
      return isSelectionAlignActive(editor, 'center');
    case IgntRichTextEditorFeature.AlignLeft:
      return isSelectionAlignActive(editor, 'left');
    case IgntRichTextEditorFeature.AlignRight:
      return isSelectionAlignActive(editor, 'right');
    case IgntRichTextEditorFeature.Bold:
      return editor.isActive('bold');
    case IgntRichTextEditorFeature.BulletList:
      return editor.isActive('bulletList');
    case IgntRichTextEditorFeature.ImageFullWidth:
      return isImageFullWidthActive(editor);
    case IgntRichTextEditorFeature.Italic:
      return editor.isActive('italic');
    case IgntRichTextEditorFeature.Link:
      return editor.isActive('link');
    case IgntRichTextEditorFeature.OrderedList:
      return editor.isActive('orderedList');
    case IgntRichTextEditorFeature.Strike:
      return editor.isActive('strike');
    case IgntRichTextEditorFeature.Underline:
      return editor.isActive('underline');
    default:
      return false;
  }
}
