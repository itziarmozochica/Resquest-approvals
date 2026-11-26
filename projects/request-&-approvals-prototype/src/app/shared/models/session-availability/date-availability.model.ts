export class DateAvailability {
  constructor(
    public date: string,
    public isPurchasable: boolean,
  ) {}

  isDisabled(): boolean {
    return !this.isPurchasable;
  }
}
