import { City, CityData } from './city.model';

export interface PlaceData extends Omit<Place, 'zipCode' | 'city'> {
  city: CityData;
  zip_code?: string;
}

export class Place {
  constructor(
    public id: number,
    public name: string,
    public address: string,
    public city: City | null,
    public zipCode?: string | null,
  ) {}
}
