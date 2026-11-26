import { Extension } from '@tiptap/core';

import { isMismatchedTransactionError } from '../utils/is-mismatched-transaction-error.util';

const staleMetaTransactionGuardPriority = 1000;

/**
 * Swallows stale meta-only ProseMirror transactions (e.g. from the Placeholder
 * viewport scroll plugin) that race with concurrent content updates.
 *
 * Workaround for B2BI-15748 / FEVERZONE-217. Re-evaluate removing this extension
 * when upgrading `@tiptap/extensions` to >= 3.27.3, which replaced the Placeholder
 * viewport scroll / rAF meta dispatch path (see TipTap changelog).
 */
export const IgntRichTextEditorStaleMetaTransactionGuard = Extension.create({
  dispatchTransaction({ transaction, next }) {
    try {
      next(transaction);
    } catch (error: unknown) {
      if (isMismatchedTransactionError(error) && !transaction.docChanged && !transaction.selectionSet) {
        return;
      }

      throw error;
    }
  },

  name: 'staleMetaTransactionGuard',

  priority: staleMetaTransactionGuardPriority,
});
