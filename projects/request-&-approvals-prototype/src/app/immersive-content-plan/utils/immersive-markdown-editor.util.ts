import type { Editor } from '@tiptap/core';
import { Fragment, type NodeType, type Node as ProseMirrorNode } from '@tiptap/pm/model';
import { TextSelection, type EditorState, type Transaction } from '@tiptap/pm/state';

import {
  IMMERSIVE_MARKDOWN_LOAD_META,
  IMMERSIVE_MARKDOWN_TOOLBAR_ITEMS,
  type ImmersiveMarkdownFormat,
} from '../models/immersive-markdown-editor.model';
import { descriptionMarkdownToDoc, docToDescriptionMarkdown } from './immersive-description-markdown.util';

// The editor may hold a doc the serializer writes differently (edge whitespace inside a mark, empty paragraphs).
export function canonicaliseEditorContent(editor: Editor): void {
  const canonical = editor.schema.nodeFromJSON(descriptionMarkdownToDoc(docToDescriptionMarkdown(editor.getJSON())));

  if (!editor.state.doc.eq(canonical)) {
    editor.commands.setContent(canonical.toJSON(), { emitUpdate: true });
  }
}

// Loading is not an edit: no update fires, history records nothing, and the guardrail takes the loaded text as its baseline.
export function loadMarkdownIntoEditor(editor: Editor, markdown: string): void {
  editor
    .chain()
    .setMeta('addToHistory', false)
    .setMeta(IMMERSIVE_MARKDOWN_LOAD_META, true)
    .setContent(descriptionMarkdownToDoc(markdown), { emitUpdate: false })
    .run();
}

export function readActiveMarkdownFormats(editor: Editor): ReadonlySet<ImmersiveMarkdownFormat> {
  return new Set(IMMERSIVE_MARKDOWN_TOOLBAR_ITEMS.map(item => item.format).filter(format => editor.isActive(format)));
}

export function toggleMarkdownFormat(editor: Editor, format: ImmersiveMarkdownFormat): void {
  const chain = editor.chain().focus();

  switch (format) {
    case 'bold':
      chain.toggleBold().run();
      break;
    case 'italic':
      chain.toggleItalic().run();
      break;
    case 'bulletList':
    case 'orderedList':
      if (!(format === 'bulletList' ? chain.toggleBulletList() : chain.toggleOrderedList()).run()) {
        editor.commands.command(({ state, tr }) => rewriteListSelection(state, tr, editor.schema.nodes[format]));
      }
      break;
  }
}

function paragraphsOf(nodes: readonly ProseMirrorNode[]): ProseMirrorNode[] {
  return nodes.flatMap((node: ProseMirrorNode) => (node.isTextblock ? [node] : paragraphsOf(node.children)));
}

// One paragraph per item leaves ProseMirror's wrapInList and liftListItem nothing to work with across several blocks, so
// those selections are rewritten here: every selected paragraph becomes its own item, and selected items become paragraphs.
function rewriteListSelection(state: EditorState, tr: Transaction, listType: NodeType): boolean {
  const range = state.selection.$from.blockRange(state.selection.$to);
  const inList = range?.parent.type === listType;

  if (range === null || (!inList && range.depth !== 0)) {
    return false;
  }
  const { children } = range.parent;
  const paragraphs = paragraphsOf(children.slice(range.startIndex, range.endIndex));

  if (inList) {
    const [before, after] = [children.slice(0, range.startIndex), children.slice(range.endIndex)].map(
      (items: readonly ProseMirrorNode[]) => (items.length === 0 ? [] : [listType.create(range.parent.attrs, items)]),
    );
    const start = range.$from.before(range.depth) + (before[0]?.nodeSize ?? 0);
    tr.replaceWith(range.$from.before(range.depth), range.$from.after(range.depth), [...before, ...paragraphs, ...after]);
    return selectBetween(tr, start, start + Fragment.from(paragraphs).size);
  }
  const list = listType.create(
    null,
    paragraphs.map((paragraph: ProseMirrorNode) => state.schema.nodes['listItem'].create(null, paragraph)),
  );
  tr.replaceWith(range.start, range.end, list);
  return selectBetween(tr, range.start, range.start + list.nodeSize);
}

function selectBetween(tr: Transaction, from: number, to: number): boolean {
  tr.setSelection(TextSelection.between(tr.doc.resolve(from), tr.doc.resolve(to)));
  return true;
}
