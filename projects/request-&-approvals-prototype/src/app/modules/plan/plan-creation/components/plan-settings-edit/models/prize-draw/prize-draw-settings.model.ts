export interface PrizeDrawSettings {
  pointsAmountPerParticipation: number | null;
  drawEndsAt?: Date | null;
  drawStartsAt?: Date | null;
  eventEndsAt?: Date | null;
  eventStartsAt?: Date | null;
  status?: string | null;
}

export interface PrizeDrawSettingsData {
  points_amount_per_participation: number | null;
  draw_ends_at?: string | null;
  draw_starts_at?: string | null;
  event_ends_at?: string | null;
  event_starts_at?: string | null;
  status?: string | null;
}
