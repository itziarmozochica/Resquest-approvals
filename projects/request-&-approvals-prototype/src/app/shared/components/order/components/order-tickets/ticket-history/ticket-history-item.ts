import { IconName } from '@fortawesome/fontawesome-svg-core';

export interface TicketHistoryItem {
  date: string | null;
  description: string | null;
  errorType: string | null;
  extraInfo: TransferHistoryInfo | ValidationHistoryInfo | null;
  icon: IconName;
  id: number | null;
  key: string;
  name: string;
  type: TicketHistoryItemType;
}

export interface TransferHistoryInfo {
  user: { email: string };
}

export interface ValidationHistoryInfo {
  profile: string | null;
  validator: { email: string | null; id: string } | null;
}

export enum TicketHistoryItemType {
  CREATED = 'created',
  DEFAULT = 'default',
  TRANSFER_COMPLETED = 'transfer_completed',
  TRANSFER_IN_PROGRESS = 'transfer_in_progress',
  VALIDATION = 'validation',
  VALIDATION_FAILED = 'validation_failed',
  VALIDATION_REVERTED = 'validation_reverted',
}
