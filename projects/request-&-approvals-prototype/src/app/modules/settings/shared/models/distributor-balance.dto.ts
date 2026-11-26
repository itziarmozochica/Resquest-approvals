export interface DistributorBalanceDto {
  amount: number | null;
  currency: string | null;
  distributor_organization_id: number;
  last_update: string | null;
  partner_id: number;
  partner_name: string | null;
}

export interface DistributorBalancesDto {
  balances: DistributorBalanceDto[];
  count: number;
}
