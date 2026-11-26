export interface ApprovalMentionable {
  email: string;
  name: string;
  hasAccess: boolean;
}

export interface ApprovalItemCommentsSummary {
  enabled: boolean;
  canPost: boolean;
  counts: Record<string, number>;
  mentionable: ApprovalMentionable[];
}

export enum ApprovalItemCommentKind {
  Comment = 'comment',
  RejectionReason = 'rejection_reason',
}

export interface ApprovalItemComment {
  id: string;
  itemId: string;
  authorEmail: string;
  authorName: string;
  body: string;
  kind: ApprovalItemCommentKind;
  mentionedEmails: string[];
  createdAt: Date;
  editedAt: Date | null;
  unnotifiedMentionEmails: string[];
}

export interface ApprovalItemCommentDraft {
  body: string;
  mentionedEmails: string[];
}

export interface ApprovalItemCommentSegment {
  text: string;
  mention: boolean;
}

export enum ApprovalMentionAccessAction {
  Add = 'add',
  Dismiss = 'dismiss',
}

export interface ApprovalMentionAccessGrant {
  comment: ApprovalItemComment;
  isAccessGranted: boolean;
}

export type ApprovalMentionAccessOutcome =
  | ({ action: ApprovalMentionAccessAction.Add } & ApprovalMentionAccessGrant)
  | { action: ApprovalMentionAccessAction.Dismiss; comment: ApprovalItemComment };

export interface ApprovalUnnotifiedMention {
  email: string;
  name: string;
  isAdding: boolean;
  isDismissing: boolean;
}

export interface ApprovalItemCommentView {
  comment: ApprovalItemComment;
  initials: string;
  isRejectionReason: boolean;
  segments: ApprovalItemCommentSegment[];
  displayedAt: Date;
  isEditable: boolean;
  unnotifiedMentions: ApprovalUnnotifiedMention[];
}

export type ApprovalItemCommentField = 'composer' | 'editor';

export interface ApprovalMentionOption {
  person: ApprovalMentionable;
  initials: string;
  isWithoutAccess: boolean;
}

export interface ApprovalItemCommentCount {
  count: number;
  revision: number;
}

export interface ApprovalItemCommentCounts {
  counts: Record<string, number>;
  revision: number;
}

export const approvalItemCommentMaxLength = 5000;

export const approvalCommentMentionKeys: readonly string[] = ['ArrowDown', 'ArrowUp', 'Enter', 'Escape', 'Tab'];
