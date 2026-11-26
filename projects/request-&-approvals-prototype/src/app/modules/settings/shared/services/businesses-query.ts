export interface BusinessesQuery {
  organizationId: number;
  excludeB2bMarketplace?: boolean;
  channelId?: string;
  itemsPerPage?: number;
  onlyManagers?: boolean;
  page?: number;
  search?: string;
  type?: string;
}
