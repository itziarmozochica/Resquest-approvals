import { inject, Injectable, signal } from '@angular/core';

import { FilterDateRange } from '@fz-original/app/shared/layout/filters/date-range/date-range.interface';
import { Place } from '@fz-original/app/shared/models/plan/place.model';
import { PlanStatus } from '@fz-original/app/shared/models/plan/plan-status.enum';
import { Plan } from '@fz-original/app/shared/models/plan/plan.model';
import { PlanService } from '@fz-original/app/shared/services/plan/plan.service';

@Injectable({ providedIn: 'root' })
export class PlanStateService {
  #planService = inject(PlanService);
  filteredPlans = signal<Plan[]>([]);
  isLoading = signal<boolean>(false);
  plans = signal<Plan[]>([]);
  plansBusinessId = signal<string | null>(null);
  selectedPlan = signal<Plan | null>(null);
  selectedVenue = signal<Place | null>(null);

  reset() {
    this.filteredPlans.set([]);
    this.plans.set([]);
    this.plansBusinessId.set(null);
    this.selectedPlan.set(null);
    this.selectedVenue.set(null);
    this.isLoading.set(false);
    this.#planService.clearPlansCache();
  }

  setFilteredPlans(plans: Plan[], cityId?: number, venueId?: number, dateRange?: FilterDateRange | null, status?: PlanStatus | null) {
    const plansByVenue = plans.reduce<Plan[]>((acc, plan) => {
      if (!plan.places) {
        return acc;
      }

      const places = plan.places.filter(place => {
        if (venueId && venueId !== -1 && place.id !== venueId) {
          return false;
        }
        if (cityId && cityId !== -1 && place.city?.id !== cityId) {
          return false;
        }

        return true;
      });

      if (places.length === 0) {
        return acc;
      }

      if (dateRange && dateRange.startDate && dateRange.endDate && plan.firstSessionDate && plan.lastSessionDate) {
        if (dateRange.startDate > new Date(plan.lastSessionDate) || dateRange.endDate < new Date(plan.firstSessionDate)) {
          return acc;
        }
      }

      if (status && status !== PlanStatus.ALL && plan.status && plan.status !== status) {
        return acc;
      }

      const newPlan = new Plan(
        plan.id,
        plan.name,
        plan.createdAt,
        plan.kind,
        plan.pictureURL,
        plan.status,
        plan.isPublished,
        plan.isHiddenFeed,
        plan.isSoldOut,
        plan.grossRevenue,
        plan.paidTicketsSold,
        plan.freeTicketsSold,
        plan.hasMultiplePlaces,
        plan.firstPlace,
        places,
        plan.isSoldInMultipleCities,
        plan.timezone,
        plan.firstSessionDate,
        plan.lastSessionDate,
        plan.nextSessionDate,
        plan.nextSessionDateWithAttendees,
        plan.lastExpiredSessionDate,
        plan.lastExpiredSessionDateWithAttendees,
        plan.addOnsSold,
        plan.partnerId,
        plan.isAssetBased,
        plan.hasSeatingProvider,
        plan.latestReview,
        plan.hasEverBeenPublished,
      );
      acc.push(newPlan);

      return acc;
    }, []);

    this.filteredPlans.set(plansByVenue);
  }

  setLoading(loading: boolean) {
    this.isLoading.set(loading);
  }

  setPlans(plans: Plan[], businessId: string | null = null) {
    this.plans.set(plans);
    this.plansBusinessId.set(businessId);
  }

  setSelectedPlan(plan: Plan) {
    this.selectedPlan.set(plan);
  }

  setSelectedVenue(venueId: Place | null) {
    this.selectedVenue.set(venueId);
  }
}
