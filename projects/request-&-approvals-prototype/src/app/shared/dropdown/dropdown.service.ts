import { inject, Injectable } from '@angular/core';

import { SelectDropdownDescriptionType } from '@fz-original/app/shared/dropdown/select-dropdown-description-type';
import { TranslateService } from '@ngx-translate/core';

import { ListPlanItem } from '../../modules/attendees/list-attendees/models/list-plan-item.model';
import { SelectOption } from '../layout/filters/select/select.interface';
import { Place } from '../models/plan/place.model';
import { PlanStatus } from '../models/plan/plan-status.enum';
import { Plan } from '../models/plan/plan.model';
import { PlaceOption } from '../search-bar/models/place-option.model';
import { SelectDropdownPlanOption } from './select-dropdown-plan-option';

@Injectable({
  providedIn: 'root',
})
export class DropdownService {
  static orderDropdown(dropdownOptions: any[]): any[] {
    return dropdownOptions.sort((dropdownOptionA, dropdownOptionB) => {
      const dropdownOptionAWithoutSpecialCharacters = dropdownOptionA.title.toLowerCase().replace(/[^a-z0-9]/g, '');
      const dropdownOptionBWithoutSpecialCharacters = dropdownOptionB.title.toLowerCase().replace(/[^a-z0-9]/g, '');
      if (dropdownOptionAWithoutSpecialCharacters < dropdownOptionBWithoutSpecialCharacters) {
        return -1;
      }
      if (dropdownOptionAWithoutSpecialCharacters > dropdownOptionBWithoutSpecialCharacters) {
        return 1;
      }
      return 0;
    });
  }

  #translateService = inject(TranslateService);

  getCitiesFiltersOptions(plans: Plan[]): SelectOption[] {
    const citiesOptions = new Map<number, SelectOption>();

    plans.forEach(({ places }) => {
      places?.forEach((place: Place) => {
        const { city } = place;
        if (city !== null && !citiesOptions.has(city.id)) {
          citiesOptions.set(city.id, {
            id: city.id,
            title: city.name,
          });
        }
      });
    });

    return [
      {
        id: -1,
        title: this.#translateService.instant('filters.allCities'),
      },
      ...Array.from(citiesOptions.values()),
    ];
  }

  getCityOptionFilteredByVenue(plans: Plan[], venueId: number): SelectOption {
    const citiesOptions = new Map<number, SelectOption>();

    if (venueId === -1) {
      return citiesOptions.values().next().value as SelectOption;
    }

    plans.forEach(({ places }) => {
      places?.forEach((place: Place) => {
        if (place.id === venueId && place.city !== null) {
          citiesOptions.set(place.city.id, { id: place.city.id, title: place.city.name });
        }
      });
    });

    return citiesOptions.values().next().value as SelectOption;
  }

  getPlaceDropdownOptions(places: PlaceOption[], cityId?: number, planId?: number): SelectOption[] {
    const placeDropdownOptions: SelectOption[] = [];
    const partnerPlaces: PlaceOption[] = places.filter(
      (place: PlaceOption) => (!cityId || place.cityId === cityId) && (!planId || place.planId === planId),
    );
    const ids: number[] = [];
    partnerPlaces.forEach((place: PlaceOption) => {
      if (!ids.includes(place.id)) {
        ids.push(place.id);
        placeDropdownOptions.push({ id: place.id, title: place.name.trim(), description: place.cityId.toString() });
      }
    });
    return DropdownService.orderDropdown(placeDropdownOptions);
  }

  getPlaceForPlanDropdownOptions(plan: Plan): string {
    if (!plan.places) {
      return '';
    }
    if (plan.places.length === 1) {
      return `· ${plan.places[0].city?.name}`;
    }

    if (plan.places.length > 1) {
      return `· ${this.#translateService.instant('plansList.multipleVenues')}`;
    }

    return '';
  }

  getPlanDropdownOptions(
    plans: ListPlanItem[],
    cityId?: number,
    status?: PlanStatus,
    descriptionType?: SelectDropdownDescriptionType,
    includePlanIds?: number[],
  ): SelectDropdownPlanOption[] {
    let partnerPlans = plans;
    const includePlanIdsSet = includePlanIds?.length ? new Set(includePlanIds) : undefined;
    if (cityId) {
      partnerPlans = partnerPlans.filter(plan =>
        plan.places
          ?.filter(place => place.cityId === cityId || includePlanIdsSet?.has(place.planId))
          .map(place => place.planId)
          .includes(plan.id),
      );
    }
    if (status || includePlanIds) {
      partnerPlans = partnerPlans.filter(plan => plan.status === status || includePlanIdsSet?.has(plan.id));
    }

    const planTitleByPlanId = this.#buildPlanTitles(partnerPlans);

    return partnerPlans.map(plan => ({
      id: plan.id,
      title: planTitleByPlanId.get(plan.id) ?? plan.name.trim(),
      status: plan.status,
      description: this.#getDropdownDescriptionByType(descriptionType as SelectDropdownDescriptionType, plan),
      nextSessionDate: plan.nextSessionDate,
      lastSessionDate: plan.lastSessionDate,
      nextSessionDateRegardlessOfAttendance: plan.nextSessionDateRegardlessOfAttendance,
      lastSessionDateRegardlessOfExpirationAndAttendance: plan.lastSessionDateRegardlessOfExpirationAndAttendance,
      isAssetBased: plan.isAssetBased,
      hasSeatingProvider: plan.hasSeatingProvider,
      hasDeclarativeInventory: plan.hasDeclarativeInventory,
      timezone: plan.timezone,
    }));
  }

