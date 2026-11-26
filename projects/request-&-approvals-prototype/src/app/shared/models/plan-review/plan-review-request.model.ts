export type PlanReviewRequestStatus = 'submitted' | 'claimed' | 'approved' | 'rejected' | 'withdrawn';

export interface PlanReviewRequestStatusData {
  review_id: string | number | null;
  status: PlanReviewRequestStatus | null;
  approved_at?: string | null;
  claimed_at?: string | null;
  comments?: PlanReviewRequestComment[] | null;
  rejected_at?: string | null;
  reviewer?: number | null;
  submitted_at?: string | null;
  submitter?: number | { id: number } | null;
}

export interface PlanReviewRequestComment {
  comment: string;
  created_at: string;
  id: number;
}

export class PlanReviewRequestModel {
  constructor(
    public status: PlanReviewRequestStatus | null,
    public reviewId: string | null,
    public reviewerId: number | null,
    public submitterId: number | null,
    public submittedAt: Date | null,
    public claimedAt: Date | null,
    public rejectedAt: Date | null,
    public approvedAt: Date | null,
    public comments: PlanReviewRequestComment[] | null,
  ) {}

  get canBeApproved(): boolean {
    return this.status === 'claimed';
  }

  get canBeClaimed(): boolean {
    return this.status === 'submitted';
  }

  get canBeRejected(): boolean {
    return this.status === 'claimed';
  }

  get canBeReleased(): boolean {
    return this.status === 'claimed';
  }

  get canBeSubmitted(): boolean {
    return this.status === null || this.status === 'rejected' || this.status === 'withdrawn';
  }

  get canBeWithdrawn(): boolean {
    return this.status === 'submitted';
  }

  get isInProgress(): boolean {
    return this.status === 'submitted' || this.status === 'claimed';
  }
}
