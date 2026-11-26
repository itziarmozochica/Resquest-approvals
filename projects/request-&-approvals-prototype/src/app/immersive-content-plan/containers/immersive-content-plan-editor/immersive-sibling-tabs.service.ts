import { computed, inject, Injectable, type Signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router } from '@angular/router';

import { ContentPlanTabsResolver } from '@fz-original/app/modules/content-plan/content-plan-tabs.resolver';
import { EditingPlanService } from '@fz-original/app/modules/content-plan/services/editing-plan/editing-plan.service';

import type { ImmersiveSiblingTab, ImmersiveSiblingTabs } from '../../models/immersive-sibling-tabs.model';

const SIBLING_TABS: readonly ImmersiveSiblingTab[] = ['media', 'venue'];

const ROUTE_ID_BY_SIBLING_TAB: Readonly<Record<ImmersiveSiblingTab, string>> = {
  media: 'gallery-edit',
  venue: 'venue-edit',
};

/**
 * Bridges the immersive editor to the sibling Media/Venue plan-edition tabs. Provided on
 * `ImmersiveContentPlanEditorComponent`, never `providedIn: 'root'`, so `ActivatedRoute` resolves to
 * the route of whichever host mounts the editor.
 */
@Injectable()
export class ImmersiveSiblingTabsService implements ImmersiveSiblingTabs {
  readonly #editingPlan = inject(EditingPlanService);
  readonly #route = inject(ActivatedRoute);
  readonly #router = inject(Router);
  readonly #tabsResolver = inject(ContentPlanTabsResolver);

  // The legacy `ContentPlanComponent` mounts the editor as an in-page tab whose route declares no
  // sibling tab routes; only the tabbed `PlanEditionComponent` route does.
  readonly #siblingRouteIds = new Set(this.#route.parent?.routeConfig?.children?.map(child => child.path));
  readonly #selectedPlanDetail = toSignal(this.#editingPlan.getSelectedPlanDetail$(), { initialValue: null });

  // `venues.length === 1` mirrors `PlanEditionComponent#updateTabs`, which owns when the Venue tab shows.
  readonly availableTabs: Signal<readonly ImmersiveSiblingTab[]> = computed(() => {
    const showVenueTab = this.#selectedPlanDetail()?.data?.venues?.length === 1;
    const availableRouteIds = new Set(this.#tabsResolver.getAvailableTabs({ showVenueTab }).map(option => option.id));
    return SIBLING_TABS.filter(tab => {
      const routeId = ROUTE_ID_BY_SIBLING_TAB[tab];
      return this.#siblingRouteIds.has(routeId) && availableRouteIds.has(routeId);
    });
  });

  open(tab: ImmersiveSiblingTab): void {
    this.#router.navigate(['../', ROUTE_ID_BY_SIBLING_TAB[tab]], {
      queryParamsHandling: 'preserve',
      relativeTo: this.#route,
    });
  }
}
