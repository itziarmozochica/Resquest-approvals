export class InvoicingPeriod {
  constructor(
    public startsAt: string,
    public endsAt: string,
    public amount: number,
    public currency: string,
  ) {}
}
