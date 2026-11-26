export interface SeatingMapQuery {
  partnerId: number | undefined;
  readonly?: boolean;
  numberOfSeats?: number;
  sessionIds?: number[];
  channel: string | null;
  skipBsa?: boolean;
}
