export interface BusinessQuery {
  businessId: string;
  organizationId: number;
  excludeB2bMarketplace?: boolean;
  userId?: number;
}
