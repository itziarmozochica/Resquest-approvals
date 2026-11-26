import { normaliseCommentEmail } from './approval-comment-mentions.util';

export function mentionNoticeKey(commentId: string, email: string): string {
  return `${commentId}\n${normaliseCommentEmail(email)}`;
}
