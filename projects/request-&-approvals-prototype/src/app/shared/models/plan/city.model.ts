export interface CityData extends Omit<City, 'timeZone' | 'currency'> {
  timezone: string;
  currency: string;
  standard_id?: number;
  country?: string;
  country_iso_code?: string;
}

export class City {
  constructor(
    public id: number,
    public name: string,
    public timeZone: string,
    // eslint-disable-next-line @typescript-eslint/naming-convention
    public standard_id?: number, //TODO(@nestor) review this naming
    public currency?: string,
    public country?: string,
  ) {}
}
