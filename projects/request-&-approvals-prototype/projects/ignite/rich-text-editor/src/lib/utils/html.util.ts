import { getHTMLFromFragment, type Editor } from '@tiptap/core';
import type { NodeType } from '@tiptap/pm/model';

/**
 * Serializes editor content with `<p><br></p>` for empty paragraphs (parity with Quill and external renderers).
 * Uses an in-memory transaction without dispatch so the live document is not mutated.
 */
export function getTiptapExportHtml(editor: Editor): string {
  const { doc, schema } = editor.state;
  // ProseMirror types hardBreak as always present; assert optional so the runtime guard stays type-valid when a custom schema omits it.
  const hardBreakType = schema.nodes.hardBreak as NodeType | undefined;

  if (hardBreakType === undefined) {
    return editor.getHTML();
  }

  const emptyParagraphPositions: number[] = [];

  doc.descendants((node, pos) => {
    if (node.type.name === 'paragraph' && node.content.size === 0) {
      emptyParagraphPositions.push(pos + 1);
    }
  });

  if (emptyParagraphPositions.length === 0) {
    return editor.getHTML();
  }

  let transaction = editor.state.tr;
  const sortedPositions = [...emptyParagraphPositions].sort((firstPosition, secondPosition) => secondPosition - firstPosition);

  for (const position of sortedPositions) {
    transaction = transaction.insert(position, hardBreakType.create());
  }

  return getHTMLFromFragment(transaction.doc.content, schema);
}

/**
 * Removes the sole hardBreak from paragraphs that contain exactly one hardBreak child,
 * mirroring the inverse of {@link getTiptapExportHtml} wire format (`<p><br></p>`).
 */
export function normalizeTiptapImportDocument(editor: Editor, options?: { emitUpdate?: boolean }): void {
  const { emitUpdate = false } = options ?? {};
  const { doc } = editor.state;
  const hardBreakRanges: { from: number; to: number }[] = [];

  doc.descendants((node, pos) => {
    if (node.type.name !== 'paragraph' || node.childCount !== 1) {
      return;
    }

    const onlyChild = node.firstChild;

    if (onlyChild?.type.name !== 'hardBreak') {
      return;
    }

    hardBreakRanges.push({
      from: pos + 1,
      to: pos + 1 + onlyChild.nodeSize,
    });
  });

  if (hardBreakRanges.length === 0) {
    return;
  }

  let transaction = editor.state.tr;
  const sortedRanges = [...hardBreakRanges].sort((firstRange, secondRange) => secondRange.from - firstRange.from);

  for (const { from, to } of sortedRanges) {
    transaction = transaction.delete(from, to);
  }

  editor.view.dispatch(transaction.setMeta('preventUpdate', !emitUpdate));
}

export interface IgntRichTextEditorContentOptions {
  /**
   * Reads whitespace as content instead of normalizing it the way a browser renders markup. No
   * parser can tell spacing an author typed from indentation a tool emitted, so the caller decides:
   * on for hand-written content, off for markup that may be pretty-printed, which would otherwise
   * gain a line break and an indent on every source line.
   */
  preserveWhitespace?: boolean;
}

/**
 * A line ending straight after a `<br>` is how an author lays markup out by hand, not a second
 * break. Preserve mode reads it as one, so `a<br>\nb` would load with the break doubled and the
 * next edit would write that back. Spaces or tabs before each line ending count too, since the
 * author can't see them in the textarea. Dropping the whole run keeps an intentional `<br><br>`
 * and the indent after the last line ending intact.
 */
const LINE_ENDINGS_AFTER_BREAK_REGEX = /(?<lineBreak><br\s*\/?>)(?:[ \t]*(?:\r\n?|\n))+/giu;

/** Loads wire HTML into the editor and normalizes empty-paragraph hardBreaks for editing. */
export function applyTiptapEditorContent(editor: Editor, html: string, options?: IgntRichTextEditorContentOptions): void {
  const { preserveWhitespace = false } = options ?? {};
  const content = preserveWhitespace ? html.replace(LINE_ENDINGS_AFTER_BREAK_REGEX, '$<lineBreak>') : html;

  editor.commands.setContent(content, { emitUpdate: false, parseOptions: { preserveWhitespace } });
  normalizeTiptapImportDocument(editor);
}
