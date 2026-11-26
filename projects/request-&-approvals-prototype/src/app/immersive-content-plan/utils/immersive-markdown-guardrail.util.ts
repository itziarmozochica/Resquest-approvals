import type { JSONContent } from '@tiptap/core';
import { isHistoryTransaction } from '@tiptap/pm/history';
import { Fragment, Slice, type Node as ProseMirrorNode, type Schema } from '@tiptap/pm/model';
import type { EditorState, Transaction } from '@tiptap/pm/state';

import { IMMERSIVE_MARKDOWN_LOAD_META } from '../models/immersive-markdown-editor.model';
import { descriptionMarkdownToDoc, docToDescriptionMarkdown, stripTagMarks } from './immersive-description-markdown.util';
import { findEmojiRanges, stripEmoji, type EmojiRange } from './immersive-emoji.util';

const COMPOSITION_META = 'composition';
const DROPPED_ELEMENTS_SELECTOR = 'script, style, noscript, iframe, object, embed, img';
// Word marks the bullet or number glyph of a list paragraph with this style; the glyph is not text the partner wrote.
const WORD_LIST_GLYPH_STYLE_PATTERN = /mso-list\s*:\s*ignore/i;
// ProseMirror collapses the newline its own <br> fallback emits into a space, so every <br> becomes this separator,
// which survives parsing as text, and the slice normaliser splits the paragraph on it.
const LINE_SEPARATOR = '\u{2028}';
const LINE_BREAK_PATTERN = /\r\n|[\r\n\u{2028}]/u;
const HORIZONTAL_LEADING_PATTERN = /^[^\S\r\n\u{2028}]*/u;
const HORIZONTAL_SPACE_PATTERN = /^[^\S\r\n\u{2028}]$/u;
const NESTED_LIST_SELECTOR = 'li ul, li ol, ul > ul, ul > ol, ol > ul, ol > ol';

function* walkNodes(walker: TreeWalker): Generator<Node> {
  while (walker.nextNode() !== null) {
    yield walker.currentNode;
  }
}

// Scans back from the end: an unanchored `[...]*$` regex retries from every position of a long whitespace run.
function trailingHorizontalSpace(text: string): string {
  let start = text.length;
  while (start > 0 && HORIZONTAL_SPACE_PATTERN.test(text[start - 1])) {
    start -= 1;
  }
  return text.slice(start);
}

export function sanitizePastedHtml(html: string): string {
  const parsed = new DOMParser().parseFromString(stripTagMarks(html), 'text/html');
  const nodes = [...walkNodes(parsed.createTreeWalker(parsed.body, NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_COMMENT))];

  for (const node of nodes) {
    if (!(node instanceof Element) || node.matches(DROPPED_ELEMENTS_SELECTOR)) {
      node.parentNode?.removeChild(node);
    } else if (WORD_LIST_GLYPH_STYLE_PATTERN.test(node.getAttribute('style') ?? '')) {
      node.remove();
    } else if (node.tagName === 'BR') {
      node.replaceWith(LINE_SEPARATOR);
    } else if (node.matches('td, th')) {
      // Table cells are not block elements for ProseMirror, so without a space their words would join.
      node.after(' ');
    }
  }
  // Nested lists arrive deepest first, so every hoisted item lands in the list that is hoisted next. A list placed
  // directly in a list, as Google Docs writes it, gives its items to that list in its own place.
  for (const nestedList of Array.from(parsed.body.querySelectorAll(NESTED_LIST_SELECTOR)).reverse()) {
    const items = Array.from(nestedList.children).filter((child: Element) => child.tagName === 'LI');
    if (nestedList.parentElement?.matches('ul, ol') === true) {
      nestedList.replaceWith(...items);
    } else {
      nestedList.closest('li')?.after(...items);
      nestedList.remove();
    }
  }

  return parsed.body.innerHTML;
}

function padParagraph(block: JSONContent, leading: string, trailing: string): JSONContent {
  const edge = (text: string): JSONContent[] => (text === '' ? [] : [{ text, type: 'text' }]);
  return block.type === 'paragraph' ? { ...block, content: [...edge(leading), ...(block.content ?? []), ...edge(trailing)] } : block;
}

