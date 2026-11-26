export class PlaceOption {
  constructor(
    public planId: number,
    public id: number,
    public name: string,
    public cityId: number,
    public cityName: string,
    public cityTimezone: string,
  ) {}
}
