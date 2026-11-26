/**
 * When non-null, the multi-select uses async custom-option flow: confirm emits
 * {@link MultiSelectCustomOptionAsyncEvent} and the parent updates this state (prefer immutable object
 * replacements so Angular detects changes).
 */
export type MultiSelectCustomOptionAsyncState = {
  errorMessage: string | null;
  pending: boolean;
};

export type MultiSelectCustomOptionAsyncEvent = { action: 'confirm'; name: string } | { action: 'reset' };

export type MultiSelectCustomOptionI18n = {
  baseKey: string;
};
