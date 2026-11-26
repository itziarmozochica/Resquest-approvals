import { defineEvent } from '@fz/fz-tracking/src/public-api';

export interface ConfirmWithdrawSubmissionData {
  plan_id: number;
}

export const confirmWithdrawSubmission = defineEvent<ConfirmWithdrawSubmissionData>('confirm.withdrawSubmission');
