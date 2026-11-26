import type { ChatbotMessage } from '@fz-original/app/shared/models/chatbot/chatbot.model';

export type PostActionType = 'open_fz_assistant' | 'open_document_view';

export type NotificationContentType = 'fz_assistant' | 'html' | 'markdown' | 'text';

export interface PostAction {
  label: string | null;
  type: PostActionType;
  url: string | null;
}

export interface SuggestedQuestion {
  readonly label: string;
  readonly prompt: string;
}

/** Backend `tags`: business family/category (closed enum), multi-valued, independent of `type`. */
export type NotificationFamily = 'generic' | 'pricing' | 'sales';

export interface InboxNotification {
  assistantMessages: readonly ChatbotMessage[];
  city: string | null;
  contentType: NotificationContentType;
  description: string;
  embedUrl: string | null;
  id: string;
  isRead: boolean;
  isShareable: boolean;
  markdownUrl: string | null;
  partnerName: string | null;
  planTitle: string | null;
  postActions: PostAction[];
  suggestedQuestions: SuggestedQuestion[];
  tags: readonly NotificationFamily[];
  timestamp: Date;
  title: string;
  type: string;
}
