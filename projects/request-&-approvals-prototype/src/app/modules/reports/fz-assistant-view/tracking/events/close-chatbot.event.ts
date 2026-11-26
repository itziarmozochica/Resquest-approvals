import { defineEvent } from '@fz/fz-tracking/src/public-api';

import { ChatbotContextET } from './chatbot-context';

export const CloseChatbotReason = {
  browserBack: 'browser_back',
  buttonClick: 'button_click',
} as const;

export type CloseChatbotReasonET = (typeof CloseChatbotReason)[keyof typeof CloseChatbotReason];

export interface CloseChatbotData {
  chatbotContext: ChatbotContextET;
  reason?: CloseChatbotReasonET;
}

export const closeChatbot = defineEvent<CloseChatbotData>('close.chatbot');
