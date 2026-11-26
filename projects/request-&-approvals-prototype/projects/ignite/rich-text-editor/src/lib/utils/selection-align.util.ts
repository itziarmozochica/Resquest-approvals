import type { Editor } from '@tiptap/core';
import type { Node as ProseMirrorNode } from '@tiptap/pm/model';

import type { IgntRichTextEditorImageAlign } from '../extensions/rich-text-editor-image.extension';

export type IgntRichTextEditorSelectionAlign = Exclude<IgntRichTextEditorImageAlign, null>;

const TEXT_ALIGNABLE_NODE_TYPES: readonly string[] = ['heading', 'paragraph'];

interface AlignableTextNode {
  textAlign: string | null;
  type: 'text';
}

interface AlignableImageNode {
  imageAlign: IgntRichTextEditorImageAlign;
  type: 'image';
}

export type IgntRichTextEditorAlignableNode = AlignableImageNode | AlignableTextNode;

export function selectionHasNodeType(editor: Editor, nodeType: string): boolean {
  const { from, to } = editor.state.selection;
  let found = false;

  editor.state.doc.nodesBetween(from, to, (node: ProseMirrorNode) => {
    if (node.type.name === nodeType) {
      found = true;
    }
  });

  return found;
}

export function selectionHasTextAlignableBlocks(editor: Editor): boolean {
  return TEXT_ALIGNABLE_NODE_TYPES.some((nodeType: string) => selectionHasNodeType(editor, nodeType));
}

export function getAlignableNodesInSelection(editor: Editor): IgntRichTextEditorAlignableNode[] {
  const { empty, from, to } = editor.state.selection;
  const alignableNodes: IgntRichTextEditorAlignableNode[] = [];

  editor.state.doc.nodesBetween(from, to, (node: ProseMirrorNode, pos: number) => {
    if (node.isText) {
      return;
    }

    const relativeFrom: number = Math.max(from, pos);
    const relativeTo: number = Math.min(to, pos + node.nodeSize);
    const overlapsSelection: boolean = empty || relativeTo > relativeFrom;

    if (!overlapsSelection) {
      return;
    }

    if (TEXT_ALIGNABLE_NODE_TYPES.includes(node.type.name)) {
      alignableNodes.push({
        textAlign: (node.attrs.textAlign as string | null | undefined) ?? null,
        type: 'text',
      });

      return;
    }

    if (node.type.name === 'image') {
      alignableNodes.push({
        imageAlign: node.attrs.imageAlign as IgntRichTextEditorImageAlign,
        type: 'image',
      });
    }
  });

  return alignableNodes;
}

function isTextNodeAligned(textAlign: string | null, targetAlign: IgntRichTextEditorSelectionAlign): boolean {
  if (targetAlign === 'left') {
    return textAlign !== 'center' && textAlign !== 'right';
  }

  return textAlign === targetAlign;
}

function isImageNodeAligned(imageAlign: IgntRichTextEditorImageAlign, targetAlign: IgntRichTextEditorSelectionAlign): boolean {
  return imageAlign === targetAlign;
}

export function isSelectionAlignActive(editor: Editor, targetAlign: IgntRichTextEditorSelectionAlign): boolean {
  const alignableNodes: IgntRichTextEditorAlignableNode[] = getAlignableNodesInSelection(editor);

  if (alignableNodes.length === 0) {
    return false;
  }

  return alignableNodes.every((node: IgntRichTextEditorAlignableNode) => {
    if (node.type === 'text') {
      return isTextNodeAligned(node.textAlign, targetAlign);
    }

    return isImageNodeAligned(node.imageAlign, targetAlign);
  });
}

export function isImageOnlySelection(editor: Editor): boolean {
  const hasImages: boolean = selectionHasNodeType(editor, 'image');

  if (!hasImages) {
    return false;
  }

  return !selectionHasTextAlignableBlocks(editor);
}

export function applySelectionAlign(editor: Editor, targetAlign: IgntRichTextEditorSelectionAlign): void {
  const hasImages: boolean = selectionHasNodeType(editor, 'image');
  const hasTextBlocks: boolean = selectionHasTextAlignableBlocks(editor);

  if (hasImages && editor.isActive('image') && !hasTextBlocks) {
    const currentAlign: IgntRichTextEditorImageAlign = editor.getAttributes('image').imageAlign as IgntRichTextEditorImageAlign;
    const nextAlign: IgntRichTextEditorImageAlign = currentAlign === targetAlign ? null : targetAlign;
    const selectionPos: number = editor.state.selection.from;

    editor.chain().focus().updateAttributes('image', { imageAlign: nextAlign }).setNodeSelection(selectionPos).run();

    return;
  }

  const chain = editor.chain().focus();

  if (hasTextBlocks) {
    chain.setTextAlign(targetAlign);
  }

  if (hasImages) {
    chain.updateAttributes('image', { imageAlign: targetAlign });
  }

  chain.run();
}
