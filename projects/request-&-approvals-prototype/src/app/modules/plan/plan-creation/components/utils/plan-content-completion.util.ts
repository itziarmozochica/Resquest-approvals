import { PlanCreationStatusData } from '@fz-original/app/shared/models/plan/plan-creation-status.model';
import { PlanKind } from '@fz-original/app/shared/models/plan/plan-kind.enum';

import { ContentCompletion } from '../plan-setup/plan-setup.model';
import { areRequiredPlanTaxonomyTagsSatisfied, PlanTagsData } from './plan-tags-completion.util';

export interface PlanTermsMeaningfulContentChecker {
  hasMeaningfulContent(planId: number): boolean;
}

export function calculatePlanContentCompletion(
  plan: PlanCreationStatusData | null,
  termsDraft: PlanTermsMeaningfulContentChecker,
  planTagsData: PlanTagsData | null = null,
): ContentCompletion {
  if (!plan) {
    return { content: false, media: false, tags: false, termsAndConditions: false, venue: false };
  }

  const hasName = Boolean(plan.name?.trim());
  const hasDescription = Boolean(plan.description?.trim());
  const content = hasName && hasDescription;
  const media = Array.isArray(plan.gallery) && plan.gallery.length > 0;
  const venue = Array.isArray(plan.venues) && plan.venues.length > 0;
  const requiresTerms = planRequiresTermsAndConditions(plan);
  const termsAndConditions = !requiresTerms || termsDraft.hasMeaningfulContent(plan.id);
  const tags = areRequiredPlanTaxonomyTagsSatisfied(planTagsData);

  return { content, media, tags, termsAndConditions, venue };
}

export function planRequiresTermsAndConditions(plan: Pick<PlanCreationStatusData, 'type'>): boolean {
  return plan.type === PlanKind.PRIZE_DRAW || plan.type === PlanKind.AUCTION || plan.type === PlanKind.REDEEM_NOW;
}
