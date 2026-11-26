import { Injectable, signal, Signal, WritableSignal } from '@angular/core';

/**
 * A draft to write into the FZ Assistant chat composer.
 *
 * `nonce` makes each request unique so that pushing the same `text` twice still
 * re-fires the consuming effect in the chat surface.
 */
export interface FzAssistantComposerDraft {
  readonly text: string;
  readonly nonce: number;
}

/**
 * Cross-component channel to prefill the FZ Assistant chat composer.
 *
 * The MCP App host (`ChatbotMcpAppComponent`) lives deep in the message tree and
 * cannot reach the composer state (`currentMessage`) owned by
 * `FzAssistantChatSurfaceComponent`. A widget that calls `sendMessage` with
 * `autoSubmit = false` should write its text into the textbox WITHOUT sending,
 * letting the user review and hit send. This root service carries that draft.
 */
@Injectable({ providedIn: 'root' })
export class FzAssistantComposerService {
  readonly #pendingDraft: WritableSignal<FzAssistantComposerDraft | null> = signal<FzAssistantComposerDraft | null>(null);
  readonly pendingDraft: Signal<FzAssistantComposerDraft | null> = this.#pendingDraft.asReadonly();

  /** Clear the pending draft after it has been consumed by a chat surface. */
  clearDraft(): void {
    this.#pendingDraft.set(null);
  }

  /** Push `text` into the composer for the user to review before sending. */
  setDraft(text: string): void {
    this.#pendingDraft.update((current: FzAssistantComposerDraft | null) => ({ text, nonce: (current?.nonce ?? 0) + 1 }));
  }
}
