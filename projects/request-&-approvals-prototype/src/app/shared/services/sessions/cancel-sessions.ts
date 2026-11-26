export interface CancelSessionsBody {
  cancellationReason: number;
  reimbursementMethod: string;
  sessionIds: number[];
  comments?: string;
  customMessage?: string;
  internalComments?: string;
}

export interface CancelSessionsBodyDTO {
  cancellation_reason: number;
  compensation_type: string;
  session_ids: number[];
  comments?: string;
  custom_message?: string;
  internal_comments?: string;
}
