import { defineEvent } from '@fz/fz-tracking/src/public-api';

import { ChatbotContextET } from './chatbot-context';

export const SendChatbotMessageSource = {
  manual: 'manual',
  notificationAction: 'notification_action',
  suggestion: 'suggestion',
  topBar: 'top_bar',
} as const;

export type SendChatbotMessageSourceET = (typeof SendChatbotMessageSource)[keyof typeof SendChatbotMessageSource];

export interface SendChatbotMessageData {
  chatbotContext: ChatbotContextET;
  source: SendChatbotMessageSourceET;
  notificationId?: string;
  notificationType?: string;
}

export const sendChatbotMessage = defineEvent<SendChatbotMessageData>('send.chatbotMessage');
