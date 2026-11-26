import { computed, Injectable, signal } from '@angular/core';

import { FilterDateRange } from '@fz-original/app/shared/layout/filters/date-range/date-range.interface';

import { BusinessTypeEnum } from '../../settings/shared/models/business-type.enum';
import { ReservationsListAudience } from '../enums/reservations-list-audience.enum';
import { ReservationStatus } from '../models/reservation-status.enum';

export interface ReservationFilters {
  audience: ReservationsListAudience;
  dateRange: FilterDateRange | null;
  searchTerm: string | null;
  orderId: string | null;
  status: ReservationStatus[] | null;
  businessType: BusinessTypeEnum[] | null;
  /**
   * TOOD:
   * Remove this properties after new reservations filters is finished
   */
  search: string | null;
  reservationLocator: string | null;
  orderBy: string | null;
}

const DEFAULT_FILTERS: ReservationFilters = {
  audience: ReservationsListAudience.BUSINESS,
  dateRange: { startDate: null, endDate: null },
  searchTerm: null,
  orderId: null,
  status: null,
  businessType: null,
  orderBy: null,
  /**
   * TOOD:
   * Remove this properties after new reservations filters is finished
   */
  search: null,
  reservationLocator: null,
};

@Injectable({
  providedIn: 'root',
})
export class ReservationsFiltersService {
  #filters = signal<ReservationFilters>(DEFAULT_FILTERS);

  readonly dateRange = computed(() => this.#filters().dateRange);
  readonly filters = computed(() => this.#filters());
  readonly isMarketplaceAudience = computed(() => this.#filters().audience === ReservationsListAudience.MARKETPLACE);
  readonly searchTerm = computed(() => this.#filters().searchTerm);
  readonly orderId = computed(() => this.#filters().orderId);
  /**
   * TOOD:
   * Remove this properties after new reservations filters is finished
   */
  readonly search = computed(() => this.#filters().search);
  readonly reservationLocator = computed(() => this.#filters().reservationLocator);

  setFilters(filters: Partial<ReservationFilters>): void {
    if (filters.dateRange && (!filters.dateRange.startDate || !filters.dateRange.endDate)) {
      filters = { ...filters, dateRange: null };
    }

    this.#filters.update(currentFilters => {
      if (!Object.prototype.hasOwnProperty.call(filters, 'dateRange')) {
        filters = { ...filters, dateRange: currentFilters.dateRange };
      }
      return {
        ...currentFilters,
        ...filters,
      };
    });
  }

  /**
   * Resets all filters to their default values
   * This method should be called when a user logs out
   */
  resetFilters(): void {
    this.#filters.set(DEFAULT_FILTERS);
  }
}
