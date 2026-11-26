import { DynamicFields } from '@fz-original/app/shared/dynamic-fields/models/dynamic-fields.model';
import { hasMissingRequiredDynamicFieldValues } from '@fz-original/app/shared/dynamic-fields/utils/dynamic-fields-completion.util';

import { CardItem } from '../plan-setup/plan-setup.model';

export interface PlanDynamicFieldsData {
  dynamicFields: DynamicFields | null;
  planId: number;
}

export function isPlanDynamicFieldsOptional(planDynamicFieldsData: PlanDynamicFieldsData | null): boolean {
  if (planDynamicFieldsData === null) {
    return true;
  }
  if (planDynamicFieldsData.dynamicFields === null) {
    return false;
  }
  return !planDynamicFieldsData.dynamicFields.fields.some(field => field.isRequired);
}

export function areRequiredPlanDynamicFieldsFilled(planDynamicFieldsData: PlanDynamicFieldsData | null): boolean {
  if (planDynamicFieldsData === null || planDynamicFieldsData.dynamicFields === null) {
    return false;
  }
  const { dynamicFields, planId } = planDynamicFieldsData;
  return !hasMissingRequiredDynamicFieldValues(dynamicFields.fields, dynamicFields.values[planId] ?? {});
}

export function areRequiredTicketTypeDynamicFieldsFilled(
  ticketTypeDynamicFieldsData: PlanDynamicFieldsData | null,
  sessionTypeIds: number[],
): boolean {
  if (ticketTypeDynamicFieldsData === null) {
    return true;
  }
  const { dynamicFields } = ticketTypeDynamicFieldsData;
  if (dynamicFields === null) {
    return false;
  }
  return sessionTypeIds.every(
    sessionTypeId => !hasMissingRequiredDynamicFieldValues(dynamicFields.fields, dynamicFields.values[sessionTypeId] ?? {}),
  );
}

export function buildPlanDynamicFieldsSetupCardItems(planDynamicFieldsData: PlanDynamicFieldsData | null): CardItem[] {
  if (!shouldShowPlanDynamicFieldsItem(planDynamicFieldsData)) {
    return [];
  }
  const optional = isPlanDynamicFieldsOptional(planDynamicFieldsData);
  return [
    {
      label: optional ? 'planSetup.settings.items.customFieldsOptional' : 'planSetup.settings.items.customFields',
      completed: areRequiredPlanDynamicFieldsFilled(planDynamicFieldsData),
      optional,
    },
  ];
}

function shouldShowPlanDynamicFieldsItem(planDynamicFieldsData: PlanDynamicFieldsData | null): boolean {
  if (planDynamicFieldsData === null) {
    return false;
  }
  return planDynamicFieldsData.dynamicFields === null || planDynamicFieldsData.dynamicFields.fields.length > 0;
}

export function buildPlanDynamicFieldsStepperCardItems(planDynamicFieldsData: PlanDynamicFieldsData | null): CardItem[] {
  if (!shouldShowPlanDynamicFieldsItem(planDynamicFieldsData)) {
    return [];
  }
  return [
    {
      label: 'customFields',
      completed: areRequiredPlanDynamicFieldsFilled(planDynamicFieldsData),
      optional: isPlanDynamicFieldsOptional(planDynamicFieldsData),
    },
  ];
}
