import { inject, Injectable } from '@angular/core';
import { Router } from '@angular/router';

import { UserAttributes } from '@optimizely/optimizely-sdk';

import { FeatureFlags } from '../../shared/optimizely/feature-flags';
import { OptimizelyService } from '../../shared/optimizely/optimizely.service';
import { Permissions } from '../../shared/services/user/permissions';
import { UserService } from '../../shared/services/user/user.service';

export interface ContentPlanEditionTabOption {
  readonly id: string;
  readonly label: string;
}

export interface ContentPlanTabsOptions {
  readonly isCandlelight?: boolean;
  readonly planRequiringTermsAndConditions?: boolean;
  readonly showVenueTab?: boolean;
}

@Injectable({
  providedIn: 'root',
})
export class ContentPlanTabsResolver {
  readonly #optimizelyService = inject(OptimizelyService);
  readonly #router = inject(Router);
  readonly #userService = inject(UserService);

  getAvailableTabs(options: ContentPlanTabsOptions = {}): ContentPlanEditionTabOption[] {
    const showVenueTab = options.showVenueTab ?? true;
    const optimizelyAttributes = this.#getOptimizelyAttributes();

    const canViewContent = this.#userService.hasPermission(Permissions.CAN_VIEW_CONTENT);
    const canManageVenues = this.#userService.hasPermission(Permissions.CAN_MANAGE_VENUES);
    const showVenueTabResolved =
      showVenueTab && canManageVenues && this.#isOptimizelyModuleEnabled(FeatureFlags.PLAN_EDITION_VENUE, optimizelyAttributes);
    const showTagsTab = this.#userService.hasPermission(Permissions.CAN_VIEW_TAGS);
    const showTranslationsTab =
      this.#userService.hasPermission(Permissions.CAN_MANAGE_MAIN_PLAN_TRANSLATIONS) &&
      this.#isOptimizelyModuleEnabled(FeatureFlags.ENABLE_MAIN_PLAN_TRANSLATIONS, optimizelyAttributes);
    const showTermsAndConditionsTab = canViewContent && options.planRequiringTermsAndConditions === true;
    const showImmersivePlanLayoutTab =
      canViewContent && this.#isOptimizelyModuleEnabled(FeatureFlags.IMMERSIVE_PLAN_LAYOUT_EDITOR, optimizelyAttributes);
    const showMetadataTab = canViewContent && options.isCandlelight === true;

    const contentTab = this.#buildTab('content-edit', 'planEdition.contentTab');
    const galleryTab = this.#buildTab('gallery-edit', 'planEdition.galleryTab');
    const venueTab = this.#buildTab('venue-edit', 'planEdition.venue.tabTitle');
    const tagsTab = this.#buildTab('tags-edit', 'planEdition.tagsTab');
    const translationsTab = this.#buildTab('translations-edit', 'planEdition.translationsTab');
    const termsAndConditionsTab = this.#buildTab('terms-and-conditions-edit', 'planEdition.termsAndConditionsTab');
    const immersivePlanLayoutTab = this.#buildTab('immersive-plan-layout-edit', 'planEdition.immersivePlanLayoutTab');
    const metadataTab = this.#buildTab('metadata-edit', 'planEdition.metadataTab');

    return [
      ...(canViewContent ? [contentTab, galleryTab] : []),
      ...(showVenueTabResolved ? [venueTab] : []),
      ...(showTagsTab ? [tagsTab] : []),
      ...(showTermsAndConditionsTab ? [termsAndConditionsTab] : []),
      ...(showTranslationsTab ? [translationsTab] : []),
      ...(showImmersivePlanLayoutTab ? [immersivePlanLayoutTab] : []),
      ...(showMetadataTab ? [metadataTab] : []),
    ];
  }

  hasAvailableTabs(options: ContentPlanTabsOptions = {}): boolean {
    return this.getAvailableTabs(options).length > 0;
  }

  getFirstAvailableTabPath(options: ContentPlanTabsOptions = {}): string {
    const tabs = this.getAvailableTabs(options);
    const firstTab = tabs.at(0);
    return firstTab?.id ?? 'content-edit';
  }

  #buildTab(id: string, label: string): ContentPlanEditionTabOption {
    return { id, label };
  }

  #getOptimizelyAttributes(): UserAttributes | undefined {
    const planId = this.#router.routerState.snapshot.root.queryParamMap.get('planId');
    return planId ? { plan_id: planId } : undefined;
  }

  #isOptimizelyModuleEnabled(flag: FeatureFlags, attributes: UserAttributes | undefined): boolean {
    return this.#optimizelyService.isFeatureEnabled(flag, attributes) === true;
  }
}
