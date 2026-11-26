import { inject, Injectable } from '@angular/core';

import { isConversationContentFullyVisible, isConversationFullyConsumed } from '../../utils/chatbot/conversation-scroll.util';
import { ChatbotFacade } from './chatbot.facade';

export interface ChatbotConversationReadContext {
  isGenerationLoading: boolean;
  isLoadingThread: boolean;
  messageCount: number;
}

@Injectable({
  providedIn: 'root',
})
export class ChatbotConversationReadService {
  readonly #chatbotFacade = inject(ChatbotFacade);

  checkConversationReadState(scrollElement: HTMLElement | null | undefined, context: ChatbotConversationReadContext): void {
    if (!this.#passesGuards(scrollElement, context)) {
      return;
    }

    if (!isConversationContentFullyVisible(scrollElement!)) {
      return;
    }

    this.#chatbotFacade.tryMarkActiveThreadAsSeen();
  }

  onConversationScroll(scrollElement: EventTarget | null, context: ChatbotConversationReadContext): void {
    if (!(scrollElement instanceof HTMLElement)) {
      return;
    }

    if (!this.#passesGuards(scrollElement, context)) {
      return;
    }

    if (!isConversationFullyConsumed(scrollElement)) {
      return;
    }

    this.#chatbotFacade.tryMarkActiveThreadAsSeen();
  }

  #passesGuards(scrollElement: HTMLElement | null | undefined, context: ChatbotConversationReadContext): boolean {
    if (!scrollElement) {
      return false;
    }

    if (context.isLoadingThread || context.isGenerationLoading) {
      return false;
    }

    if (context.messageCount === 0 || this.#chatbotFacade.threadId() === null) {
      return false;
    }

    return true;
  }
}
