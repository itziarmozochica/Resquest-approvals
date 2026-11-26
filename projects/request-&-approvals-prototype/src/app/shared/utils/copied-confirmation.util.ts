import { DestroyRef, inject, Signal, signal } from '@angular/core';

export const copiedConfirmationResetDelayMs = 2000;

export interface CopiedConfirmation {
  /** The value most recently put on the clipboard, while its confirmation is fresh; `null` otherwise. */
  readonly copiedValue: Signal<string | null>;
  /** Writes `value` to the clipboard and raises the confirmation until the reset delay elapses. */
  copy(value: string): Promise<void>;
}

/**
 * Clipboard copy with a transient "copied" confirmation, shared by every copy-to-clipboard control.
 * Call from an injection context (a field initializer): the pending confirmation reset is cleared
 * when the owning component is destroyed.
 */
export function createCopiedConfirmation(): CopiedConfirmation {
  const copiedValue = signal<string | null>(null);
  let resetTimeoutId: ReturnType<typeof setTimeout> | null = null;

  const clearReset = (): void => {
    if (resetTimeoutId !== null) {
      clearTimeout(resetTimeoutId);
      resetTimeoutId = null;
    }
  };

  inject(DestroyRef).onDestroy(clearReset);

  return {
    copiedValue: copiedValue.asReadonly(),
    async copy(value: string): Promise<void> {
      try {
        await navigator.clipboard.writeText(value);
      } catch {
        return;
      }

      copiedValue.set(value);
      clearReset();
      resetTimeoutId = setTimeout(() => {
        copiedValue.set(null);
        resetTimeoutId = null;
      }, copiedConfirmationResetDelayMs);
    },
  };
}