  getPlanDropdownOptionsFilteredByVenue(plans: ListPlanItem[], cityId: number, venueId?: number): SelectDropdownPlanOption[] {
    let partnerPlans: ListPlanItem[] = [];
    if (venueId !== undefined) {
      partnerPlans = plans.filter(
        plan =>
          plan.places
            ?.filter(place => place.id === venueId && place.cityId === cityId)
            .map(place => place.planId)
            .includes(plan.id) ?? [],
      );
    } else {
      partnerPlans = plans.filter(
        plan =>
          plan.places
            ?.filter(place => place.cityId === cityId)
            .map(place => place.planId)
            .includes(plan.id) ?? [],
      );
    }
    return partnerPlans.map((plan: ListPlanItem) => ({
      id: plan.id,
      title: plan.name.trim(),
      status: plan.status,
      description: plan.places?.[0].cityId.toString(),
      nextSessionDate: plan.nextSessionDate,
      lastSessionDate: plan.lastSessionDate,
      nextSessionDateRegardlessOfAttendance: plan.nextSessionDateRegardlessOfAttendance,
      isAssetBased: plan.isAssetBased,
      hasSeatingProvider: plan.hasSeatingProvider,
      hasDeclarativeInventory: plan.hasDeclarativeInventory,
    }));
  }

  getPlansDropdownOptions({
    plans,
    cityId,
    venueId,
    selectedPlanId,
  }: {
    cityId?: number;
    plans: Plan[];
    selectedPlanId?: number;
    venueId?: number;
  }): SelectOption[] {
    let partnerPlans = plans;

    if (cityId) {
      partnerPlans = partnerPlans.filter(plan => {
        const hasPlaceInCity = plan.places?.some(place => {
          return place.city?.id === cityId;
        });
        return hasPlaceInCity;
      });
    }

    if (venueId) {
      partnerPlans = partnerPlans.filter(plan => plan.places?.some(place => place.id === venueId));
    }

    if (selectedPlanId) {
      partnerPlans = partnerPlans.filter(plan => plan.id === selectedPlanId);
    }

    return [
      { id: -1, title: this.#translateService.instant('filters.allEvents') },
      ...partnerPlans.map(plan => ({
        id: plan.id,
        title: `(${plan.id}) ${plan.name?.trim() ?? ''} ${this.getPlaceForPlanDropdownOptions(plan)}`,
      })),
    ];
  }

  getVenuesFiltersOptionsFilteredByCity(plans: Plan[], cityId?: number): SelectOption[] {
    const venuesOptions = new Map<number, SelectOption>();

    plans.forEach(({ places }) => {
      places?.forEach((place: Place) => {
        if (!cityId || cityId === -1 || place.city?.id === cityId) {
          if (!venuesOptions.has(place.id)) {
            venuesOptions.set(place.id, {
              id: place.id,
              title: place.name,
            });
          }
        }
      });
    });

    const options = [
      {
        id: -1,
        title: this.#translateService.instant('filters.allVenues'),
      },
      ...Array.from(venuesOptions.values()),
    ];
    return options;
  }

  #buildPlanTitles(plans: ListPlanItem[]): Map<number, string> {
    const planTitleByPlanId = new Map<number, string>();
    const duplicatePlanNames = this.#findDuplicatePlanNames(plans);

    for (const plan of plans) {
      const planName = plan.name.trim();
      if (duplicatePlanNames.has(planName)) {
        const cityName = plan.places?.[0]?.cityName;
        planTitleByPlanId.set(plan.id, cityName ? `${planName} - ${cityName}` : planName);
      } else {
        planTitleByPlanId.set(plan.id, planName);
      }
    }

    return planTitleByPlanId;
  }

  #findDuplicatePlanNames(plans: ListPlanItem[]): Set<string> {
    const duplicates = new Set<string>();
    const seen = new Set<string>();

    for (const plan of plans) {
      const planName = plan.name.trim();
      if (seen.has(planName)) {
        duplicates.add(planName);
      } else {
        seen.add(planName);
      }
    }

    return duplicates;
  }

  #getDropdownDescriptionByType(type: SelectDropdownDescriptionType, plan: ListPlanItem): string {
    switch (type) {
      case SelectDropdownDescriptionType.CITY_ID:
        return plan.places?.[0].cityId.toString() as string;
      case SelectDropdownDescriptionType.PLAN_ID:
        return plan.id.toString();
      default:
        return plan.places?.[0]?.cityId?.toString() ?? '';
    }
  }
}
