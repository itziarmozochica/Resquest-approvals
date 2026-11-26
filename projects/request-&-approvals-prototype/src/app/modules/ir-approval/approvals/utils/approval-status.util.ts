import { type TagSentiment } from '@ignite/common';

import { ApprovalStatus } from '../models/approval-status.enum';

export function approvalStatusKey(status: ApprovalStatus | string): string {
  return status.toLowerCase();
}

export function approvalStatusSentiment(status: ApprovalStatus | string): TagSentiment {
  switch (status) {
    case ApprovalStatus.APPROVED:
      return 'positive';
    case ApprovalStatus.REJECTED:
      return 'danger';
    case ApprovalStatus.COMPLETED:
    case ApprovalStatus.SUBMITTED:
      return 'info';
    case ApprovalStatus.IN_REVIEW:
    case ApprovalStatus.CHANGES_REQUESTED:
      return 'warning';
    default:
      return 'disable';
  }
}
