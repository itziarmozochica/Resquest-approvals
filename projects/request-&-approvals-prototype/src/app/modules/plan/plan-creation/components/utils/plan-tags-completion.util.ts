import { Permissions } from '../../../../../shared/services/user/permissions';
import { AvailableTags, PlanTags } from '../../../../content-plan/models/tags.model';
import { CardItem } from '../plan-setup/plan-setup.model';

export interface PlanTagsData {
  availableTags: AvailableTags | null;
  planTags: PlanTags | null;
}

export function isPlanTagsOptional(planTagsData: PlanTagsData | null): boolean {
  if (planTagsData === null || planTagsData.availableTags === null) {
    return true;
  }
  return !planTagsData.availableTags.taxonomies.some(hierarchy => hierarchy.required);
}

export function areRequiredPlanTaxonomyTagsSatisfied(planTagsData: PlanTagsData | null): boolean {
  if (planTagsData === null || planTagsData.availableTags === null || planTagsData.planTags === null) {
    return false;
  }
  const requiredHierarchies = planTagsData.availableTags.taxonomies.filter(hierarchy => hierarchy.required);
  if (requiredHierarchies.length === 0) {
    return true;
  }
  const { planTags } = planTagsData;
  return requiredHierarchies.every(hierarchy => {
    const assigned = planTags.taxonomies.find(taxonomy => taxonomy.id === hierarchy.id);
    return assigned !== undefined && assigned.terms.length > 0;
  });
}

export function buildPlanTagsSetupCardItem(planTagsData: PlanTagsData | null): CardItem {
  const optional = isPlanTagsOptional(planTagsData);
  return {
    label: optional ? 'planSetup.content.items.tagsOptional' : 'planSetup.content.items.tags',
    completed: areRequiredPlanTaxonomyTagsSatisfied(planTagsData),
    optional,
    permission: Permissions.CAN_SET_TAGS_WHEN_CREATING_PLAN,
  };
}

export function buildPlanTagsStepperCardItem(planTagsData: PlanTagsData | null): CardItem {
  const optional = isPlanTagsOptional(planTagsData);
  return {
    label: 'tags',
    completed: areRequiredPlanTaxonomyTagsSatisfied(planTagsData),
    optional,
    permission: Permissions.CAN_SET_TAGS_WHEN_CREATING_PLAN,
  };
}
