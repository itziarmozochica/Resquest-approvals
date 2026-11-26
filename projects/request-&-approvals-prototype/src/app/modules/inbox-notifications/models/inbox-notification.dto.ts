import type { ChatbotMessageDTO } from '@fz-original/app/shared/models/chatbot/chatbot.model';

export interface PostActionDto {
  label: string | null;
  type: string;
  url: string | null;
}

/** A suggested question rendered as an action button in the FZ Assistant chat panel. */
export interface SuggestedQuestionDto {
  /** Short text shown on the button (backend caps it at 120 chars). */
  label: string;
  /** Full prompt sent to the assistant when the question is picked. */
  prompt: string;
}

/** The plan/partner the notification refers to. Present for insight-style notifications; may be absent. */
export interface NotificationIdentityDto {
  city: string | null;
  id_plan: number | null;
  id_plan_group: number | null;
  partner_name: string | null;
  plan_title: string | null;
  plan_url: string | null;
}

/** Snapshot of the FZ Assistant run that produced a `content_type: fz_assistant` notification. */
export interface FzAssistantPayloadDto {
  messages: ChatbotMessageDTO[] | null;
  run_id?: string | null;
  status?: string | null;
  thread_id?: string | null;
}

/**
 * Free-form per-notification payload. Only the fields the front consumes are typed; the index
 * signature keeps the rest of the backend payload (e.g. `card`) accessible.
 */
export interface NotificationPayloadDto {
  [key: string]: unknown;
  fz_assistant?: FzAssistantPayloadDto;
  identity?: NotificationIdentityDto;
}

export interface NotificationDto {
  body: string | null;
  content_type: string;
  created_at: string;
  expires_at: string | null;
  file_path: string | null;
  file_url: string | null;
  id: string;
  partner_id: string;
  payload: NotificationPayloadDto;
  post_actions: PostActionDto[] | null;
  semantic_context: string;
  source: string;
  suggested_questions: SuggestedQuestionDto[] | null;
  title: string | null;
  type: string;
  user_email: string | null;
  user_id: string | null;
  tags?: string[] | null;
}

export interface InboxItemDto {
  notification: NotificationDto;
  seen: boolean;
}

export interface FindUserInboxResponseDto {
  items: InboxItemDto[];
  next_cursor: string | null;
  unseen_count: number;
}
