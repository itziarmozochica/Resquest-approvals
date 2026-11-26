import type { ChatbotMessage } from '@fz-original/app/shared/models/chatbot/chatbot.model';
import type { TagSentiment } from '@ignite/legacy/components/ignt-tag/ignt-tag.component';

/**
 * How the notification body is presented. Twin of the inbox `NotificationContentType`, redeclared here
 * so this module stays decoupled from the inbox domain model.
 */
export type FzAssistantContentType = 'fz_assistant' | 'html' | 'markdown' | 'text';

/** Visual tag (resolved label + color) for the notification header. */
export interface FzAssistantNotificationTag {
  readonly labelKey: string;
  readonly sentiment: TagSentiment;
}

/**
 * Self-contained view of a notification for the dialog header. Built by the inbox caller so this
 * module stays decoupled from the inbox `InboxNotification` domain model.
 */
export interface FzAssistantNotificationSummary {
  readonly contentType: FzAssistantContentType;
  readonly description: string;
  readonly planTitle: string | null;
  readonly tags: readonly FzAssistantNotificationTag[];
  readonly timestamp: Date;
  readonly title: string;
}

/**
 * Suggested question shown as an action button in the dialog chat panel ("what would you like to do next?").
 * `label` is the button text (server-driven, rendered as-is); `prompt` is the message sent to the assistant when picked.
 */
export interface FzAssistantInsightAction {
  readonly label: string;
  readonly prompt: string;
}

export interface FzAssistantNotificationsDialogData {
  readonly actions?: readonly FzAssistantInsightAction[];
  readonly assistantMessages?: readonly ChatbotMessage[];
  readonly initialQuery?: string;
  readonly insightUrl?: string | null;
  readonly markdownUrl?: string | null;
  readonly notification?: FzAssistantNotificationSummary;
  readonly notificationId?: string;
  readonly notificationType?: string;
  readonly shareUrl?: string | null;
  readonly onShare?: () => void;
}

/** Options accepted by `FzAssistantNotificationsDialogService.open()`. */
export interface FzAssistantNotificationsDialogOpenOptions {
  readonly actions?: readonly FzAssistantInsightAction[];
  readonly assistantMessages?: readonly ChatbotMessage[];
  readonly insightUrl?: string | null;
  readonly markdownUrl?: string | null;
  readonly notification?: FzAssistantNotificationSummary;
  readonly notificationId?: string;
  readonly notificationType?: string;
  readonly shareUrl?: string | null;
  readonly onShare?: () => void;
}

/**
 * Front-end fallback shown when a notification carries no `suggested_questions` (absent or `[]`).
 * Verbatim copy of the backend `DEFAULT_SUGGESTED_QUESTIONS` (data-notifications-inbox PR #28) so the
 * dialog always offers 3 buttons from a single source of truth.
 */
export const DEFAULT_SUGGESTED_QUESTIONS: readonly FzAssistantInsightAction[] = [
  {
    label: 'What can you tell me about this?',
    prompt: 'Give me a clear, concise summary of this notification — what it means and why it matters for my business.',
  },
  {
    label: 'What else should I know?',
    prompt: 'What additional context, implications or next steps about this notification should I be aware of?',
  },
  {
    label: "I have an idea for a notification I'd like to receive.",
    prompt: "I'd like to suggest a new type of notification or insight I'd find useful. Help me describe it.",
  },
];
