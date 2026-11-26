import { defineEvent } from '@fz/fz-tracking/src/public-api';

import { ChatbotContextET } from './chatbot-context';

export const OpenChatbotEntryPoint = {
  autoOpen: 'auto_open',
  banner: 'banner',
  card: 'card',
  inboxNotification: 'inbox_notification',
  popup: 'popup',
  sidebar: 'sidebar',
  topBar: 'top_bar',
} as const;

export type OpenChatbotEntryPointET = (typeof OpenChatbotEntryPoint)[keyof typeof OpenChatbotEntryPoint];

export interface OpenChatbotData {
  chatbotContext: ChatbotContextET;
  entryPoint?: OpenChatbotEntryPointET;
  notificationId?: string;
  notificationType?: string;
  searchString?: string;
}

export const openChatbot = defineEvent<OpenChatbotData>('open.chatbot');
