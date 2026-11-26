export interface InvitationQuery {
  partnerId: number;
  planId: number;
  invitationId?: string;
  itemsPerPage?: number;
  page?: number;
  search?: string;
}
