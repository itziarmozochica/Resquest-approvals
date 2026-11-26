export class Balance {
  constructor(
    public amount: number,
    public currency: string,
    public lastUpdate?: string | null,
  ) {}

  static get AMOUNT_MAX() {
    return 9999999.99;
  }
}
