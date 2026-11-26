import { HttpErrorResponse, HttpStatusCode } from '@angular/common/http';

import { BaseErrorResponse } from '@fz-original/app/shared/models/base-response';

import { ApprovalItemCommentErrorCode } from '../models/approval-item-comment-error-code.enum';

const errorKeys: Readonly<Record<string, string>> = {
  [ApprovalItemCommentErrorCode.ApprovalCancelled]: 'approvals.detail.comments.cancelledError',
  [ApprovalItemCommentErrorCode.CommentsUnsupported]: 'approvals.detail.comments.forbiddenError',
  [ApprovalItemCommentErrorCode.Forbidden]: 'approvals.detail.comments.forbiddenError',
  [ApprovalItemCommentErrorCode.Invalid]: 'approvals.detail.comments.invalidError',
};

const accessErrorCodes: ReadonlySet<string> = new Set<string>([
  ApprovalItemCommentErrorCode.ApprovalCancelled,
  ApprovalItemCommentErrorCode.Forbidden,
  ApprovalItemCommentErrorCode.CommentsUnsupported,
]);

export function commentPostErrorKey(error: BaseErrorResponse | null): string {
  return errorKeys[String(error?.code ?? '')] ?? 'approvals.detail.comments.postError';
}

export function commentEditErrorKey(error: BaseErrorResponse | null): string {
  return errorKeys[String(error?.code ?? '')] ?? 'approvals.detail.comments.editError';
}

export function isCommentAccessError(error: BaseErrorResponse | null): boolean {
  return accessErrorCodes.has(String(error?.code ?? ''));
}

export enum MentionAccessFailureAction {
  Hide = 'hide',
  RefreshAccess = 'refresh_access',
  Reload = 'reload',
  Toast = 'toast',
}

const mentionAccessReloadCodes: ReadonlySet<string> = new Set<string>([
  ApprovalItemCommentErrorCode.Invalid,
  ApprovalItemCommentErrorCode.CommentNotFound,
  ApprovalItemCommentErrorCode.ApprovalNotFound,
  ApprovalItemCommentErrorCode.ItemNotFound,
]);

const mentionAccessHideCodes: ReadonlySet<string> = new Set<string>([
  ApprovalItemCommentErrorCode.ApprovalCancelled,
  ApprovalItemCommentErrorCode.CommentsUnsupported,
]);

export function mentionAccessFailureAction(error: BaseErrorResponse | null): MentionAccessFailureAction {
  const code = String(error?.code ?? '');
  const status = error?.error instanceof HttpErrorResponse ? error.error.status : null;
  if (mentionAccessReloadCodes.has(code) || status === HttpStatusCode.NotFound) {
    return MentionAccessFailureAction.Reload;
  }
  if (code === ApprovalItemCommentErrorCode.MentionAccessUnavailable) {
    return MentionAccessFailureAction.RefreshAccess;
  }
  if (mentionAccessHideCodes.has(code) || status === HttpStatusCode.Conflict) {
    return MentionAccessFailureAction.Hide;
  }
  return MentionAccessFailureAction.Toast;
}
