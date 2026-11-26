import type { AnyExtension } from '@tiptap/core';
import { TextAlign } from '@tiptap/extension-text-align';

interface TextAlignExtensionOptions {
  alignments: string[];
  defaultAlignment: string | null;
  types: string[];
}

const QUILL_ALIGN_CLASS_PREFIX = 'ql-align-';

function readQuillAlignClass(element: HTMLElement): string | null {
  const classAttribute = element.getAttribute('class');

  if (classAttribute === null) {
    return null;
  }

  for (const className of classAttribute.split(/\s+/u)) {
    if (className.startsWith(QUILL_ALIGN_CLASS_PREFIX)) {
      return className.slice(QUILL_ALIGN_CLASS_PREFIX.length);
    }
  }

  return null;
}

/**
 * Types that carry the attribute but are not what the align command writes to: a `<center>` can
 * wrap a list, and `setTextAlign` updates every configured type in the selection, so listing these
 * as options would align a whole list from one item.
 */
const READ_ONLY_ALIGNED_TYPES = ['bulletList', 'orderedList'];

/** Quill stored alignment as a class; older content still wraps centred copy in `<center>`. */
function readLegacyAlignment(element: HTMLElement): string | null {
  const quillAlignment = readQuillAlignClass(element);
  if (quillAlignment !== null) {
    return quillAlignment;
  }

  return element.closest('center') === null ? null : 'center';
}

export function buildTextAlignExtension(): AnyExtension {
  // Quill stored alignment as `ql-align-*` classes; parse them (alongside the native
  // `text-align` style) so content authored in the legacy editor keeps its alignment.
  return TextAlign.extend({
    addGlobalAttributes() {
      const options = (this as unknown as { options: TextAlignExtensionOptions }).options;

      return [
        {
          attributes: {
            textAlign: {
              default: options.defaultAlignment,
              parseHTML: (element: HTMLElement): string | null => {
                const styleAlignment = element.style.textAlign;
                const alignment = styleAlignment === '' ? readLegacyAlignment(element) : styleAlignment;

                return alignment !== null && alignment !== '' && options.alignments.includes(alignment)
                  ? alignment
                  : options.defaultAlignment;
              },
              renderHTML: (attributes: { textAlign?: string | null }): Record<string, string> => {
                if (
                  attributes.textAlign === null ||
                  attributes.textAlign === undefined ||
                  attributes.textAlign === options.defaultAlignment
                ) {
                  return {};
                }

                return { style: `text-align: ${attributes.textAlign}` };
              },
            },
          },
          types: [...options.types, ...READ_ONLY_ALIGNED_TYPES],
        },
      ];
    },
  }).configure({
    alignments: ['left', 'center', 'right'],
    defaultAlignment: null,
    types: ['heading', 'paragraph'],
  });
}
