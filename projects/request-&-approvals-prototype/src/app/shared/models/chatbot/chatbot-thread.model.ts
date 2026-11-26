import { IgntIconName } from '@ignite/icon';

import { ChatbotMessage, ChatbotMessageDTO } from './chatbot.model';

export interface ChatbotThreadDTO {
  created_at: string;
  thread_id: string;
  title: string;
  read?: boolean;
  updated_at?: string;
}

export interface ChatbotThread {
  createdAt: string;
  id: string;
  read: boolean;
  title: string;
  updatedAt: string | null;
}

export interface ChatbotThreadListDTO {
  next_cursor: string | null;
  threads: ChatbotThreadDTO[];
}

export interface ChatbotThreadListResponse {
  nextCursor: string | null;
  threads: ChatbotThread[];
}

export interface ChatbotThreadHistoryDTO {
  messages: ChatbotMessageDTO[];
  next_cursor: string | null;
  thread_id: string;
}

export interface ChatbotThreadHistory {
  messages: ChatbotMessage[];
  nextCursor: string | null;
  threadId: string;
}

export interface ChatbotThreadUpdateTitlePayload {
  title: string;
}

export interface ChatbotThreadsQuery {
  cursor?: string;
  limit?: number;
}

export interface ChatbotThreadHistoryQuery {
  cursor?: string;
  limit?: number;
}

export interface ChatbotThreadSearchQuery {
  q: string;
  cursor?: string;
  limit?: number;
}

export const CHATBOT_THREAD_MENU_ACTIONS = {
  Rename: 'rename',
} as const;

export type ChatbotThreadMenuActionId = (typeof CHATBOT_THREAD_MENU_ACTIONS)[keyof typeof CHATBOT_THREAD_MENU_ACTIONS];

export interface ChatbotThreadItemMenuAction {
  iconName: IgntIconName;
  id: ChatbotThreadMenuActionId;
  labelKey: string;
}

export interface ChatbotThreadsState {
  error: boolean;
  isLoading: boolean;
  nextCursor: string | null;
  searchQuery: string;
  threads: ChatbotThread[];
}
