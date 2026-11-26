import { defineEvent } from '@fz/fz-tracking/src/public-api';

import { ChatbotContextET } from './chatbot-context';

export interface OpenChatbotHistoryData {
  chatbotContext: ChatbotContextET;
}

export const openChatbotHistory = defineEvent<OpenChatbotHistoryData>('open.chatbotHistory');
