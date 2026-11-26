export interface AuctionSettings {
  auctionStartsAt: Date | null;
  auctionEndsAt: Date | null;
  eventStartsAt: Date | null;
  eventEndsAt: Date | null;
  maximumBidIncrement: number | null;
  minimumBidIncrement: number | null;
  status?: string | null;
  startingBidAmount: number | null;
}

export interface AuctionSettingsData {
  auction_starts_at: string | null;
  auction_ends_at: string | null;
  event_starts_at: string | null;
  event_ends_at: string | null;
  extension_duration_minutes: number | null;
  extension_window_minutes: number | null;
  max_extension_count: number | null;
  maximum_bid_increment: number | null;
  minimum_bid_increment: number;
  status?: string | null;
  starting_bid_amount: number | null;
}
