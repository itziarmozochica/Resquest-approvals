import { defineEvent } from '@fz/fz-tracking/src/public-api';

import { ChatbotContextET } from './chatbot-context';

export interface SubmitChatbotFeedbackData {
  chatbotContext: ChatbotContextET;
  positive: boolean;
  runId: string;
  type: string;
}

export const submitChatbotFeedback = defineEvent<SubmitChatbotFeedbackData>('submit.chatbotFeedback');
