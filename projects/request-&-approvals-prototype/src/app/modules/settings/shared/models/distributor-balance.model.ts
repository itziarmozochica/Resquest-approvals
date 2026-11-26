export interface DistributorBalance {
  amount: number | null;
  currency: string | null;
  lastUpdate: string | null;
  partnerId: number;
  partnerName: string | null;
}

export interface DistributorBalances {
  balances: DistributorBalance[];
  count: number;
}
