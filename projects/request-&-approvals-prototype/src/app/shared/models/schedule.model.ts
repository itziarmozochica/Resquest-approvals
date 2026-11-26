export class Schedule {
  constructor(
    public startsAt: string | null,
    public expiresAt: string | null,
    public endsAt: string | null,
    public soldTickets?: number,
    public purchasableSince?: string | null,
  ) {}

  updateSchedule(startsAt: string, expiresAt: string, endsAt: string, soldTickets: number): void {
    this.startsAt = this.startsAt === startsAt ? this.startsAt : null;
    this.endsAt = this.endsAt === endsAt ? this.endsAt : null;
    this.expiresAt = this.expiresAt === expiresAt ? this.expiresAt : null;
    this.soldTickets = this.soldTickets && this.soldTickets > soldTickets ? this.soldTickets : soldTickets;
  }
}
