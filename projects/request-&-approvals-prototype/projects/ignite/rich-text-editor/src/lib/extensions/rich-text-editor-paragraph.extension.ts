import { mergeAttributes, type AnyExtension } from '@tiptap/core';
import { Paragraph } from '@tiptap/extension-paragraph';

import { IgntRichTextEditorBlockTag } from '../models/enums/rich-text-editor-block-tag.enum';

const BLOCK_CONTENT_SELECTOR = 'p, div, ul, ol, li, h1, h2, h3, h4, h5, h6, img, hr, table, blockquote, pre, figure';

/**
 * A `<center>` holding inline copy is one centred block; one holding blocks is a wrapper, and
 * declining the rule lets its children be parsed as the blocks they are. Copy sitting loose
 * beside a block in the same wrapper is neither, and lands in a paragraph of its own with no
 * source element to read the alignment from.
 */
const LEGACY_BLOCK_TAG_PARSE_RULES = [
  { tag: 'p' },
  { tag: 'div' },
  {
    tag: 'center',
    getAttrs: (element: HTMLElement): null | false => (element.querySelector(BLOCK_CONTENT_SELECTOR) === null ? null : false),
  },
];

export function buildParagraphExtension(blockTag: IgntRichTextEditorBlockTag): AnyExtension {
  if (blockTag === IgntRichTextEditorBlockTag.P) {
    return Paragraph.extend({
      parseHTML() {
        return LEGACY_BLOCK_TAG_PARSE_RULES;
      },
    });
  }

  return Paragraph.extend({
    parseHTML() {
      return LEGACY_BLOCK_TAG_PARSE_RULES;
    },

    renderHTML({ HTMLAttributes }) {
      const extensionOptions = (this as { options: { HTMLAttributes: Record<string, unknown> } }).options;

      return ['div', mergeAttributes(extensionOptions.HTMLAttributes, HTMLAttributes), 0];
    },
  });
}
