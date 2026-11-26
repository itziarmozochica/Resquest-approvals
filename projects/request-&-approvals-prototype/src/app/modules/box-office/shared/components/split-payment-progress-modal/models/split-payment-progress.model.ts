import { Money } from '@fz-original/app/shared/models/money.model';

export interface SplitPaymentProgressSummary {
  paidAmount: Money;
  toBePaidAmount: Money;
  totalAmount: Money;
}

export type SplitItemStatus = 'completed' | 'in_progress';

export interface SplitItem {
  amount: Money;
  durationSeconds: number;
  index: number;
  pspDescription: string;
  status: SplitItemStatus;
  terminalDescription: string;
  completedAt?: string;
  errorCondition?: string | null;
  id?: string;
  rawStatus?: string;
}

export interface SplitPaymentProgressState {
  currentSplitIndex: number;
  splits: SplitItem[];
  summary: SplitPaymentProgressSummary;
}
