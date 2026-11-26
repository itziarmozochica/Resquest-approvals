import { inject, Injectable } from '@angular/core';

import { SelectOption } from '@fz-original/app/shared/layout/filters/select/select.interface';
import { City } from '@fz-original/app/shared/models/plan/city.model';
import { PartnerService } from '@fz-original/app/shared/services/partner/partner.service';
import { Observable, of } from 'rxjs';
import { map } from 'rxjs/operators';

import { CitiesService } from './cities.service';

@Injectable({
  providedIn: 'root',
})
export class CityMatchingService {
  #citiesService = inject(CitiesService);
  #partnerService = inject(PartnerService);

  findInOptions(options: SelectOption[], cityName: string): SelectOption | null {
    return this.#matchByName(options, cityName, (option: SelectOption) => option.title);
  }

  findInCities(cities: City[], cityName: string): City | null {
    return this.#matchByName(cities, cityName, (city: City) => city.name);
  }

  searchByName(cityName: string): Observable<SelectOption | null> {
    const partner = this.#partnerService.getPartner();
    if (!partner) {
      return of(null);
    }

    return this.#citiesService.getCities(partner.id, cityName).pipe(
      map((cities: City[]) => {
        const foundCity = this.findInCities(cities, cityName);
        if (!foundCity) {
          return null;
        }
        return { id: foundCity.id, title: foundCity.name } as SelectOption;
      }),
    );
  }

  #matchByName<T>(items: T[], cityName: string, nameAccessor: (item: T) => string): T | null {
    const normalizedCityName = cityName.toLowerCase();

    const exactMatch = items.find((item: T) => nameAccessor(item).toLowerCase() === normalizedCityName);
    if (exactMatch) {
      return exactMatch;
    }

    return (
      items.find(
        (item: T) =>
          nameAccessor(item).toLowerCase().includes(normalizedCityName) || normalizedCityName.includes(nameAccessor(item).toLowerCase()),
      ) ?? null
    );
  }
}
