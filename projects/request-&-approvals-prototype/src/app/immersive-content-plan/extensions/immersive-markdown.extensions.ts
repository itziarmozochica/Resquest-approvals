import {
  Extension,
  wrappingInputRule,
  type AnyExtension,
  type Attributes,
  type Editor,
  type InputRule,
  type KeyboardShortcutCommand,
  type PasteRule,
} from '@tiptap/core';
import { Bold } from '@tiptap/extension-bold';
import { Document } from '@tiptap/extension-document';
import { Italic } from '@tiptap/extension-italic';
import { BulletList, ListItem, ListKeymap, OrderedList } from '@tiptap/extension-list';
import { Paragraph } from '@tiptap/extension-paragraph';
import { Text } from '@tiptap/extension-text';
import { UndoRedo } from '@tiptap/extensions';
import { Plugin, PluginKey, type EditorState, type Transaction } from '@tiptap/pm/state';
import type { EditorView } from '@tiptap/pm/view';

import { IMMERSIVE_MARKDOWN_LOAD_META } from '../models/immersive-markdown-editor.model';
import { docToDescriptionMarkdown } from '../utils/immersive-description-markdown.util';
import { stripEmoji } from '../utils/immersive-emoji.util';
import {
  buildEmojiCleanup,
  normalizePastedSlice,
  parsePastedText,
  sanitizePastedHtml,
  shouldSkipEmojiCleanup,
} from '../utils/immersive-markdown-guardrail.util';

interface GuardrailState {
  // The serialized text captured at the last load; an edit is any change the serializer can see against it.
  readonly baseline: string;
}

// Webclient reads only `- ` as a bullet marker that the editor starts; `* ` and `+ ` stay literal text.
const BULLET_LIST_INPUT_REGEX = /^\s*-\s$/;
const ORDERED_LIST_INPUT_REGEX = /^\d+\.\s$/;
const GUARDRAIL_PLUGIN_KEY = new PluginKey<GuardrailState>('immersiveMarkdownGuardrail');

// The webclient grammar, not Tiptap's, decides what `*` and `_` mean, so typing and pasting never format.
const WITHOUT_MARKDOWN_RULES = {
  addInputRules(): InputRule[] {
    return [];
  },
  addPasteRules(): PasteRule[] {
    return [];
  },
};

const ImmersiveMarkdownOrderedList = OrderedList.extend({
  addAttributes(): Attributes {
    return { start: { default: 1, parseHTML: () => 1 } };
  },
  addInputRules(): InputRule[] {
    return [wrappingInputRule({ find: ORDERED_LIST_INPUT_REGEX, type: this.type, getAttributes: () => ({ start: 1 }) })];
  },
  // The upstream plugin turns pasted plain text into a list that keeps its own start number.
  addProseMirrorPlugins(): Plugin[] {
    return [];
  },
});

// One paragraph per item leaves a nested list nowhere to go. ProseMirror's sinkListItem throws on a schema that
// forbids nesting instead of failing, so Tab and Shift-Tab are released to move focus rather than trapping it.
const ImmersiveMarkdownListItem = ListItem.extend({
  content: 'paragraph',
  addKeyboardShortcuts(): Record<string, KeyboardShortcutCommand> {
    return { ...this.parent?.(), 'Shift-Tab': () => false, Tab: () => false };
  },
});

// splitBlock throws on a selection from a top-level paragraph into a list item, so a selection that spans blocks is
// deleted first and the key then splits at the collapsed caret.
function deleteCrossBlockSelection(editor: Editor): void {
  const { $from, $to, empty } = editor.state.selection;

  if (!empty && !$from.sameParent($to)) {
    editor.commands.deleteSelection();
  }
}

function captureBaseline(state: EditorState): GuardrailState {
  return { baseline: docToDescriptionMarkdown(state.doc.toJSON()) };
}

function readBaseline(state: EditorState): string {
  return GUARDRAIL_PLUGIN_KEY.getState(state)?.baseline ?? '';
}

// An input method owns the text until the composition ends; the timeout lets the browser's own composition events settle first.
function scheduleEmojiCleanupAfterComposition(view: EditorView): void {
  setTimeout(() => {
    const cleanup = view.isDestroyed || view.composing ? null : buildEmojiCleanup(view.state, readBaseline(view.state));

    if (cleanup !== null) {
      view.dispatch(cleanup);
    }
  });
}

const ImmersiveMarkdownGuardrail = Extension.create({
  name: 'immersiveMarkdownGuardrail',

  addKeyboardShortcuts(): Record<string, KeyboardShortcutCommand> {
    return {
      Enter: () => {
        deleteCrossBlockSelection(this.editor);
        return false;
      },
      'Mod-Shift-s': () => true,
      'Mod-Shift-x': () => true,
      'Mod-u': () => true,
      'Shift-Enter': () => {
        deleteCrossBlockSelection(this.editor);
        return this.editor.commands.enter();
      },
    };
  },

  addProseMirrorPlugins(): Plugin[] {
    return [
      new Plugin<GuardrailState>({
        key: GUARDRAIL_PLUGIN_KEY,
        props: {
          handleDOMEvents: {
            compositionend: (view: EditorView) => {
              scheduleEmojiCleanupAfterComposition(view);
              return false;
            },
          },
          transformPastedHTML: sanitizePastedHtml,
          transformPastedText: stripEmoji,
          clipboardTextParser: (text: string, _context, _plain: boolean, view: EditorView) => parsePastedText(text, view.state.schema),
          transformPasted: (slice, view: EditorView) => normalizePastedSlice(slice, view.state.schema),
        },
        state: {
          apply: (tr: Transaction, value: GuardrailState, _oldState: EditorState, newState: EditorState) =>
            tr.getMeta(IMMERSIVE_MARKDOWN_LOAD_META) === true ? captureBaseline(newState) : value,
          init: (_config, state: EditorState) => captureBaseline(state),
        },
        appendTransaction(transactions: readonly Transaction[], _oldState: EditorState, newState: EditorState): Transaction | null {
          return shouldSkipEmojiCleanup(transactions) ? null : buildEmojiCleanup(newState, readBaseline(newState));
        },
      }),
    ];
  },
});

// The placeholder is added by the component: it calls `document.elementFromPoint`, which jsdom lacks.
export const IMMERSIVE_MARKDOWN_EXTENSIONS: readonly AnyExtension[] = [
  Document,
  Paragraph,
  Text,
  Bold.extend(WITHOUT_MARKDOWN_RULES),
  Italic.extend(WITHOUT_MARKDOWN_RULES),
  BulletList.extend({
    addInputRules(): InputRule[] {
      return [wrappingInputRule({ find: BULLET_LIST_INPUT_REGEX, type: this.type })];
    },
  }),
  ImmersiveMarkdownOrderedList,
  ImmersiveMarkdownListItem,
  ListKeymap,
  UndoRedo,
  ImmersiveMarkdownGuardrail,
];
