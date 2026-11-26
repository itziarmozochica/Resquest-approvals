import { Money } from '@fz-original/app/shared/models/money.model';

export interface CancellationCouponSummary {
  amount: Money | null;
  code: string;
  isAvailable: boolean;
  ownerEmail: string | null;
}
