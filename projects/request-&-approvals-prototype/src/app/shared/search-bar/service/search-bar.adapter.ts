import { inject, Injectable } from '@angular/core';

import { OnsiteSetupsStorageService } from '@fz-original/app/modules/box-office/shared/services/onsite-setups/onsite-setups-storage.service';
import { TranslateService } from '@ngx-translate/core';

import { AdapterInterface } from '../../../core/adapter.interface';
import { DropdownService } from '../../dropdown/dropdown.service';
import { BaseErrorResponse, BaseResponse } from '../../models/base-response';
import { Place } from '../../models/plan/place.model';
import { PlanKind } from '../../models/plan/plan-kind.enum';
import { PlanStatus } from '../../models/plan/plan-status.enum';
import { Plan } from '../../models/plan/plan.model';
import { CityOption } from '../models/city-option.model';
import { PlaceOption } from '../models/place-option.model';
import { PlanOption } from '../models/plan-option.model';
import { SearchBarOptions } from '../models/search-bar.options';

@Injectable({
  providedIn: 'root',
})
export class SearchBarAdapter implements AdapterInterface<BaseResponse<SearchBarOptions>> {
  #onsiteSetupsStorageService = inject(OnsiteSetupsStorageService);
  #translateService = inject(TranslateService);

  fromApi(response: BaseResponse<Plan[] | null>): BaseResponse<SearchBarOptions> {
    return new BaseResponse<SearchBarOptions>(this.#getData(response.data), this.#getError(response.error));
  }

  #getCityTranslation(cityName: string): string {
    const translateKey = `cities.${cityName}`;
    const translation = this.#translateService.instant(translateKey);
    return translation === translateKey ? cityName : translation;
  }

  #getData(data: Plan[] | null | undefined): SearchBarOptions {
    const partnerCities: Record<number, CityOption> = {};
    const partnerPlans: PlanOption[] = [];
    let partnerPlaces: PlaceOption[] = [];
    if (data != null && data) {
      data.forEach((plan: Plan) => {
        const places: PlaceOption[] = [];
        const plan_cities: Record<number, boolean> = {};
        plan.places?.forEach((place: Place) => {
          places.push(new PlaceOption(plan.id!, place.id, place.name, place.city!.id, place.city?.name ?? '', place.city?.timeZone ?? ''));
          if (place.city !== null && !plan_cities[place.city.id]) {
            const city: CityOption =
              partnerCities[place.city.id] ||
              new CityOption(
                place.city.id,
                place.city.name,
                this.#getCityTranslation(place.city.name.trim()),
                place.city.timeZone,
                place.city.currency ?? '',
                0,
                place.city.country,
              );
            city.activePlansNumber += Number(this.#isPlanOnSale(plan.status ?? ''));
            partnerCities[place.city.id] = city;
            plan_cities[place.city.id] = true;
          }
        });
        partnerPlans.push(
          new PlanOption(
            plan.id!,
            plan.name ?? '',
            plan.status ?? ('' as PlanStatus),
            plan.kind ?? ('' as PlanKind),
            places,
            plan.isAssetBased ?? false,
            plan.nextSessionDateWithAttendees ? plan.nextSessionDateWithAttendees : plan.nextSessionDate,
            plan.lastExpiredSessionDateWithAttendees ? plan.lastExpiredSessionDateWithAttendees : plan.lastExpiredSessionDate,
            plan.nextSessionDate,
            plan.lastSessionDate,
            plan.hasSeatingProvider ?? false,
            plan.latestReview?.status,
            plan.hasDeclarativeInventory ?? false,
          ),
        );
        partnerPlaces = partnerPlaces.concat(places);
      });

      if (this.#needToOrderPlansByOnsiteSetupPriority()) {
        this.#orderPlansByOnsiteSetupPriority(partnerPlans);
      }
    }
    return { cities: DropdownService.orderDropdown(Object.values(partnerCities)), plans: partnerPlans, places: partnerPlaces };
  }

  #getError(data: BaseErrorResponse | null | undefined) {
    if (data == null) {
      return null;
    }
    return { code: data.code, message: data.message };
  }

  #isPlanOnSale(status: string): boolean {
    return status == PlanStatus.ON_SALE;
  }

  #needToOrderPlansByOnsiteSetupPriority(): boolean {
    return (this.#onsiteSetupsStorageService.getConfiguration()?.prioritized_main_plans?.length ?? 0) > 0;
  }

  #orderPlansByOnsiteSetupPriority(partnerPlans: PlanOption[]): void {
    const prioritizedMainPlans: number[] = this.#onsiteSetupsStorageService.getConfiguration()?.prioritized_main_plans ?? [];
    prioritizedMainPlans.forEach((prioritizedPlanId, priorityIndex) => {
      const planIndex: number = partnerPlans.findIndex(plan => plan.id === prioritizedPlanId);
      if (planIndex !== -1) {
        const plan: PlanOption = partnerPlans.splice(planIndex, 1)[0];
        partnerPlans.splice(priorityIndex, 0, plan);
      }
    });
  }
}
