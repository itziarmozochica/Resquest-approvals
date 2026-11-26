import type { Editor } from '@tiptap/core';

export function insertUploadedImageAt(editor: Editor, url: string, insertPos: number): number {
  const inserted = editor
    .chain()
    .insertContentAt(insertPos, { attrs: { src: url }, type: 'image' }, { updateSelection: false })
    .run();

  if (!inserted) {
    return insertPos;
  }

  const node = editor.state.doc.nodeAt(insertPos);

  if (node?.type.name !== 'image' || node.attrs.src !== url) {
    return insertPos;
  }

  return insertPos + node.nodeSize;
}
