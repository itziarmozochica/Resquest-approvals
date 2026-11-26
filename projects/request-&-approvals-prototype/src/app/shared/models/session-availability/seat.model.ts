export interface SeatData extends Omit<Seat, 'poolId'> {
  pool_id: number;
}

export class Seat {
  constructor(
    public category: string,
    public seats: string[],
    public poolId: number | null = null,
    public holdToken?: string,
  ) {}
}
