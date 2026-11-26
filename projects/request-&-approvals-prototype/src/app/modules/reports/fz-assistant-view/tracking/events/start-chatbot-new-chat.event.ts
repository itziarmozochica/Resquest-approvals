import { defineEvent } from '@fz/fz-tracking/src/public-api';

import { ChatbotContextET } from './chatbot-context';

export interface StartChatbotNewChatData {
  chatbotContext: ChatbotContextET;
}

export const startChatbotNewChat = defineEvent<StartChatbotNewChatData>('start.chatbotNewChat');
