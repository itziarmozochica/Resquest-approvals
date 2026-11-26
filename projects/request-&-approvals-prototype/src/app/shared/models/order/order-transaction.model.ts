import { Money } from '../money.model';

export type OrderTransactionStatus = 'cancelled' | 'completed' | 'failed' | 'in_progress';

export interface OrderTransaction {
  amount: Money;
  createdAt: string;
  failureCategory: string | null;
  id: string;
  method: string;
  position: number;
  status: OrderTransactionStatus;
  terminalId: string | null;
}
