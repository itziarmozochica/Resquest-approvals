import { inject, Injectable } from '@angular/core';
import { Router } from '@angular/router';

import { FeatureFlags } from '@fz-original/app/shared/optimizely/feature-flags';
import { OptimizelyService } from '@fz-original/app/shared/optimizely/optimizely.service';

import {
  ASSET_BASED_ENTRY_POINT_STATE_KEY,
  CalendarEntryPoint,
  type CalendarEntryPointET,
} from '../../tracking/models/asset-based-tracking.model';
import { assetBasedCalendarCartIdQueryParam } from '../asset-based-calendar-query-param.const';

@Injectable({
  providedIn: 'root',
})
export class AssetBasedCalendarNavigateService {
  readonly #optimizelyService = inject(OptimizelyService);
  readonly #router = inject(Router);

  getBookingCalendarQueryParams(cartId: string): Record<string, string> {
    return { [assetBasedCalendarCartIdQueryParam]: cartId };
  }

  getCalendarUrl(): string {
    return this.#optimizelyService.isFeatureEnabled(FeatureFlags.ASSET_BASED_CALENDAR_LIST_VIEW) === true
      ? '/asset-based/calendar-list'
      : '/asset-based/calendar';
  }

  // The order card and the reservation header do not name their entry point yet; without a state
  // the calendar would count them as the side menu.
  navigateToBooking(cartId: string, entryPoint: CalendarEntryPointET = CalendarEntryPoint.bookingLink): void {
    this.#router.navigate([this.getCalendarUrl()], {
      queryParams: this.getBookingCalendarQueryParams(cartId),
      state: { [ASSET_BASED_ENTRY_POINT_STATE_KEY]: entryPoint },
    });
  }
}