// The grammar trims every line of stored text, but a pasted fragment opens into the text around the caret, so the outer
// edge whitespace of its first and last paragraph is put back: `Hello` plus a pasted ` world` stays `Hello world`. A
// whitespace-only single line stays that whitespace. Saving trims block edges anyway; lists and interior lines stay trimmed.
export function parsePastedText(pasted: string, schema: Schema): Slice {
  const text = stripTagMarks(pasted);
  const blocks = descriptionMarkdownToDoc(text).content ?? [];
  const leading = HORIZONTAL_LEADING_PATTERN.exec(text)?.[0] ?? '';
  const trailing = trailingHorizontalSpace(text.slice(leading.length));
  const padded =
    text.trim() !== '' || leading === text
      ? blocks.map((block: JSONContent, index: number) =>
          padParagraph(block, index === 0 ? leading : '', index === blocks.length - 1 ? trailing : ''),
        )
      : blocks;

  return Slice.maxOpen(schema.nodeFromJSON({ content: padded, type: 'doc' }).content, true);
}

// Outside a list every line break splits the paragraph; inside a list item, which holds one paragraph, it becomes a space.
// `null` marks a line break that splits the paragraph.
function readTextblockPieces(child: ProseMirrorNode, schema: Schema, inListItem: boolean): (ProseMirrorNode | null)[] {
  if (!child.isText) {
    return [child];
  }
  return (child.text ?? '').split(LINE_BREAK_PATTERN).flatMap((part: string, index: number) => {
    const text = stripEmoji(index > 0 && inListItem ? ` ${part}` : part);
    return [...(index > 0 && !inListItem ? [null] : []), ...(text === '' ? [] : [schema.text(text, child.marks)])];
  });
}

function normalizeTextblock(block: ProseMirrorNode, schema: Schema, inListItem: boolean): ProseMirrorNode[] {
  const pieces = block.children.flatMap((child: ProseMirrorNode) => readTextblockPieces(child, schema, inListItem));
  const breaks = pieces.flatMap((piece: ProseMirrorNode | null, index: number) => (piece === null ? [index] : []));
  const lines = [-1, ...breaks].map((lineBreak: number, index: number) =>
    pieces.slice(lineBreak + 1, breaks.at(index) ?? pieces.length).filter((piece: ProseMirrorNode | null) => piece !== null),
  );
  const filled = lines.filter((line: ProseMirrorNode[]) => line.length > 0);

  return (filled.length > 0 ? filled : [[]]).map((content: ProseMirrorNode[]) => block.type.create(block.attrs, content, block.marks));
}

function normalizeFragment(fragment: Fragment, schema: Schema, inListItem: boolean): Fragment {
  return Fragment.fromArray(
    fragment.content.flatMap((node: ProseMirrorNode) => {
      if (node.isTextblock) {
        return normalizeTextblock(node, schema, inListItem);
      }
      const text = node.isText ? stripEmoji(node.text ?? '') : null;
      if (text !== null) {
        return text === '' ? [] : [schema.text(text, node.marks)];
      }
      return [node.copy(normalizeFragment(node.content, schema, inListItem || node.type.name === 'listItem'))];
    }),
  );
}

export function normalizePastedSlice(slice: Slice, schema: Schema): Slice {
  if (slice.content.firstChild?.isInline === true) {
    return new Slice(normalizeFragment(Fragment.from(schema.nodes['paragraph'].create(null, slice.content)), schema, false), 1, 1);
  }
  return new Slice(normalizeFragment(slice.content, schema, false), slice.openStart, slice.openEnd);
}

export function shouldSkipEmojiCleanup(transactions: readonly Transaction[]): boolean {
  return (
    !transactions.some((tr: Transaction) => tr.docChanged) ||
    transactions.some(
      (tr: Transaction) =>
        tr.getMeta(COMPOSITION_META) != null || tr.getMeta(IMMERSIVE_MARKDOWN_LOAD_META) === true || isHistoryTransaction(tr),
    )
  );
}

interface PositionedText {
  readonly position: number;
  readonly text: string;
}

// `start` is the position of the node's first child: 0 in the doc, one past the opening token of any other node.
function* walkTextNodes(node: ProseMirrorNode, start: number): Generator<PositionedText> {
  let position = start;
  for (const child of node.children) {
    if (child.isText) {
      yield { position, text: child.text ?? '' };
    } else {
      yield* walkTextNodes(child, position + 1);
    }
    position += child.nodeSize;
  }
}

// Ranges are deleted last to first so earlier positions stay valid, and only emoji are touched so a caret elsewhere stays put.
export function buildEmojiCleanup(state: EditorState, baseline: string): Transaction | null {
  const ranges = [...walkTextNodes(state.doc, 0)].flatMap(({ position, text }: PositionedText) =>
    findEmojiRanges(text).map((range: EmojiRange) => ({ from: position + range.from, to: position + range.to })),
  );

  if (ranges.length === 0 || docToDescriptionMarkdown(state.doc.toJSON()) === baseline) {
    return null;
  }

  return ranges.reduceRight((tr: Transaction, range: EmojiRange) => tr.delete(range.from, range.to), state.tr);
}
