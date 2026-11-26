import { Injectable } from '@angular/core';

import { AdapterInterface } from '@fz-original/app/core/adapter.interface';
import type { ChatbotMessage } from '@fz-original/app/shared/models/chatbot/chatbot.model';
import { fromChatbotMessageDto } from '@fz-original/app/shared/utils/chatbot.util';

import {
  FindUserInboxResponseDto,
  InboxItemDto,
  NotificationDto,
  PostActionDto,
  SuggestedQuestionDto,
} from '../models/inbox-notification.dto';
import {
  InboxNotification,
  NotificationContentType,
  NotificationFamily,
  PostAction,
  PostActionType,
  SuggestedQuestion,
} from '../models/inbox-notification.model';
import { InboxNotificationsPage } from '../models/inbox-notifications-page.model';

/**
 * The backend `content_type` is an open string; this adapter is the only place that interprets it,
 * closing it into the `NotificationContentType` union (any unrecognized value becomes `text`).
 */
const FZ_ASSISTANT_CONTENT_TYPE = 'fz_assistant';
const HTML_CONTENT_TYPE = 'html';
const MARKDOWN_CONTENT_TYPE = 'markdown';

/**
 * DWH sentinel for unassigned dimension values (e.g. COALESCE(DS_METAPARTNER, '-')); it reaches the
 * inbox API verbatim through the producer's `identity`, so it must be treated as "no data".
 */
const DWH_PLACEHOLDER = '-';

/**
 * Closed set of recognized business families; any other value in `tags` is dropped at the frontier. Declared as
 * `ReadonlySet<string>` (not `ReadonlySet<NotificationFamily>`) so `#adaptTags` can call `.has(tag)` with the raw
 * `string` from the wire without a cast; the `Set<NotificationFamily>` initializer still catches typos at compile time.
 */
const NOTIFICATION_FAMILIES: ReadonlySet<string> = new Set<NotificationFamily>(['generic', 'pricing', 'sales']);

@Injectable({ providedIn: 'root' })
export class InboxNotificationsAdapter implements AdapterInterface<InboxNotificationsPage, FindUserInboxResponseDto> {
  fromApi(response: FindUserInboxResponseDto): InboxNotificationsPage {
    return {
      items: response.items.map(item => this.#adaptItem(item)),
      nextCursor: response.next_cursor,
      unseenCount: response.unseen_count,
    };
  }

  /**
   * Maps a single peeled `NotificationDto` (e.g. the get-by-id response, which carries no `seen`) into the
   * domain model. The sole mapping source: `#adaptItem` delegates here so list and single-item paths stay in sync.
   */
  fromNotificationDto(notification: NotificationDto, seen = false): InboxNotification {
    const identity = notification.payload.identity;

    return {
      assistantMessages: this.#adaptAssistantMessages(notification),
      city: identity?.city ?? null,
      contentType: this.#resolveContentType(notification.content_type),
      description: notification.body ?? '',
      embedUrl: this.#resolveEmbedUrl(notification),
      id: notification.id,
      isRead: seen,
      isShareable: this.#resolveIsShareable(notification),
      markdownUrl: this.#resolveMarkdownUrl(notification),
      partnerName: identity?.partner_name ?? null,
      planTitle:
        this.#normalizeText(identity?.plan_title) ?? this.#normalizeText(identity?.partner_name) ?? this.#normalizeText(identity?.city),
      postActions: notification.post_actions?.map(action => this.#adaptPostAction(action)) ?? [],
      suggestedQuestions: notification.suggested_questions?.map(question => this.#adaptSuggestedQuestion(question)) ?? [],
      tags: this.#adaptTags(notification.tags),
      timestamp: new Date(notification.created_at),
      title: notification.title ?? '',
      type: this.#normalizeType(notification.type),
    };
  }

  /**
   * Frozen conversation snapshot for `fz_assistant`; built once here (not in a reactive getter) so the chart
   * atom's reference-based re-fetch stays stable — see the plan §6 and `CONTEXT.md`. Empty for other types.
   */
  #adaptAssistantMessages(notification: NotificationDto): readonly ChatbotMessage[] {
    return notification.payload.fz_assistant?.messages?.map(fromChatbotMessageDto) ?? [];
  }

  #adaptItem(item: InboxItemDto): InboxNotification {
    return this.fromNotificationDto(item.notification, item.seen);
  }

  #adaptPostAction(action: PostActionDto): PostAction {
    return {
      label: action.label,
      type: action.type as PostActionType,
      url: action.url,
    };
  }

  #adaptSuggestedQuestion(question: SuggestedQuestionDto): SuggestedQuestion {
    return {
      label: question.label,
      prompt: question.prompt,
    };
  }

  /**
   * Closes `tags` to the domain union and drops unrecognized values. `null`/`undefined`/`[]` (pre-migration
   * rows or a nullable backend) stay `[]`; the display layer, not the adapter, applies the generic fallback.
   */
  #adaptTags(tags: string[] | null | undefined): readonly NotificationFamily[] {
    return (tags ?? []).filter((tag): tag is NotificationFamily => NOTIFICATION_FAMILIES.has(tag));
  }

  /**
   * Rows stored before the backend normalized `type` (PRD-3912) can carry legacy kebab-case values;
   * canonicalizing to snake_case here keeps display, tracking and assistant context on one form.
   */
  #normalizeType(type: string): string {
    return type.replace(/-/g, '_');
  }

  /** Collapses absent, empty, whitespace-only or DWH-placeholder ("-") strings to null so fallbacks apply. */
  #normalizeText(value: string | null | undefined): string | null {
    const trimmed = value?.trim() ?? '';
    return trimmed.length > 0 && trimmed !== DWH_PLACEHOLDER ? trimmed : null;
  }

  #resolveContentType(rawContentType: string): NotificationContentType {
    if (rawContentType === FZ_ASSISTANT_CONTENT_TYPE) return 'fz_assistant';
    if (rawContentType === HTML_CONTENT_TYPE) return 'html';
    if (rawContentType === MARKDOWN_CONTENT_TYPE) return 'markdown';
    return 'text';
  }

  #resolveEmbedUrl(notification: NotificationDto): string | null {
    return notification.content_type === HTML_CONTENT_TYPE ? (notification.file_url ?? null) : null;
  }

  /**
   * A notification is shareable only when it targets the whole partner (no individual recipient). The rule
   * lives here so components never reason about targeting; see the domain glossary in `CONTEXT.md`.
   */
  #resolveIsShareable(notification: NotificationDto): boolean {
    return notification.user_id == null && notification.user_email == null;
  }

  /**
   * Resolves the remote markdown source from `file_url`, but only for markdown notifications; HTML keeps
   * `embedUrl` as its sole file source. Empty/whitespace-only URLs collapse to null so the dialog treats
   * "empty = this source contributes nothing" (see the resolution rule in `CONTEXT.md`), never `""`.
   */
  #resolveMarkdownUrl(notification: NotificationDto): string | null {
    return notification.content_type === MARKDOWN_CONTENT_TYPE ? this.#normalizeText(notification.file_url) : null;
  }
}
