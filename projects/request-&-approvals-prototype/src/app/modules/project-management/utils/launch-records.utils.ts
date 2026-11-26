import { ApprovalStatus } from '@fz-original/app/modules/ir-approval/approvals/models/approval-status.enum';
import { Approval } from '@fz-original/app/modules/ir-approval/approvals/models/approval.model';
import { InformationRequestStatus } from '@fz-original/app/modules/ir-approval/information-requests/models/information-request-status.enum';
import { InformationRequest } from '@fz-original/app/modules/ir-approval/information-requests/models/information-request.model';
import { TagSentiment } from '@ignite/legacy/components/ignt-tag/ignt-tag.component';

import { Project } from '../models/project.model';

export function sortByCreatedAtDesc<T extends { createdAt: Date }>(items: readonly T[]): T[] {
  return [...items].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
}

function hasAnswer(answer: unknown): boolean {
  if (answer === null || answer === undefined) {
    return false;
  }
  if (typeof answer === 'string') {
    return answer.trim().length > 0;
  }
  if (typeof answer === 'number') {
    return !Number.isNaN(answer);
  }
  if (typeof answer === 'boolean') {
    return true;
  }
  if (Array.isArray(answer)) {
    return answer.length > 0;
  }
  if (typeof answer === 'object') {
    return Object.keys(answer as object).length > 0;
  }
  return false;
}

export function irRequiredProgress(request: InformationRequest): { completed: number; total: number } {
  const required = (request.questions ?? []).filter(question => question.required);
  const completed = required.filter(question => hasAnswer(question.answer)).length;
  return { completed, total: required.length };
}

export function countApprovedAssets(approval: Approval): number {
  return approval.assets.filter(asset => asset.reviewStatus === ApprovalStatus.APPROVED).length;
}

export function isCancelledRequest(request: InformationRequest): boolean {
  return request.status === InformationRequestStatus.CANCELLED;
}

export function isCancelledApproval(approval: Approval): boolean {
  return approval.status === ApprovalStatus.CANCELLED;
}

export function isPendingRequest(request: InformationRequest): boolean {
  return request.status === InformationRequestStatus.PENDING || request.status === InformationRequestStatus.CHANGES_REQUESTED;
}

// The invariant: this set must equal the status set the server-side counter uses, or the counter
// cards and these filters disagree. The counter counts backend PENDING and FEEDBACK, which the
// approval mapper surfaces as IN_REVIEW and CHANGES_REQUESTED — the same two statuses it grants
// approve/reject actions to. Every required item being decided is surfaced as COMPLETED; legacy
// APPROVED/REJECTED remain terminal. DRAFT is not counted by the server and is not shown here as
// pending; like cancelled, it is out of circulation and belongs to neither bucket.
export function isPendingApproval(approval: Approval): boolean {
  return approval.status === ApprovalStatus.IN_REVIEW || approval.status === ApprovalStatus.CHANGES_REQUESTED;
}

export function closedGatesTime(launch: Project): number | null {
  const time = launch.closedGatesDate instanceof Date ? launch.closedGatesDate.getTime() : NaN;
  return Number.isNaN(time) ? null : time;
}

// `closed_gates_date` is a calendar date that the mapper parses as UTC midnight, and the backend keeps a
// launch active through that whole day. So a launch is upcoming while its close-gates time is not before
// the viewer's local today, expressed the same way (UTC midnight of that calendar date).
export function isUpcomingCloseDate(closesAt: number, now: Date): boolean {
  return closesAt >= Date.UTC(now.getFullYear(), now.getMonth(), now.getDate());
}

export function hasPendingRecords(launch: Project): boolean {
  return (launch.pendingInformationRequestsCount ?? 0) > 0 || (launch.pendingApprovalsCount ?? 0) > 0;
}

export function hasPendingEvaluationRecords(launch: Project): boolean {
  return launch.pendingEvaluationInformationRequestsCount > 0 || launch.pendingEvaluationApprovalsCount > 0;
}

export function isDraftApproval(approval: Approval): boolean {
  return approval.status === ApprovalStatus.DRAFT;
}

export function isOutOfCirculationApproval(approval: Approval): boolean {
  return isCancelledApproval(approval) || isDraftApproval(approval);
}

export function irStatusSentiment(status: InformationRequestStatus): TagSentiment {
  switch (status) {
    case InformationRequestStatus.APPROVED:
    case InformationRequestStatus.COMPLETED:
      return 'positive';
    case InformationRequestStatus.REJECTED:
      return 'danger';
    case InformationRequestStatus.IN_REVIEW:
    case InformationRequestStatus.CHANGES_REQUESTED:
      return 'warning';
    case InformationRequestStatus.SUBMITTED:
      return 'info';
    // Cancelled items render grey/disabled, as does PENDING. The tag label text is what
    // distinguishes them; re-colouring PENDING is out of scope for this feature.
    case InformationRequestStatus.CANCELLED:
      return 'disable';
    default:
      return 'disable';
  }
}

export function approvalStatusSentiment(status: ApprovalStatus): TagSentiment {
  switch (status) {
    case ApprovalStatus.APPROVED:
      return 'positive';
    case ApprovalStatus.REJECTED:
      return 'danger';
    case ApprovalStatus.IN_REVIEW:
    case ApprovalStatus.CHANGES_REQUESTED:
      return 'warning';
    case ApprovalStatus.SUBMITTED:
      return 'info';
    case ApprovalStatus.CANCELLED:
      return 'disable';
    default:
      return 'disable';
  }
}
