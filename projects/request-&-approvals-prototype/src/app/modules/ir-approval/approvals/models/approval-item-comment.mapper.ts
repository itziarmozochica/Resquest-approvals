import {
  ApprovalItemCommentApiDto,
  ApprovalItemCommentMentionAccessGrantApiDto,
  ApprovalItemCommentsSummaryApiDto,
  ApprovalMentionableApiDto,
} from './approval-api.model';
import {
  ApprovalItemComment,
  ApprovalItemCommentKind,
  ApprovalItemCommentsSummary,
  ApprovalMentionable,
  ApprovalMentionAccessGrant,
} from './approval-item-comment.model';

export function mapItemCommentsSummary(dto: ApprovalItemCommentsSummaryApiDto | null | undefined): ApprovalItemCommentsSummary {
  return {
    enabled: dto?.enabled === true,
    canPost: dto?.can_post === true,
    counts: mapCounts(dto?.counts),
    mentionable: (dto?.mentionable ?? []).flatMap(mapMentionable),
  };
}

export function mapItemComment(dto: ApprovalItemCommentApiDto): ApprovalItemComment {
  return {
    id: dto.id,
    itemId: dto.item_id,
    authorEmail: dto.author_email,
    authorName: dto.author_name?.trim() || dto.author_email,
    body: dto.body,
    kind: dto.kind === ApprovalItemCommentKind.RejectionReason ? ApprovalItemCommentKind.RejectionReason : ApprovalItemCommentKind.Comment,
    mentionedEmails: dto.mentioned_emails ?? [],
    createdAt: new Date(dto.created_at),
    editedAt: dto.edited_at ? new Date(dto.edited_at) : null,
    unnotifiedMentionEmails: dto.unnotified_mention_emails ?? [],
  };
}

export function mapMentionAccessGrant(dto: ApprovalItemCommentMentionAccessGrantApiDto): ApprovalMentionAccessGrant {
  return { comment: mapItemComment(dto), isAccessGranted: dto.access_granted !== false };
}

function mapCounts(dto: Record<string, number> | null | undefined): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const [itemId, count] of Object.entries(dto ?? {})) {
    if (Number.isInteger(count) && count > 0) {
      counts[itemId] = count;
    }
  }
  return counts;
}

function mapMentionable(dto: ApprovalMentionableApiDto): ApprovalMentionable[] {
  const email = dto?.email?.trim();
  if (!email) {
    return [];
  }
  return [{ email, name: dto.name?.trim() || email, hasAccess: dto.has_access !== false }];
}
