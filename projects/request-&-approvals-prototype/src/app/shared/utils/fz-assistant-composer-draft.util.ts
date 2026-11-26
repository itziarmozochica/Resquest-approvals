import { effect, ElementRef, Signal, WritableSignal } from '@angular/core';

import { FzAssistantComposerService } from '@fz-original/app/shared/services/fz-assistant/fz-assistant-composer.service';

/** The chat-surface state a composer draft is written into. */
export interface ComposerDraftBinding {
  composer: FzAssistantComposerService;
  currentMessage: WritableSignal<string>;
  inputField: Signal<ElementRef<HTMLTextAreaElement> | undefined>;
  onInputChange: () => void;
}

/**
 * Wire a chat surface to the FZ Assistant composer draft channel.
 *
 * When an MCP App widget calls `sendMessage` with `autoSubmit=false`, the
 * composer service publishes a draft. This effect writes it into the textbox and
 * focuses it WITHOUT sending, so the user can review and hit send. Shared by both
 * chat surfaces (dock + full view) so the behavior stays in one place.
 *
 * Must be called from an injection context (a component constructor) so the
 * `effect` is torn down with the host component.
 */
export function bindComposerDraft(binding: ComposerDraftBinding): void {
  effect(() => {
    const draft = binding.composer.pendingDraft();
    if (!draft) return;
    binding.currentMessage.set(draft.text);
    binding.composer.clearDraft();
    queueMicrotask(() => {
      binding.onInputChange();
      binding.inputField()?.nativeElement.focus();
    });
  });
}
