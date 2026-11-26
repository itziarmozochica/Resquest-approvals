import { defineEvent } from '@fz/fz-tracking/src/public-api';

import { ChatbotContextET } from './chatbot-context';

export interface SelectChatbotHistoryThreadData {
  chatbotContext: ChatbotContextET;
}

export const selectChatbotHistoryThread = defineEvent<SelectChatbotHistoryThreadData>('select.chatbotHistoryThread');
