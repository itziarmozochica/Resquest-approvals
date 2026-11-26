import { CityData } from '@fz-original/app/shared/models/plan/city.model';

export interface CitySearchResponse {
  cities: CityData[];
  total_count: number;
}
