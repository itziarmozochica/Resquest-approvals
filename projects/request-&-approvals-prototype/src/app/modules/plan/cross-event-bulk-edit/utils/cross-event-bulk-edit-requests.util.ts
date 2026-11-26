import {
  BulkUpdateSessionTypesAcrossPlansRequestDTO,
  BulkUpdateSessionTypesDTO,
} from '@fz-original/app/shared/services/sessions/session-type.model';

import { CrossEventBulkEditPlanSessionTypes } from '../models/cross-event-bulk-edit-review.model';

const sessionTypeIdsField = 'session_type_ids' satisfies keyof BulkUpdateSessionTypesDTO;

type SharedFields = Omit<BulkUpdateSessionTypesDTO, typeof sessionTypeIdsField>;

export function groupSelectedTicketTypesByPlan(
  selectedTicketTypeIds: readonly number[],
  sessionTypePlanIds: Readonly<Record<number, number>>,
): readonly CrossEventBulkEditPlanSessionTypes[] {
  const sessionTypeIdsByPlanId = new Map<number, number[]>();
  for (const ticketTypeId of selectedTicketTypeIds) {
    const planId = sessionTypePlanIds[ticketTypeId];
    if (planId === undefined) {
      continue;
    }

    const sessionTypeIds = sessionTypeIdsByPlanId.get(planId) ?? [];
    sessionTypeIdsByPlanId.set(planId, [...sessionTypeIds, ticketTypeId]);
  }

  return [...sessionTypeIdsByPlanId.entries()].map(([planId, sessionTypeIds]) => ({ planId, sessionTypeIds }));
}

export function toAcrossPlansRequests(
  groups: readonly CrossEventBulkEditPlanSessionTypes[],
  fieldsForGroup: (group: CrossEventBulkEditPlanSessionTypes) => BulkUpdateSessionTypesDTO,
): BulkUpdateSessionTypesAcrossPlansRequestDTO[] {
  return groups.map(group => {
    const fields = fieldsForGroup(group);
    const entries = Object.entries(fields).filter(([key]) => key !== sessionTypeIdsField);
    const sharedFields = Object.fromEntries(entries) as SharedFields; // entries come from `fields` minus session_type_ids, so they match the Omit

    return {
      ...sharedFields,
      main_plan_id: group.planId,
      session_type_ids: [...group.sessionTypeIds],
    };
  });
}
