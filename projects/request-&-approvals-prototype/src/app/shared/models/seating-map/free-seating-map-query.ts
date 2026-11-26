export interface FreeSeatingMapQuery {
  partnerId: number | undefined;
  planId: number;
  placeId: number;
  seatingPoolId: number;
  channel: string;
  isHidden?: boolean;
  channelId?: string;
}
