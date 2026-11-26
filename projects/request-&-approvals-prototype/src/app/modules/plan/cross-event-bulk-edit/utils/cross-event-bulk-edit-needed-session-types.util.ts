import { SessionType, SessionTypeBulkEditValues } from '@fz-original/app/shared/services/sessions/session-type.model';

const sessionTypeProductKeySeparator = '\u0000';

export function neededSessionTypesForPicker(
  sessionTypes: readonly SessionType[],
  selectedTicketTypeIds: readonly number[],
  sessionTypePlanIds: Readonly<Record<number, number>>,
): SessionType[] {
  const selected = new Set(selectedTicketTypeIds);
  const planIds = uniqueSelectedPlanIds(selectedTicketTypeIds, sessionTypePlanIds);
  if (planIds.length === 0) {
    return [];
  }

  const [firstPlanId, ...otherPlanIds] = planIds;
  const unselectedByPlan = new Map(
    planIds.map(planId => [planId, unselectedByProductKey(sessionTypes, planId, selected, sessionTypePlanIds)]),
  );
  const firstPlanUnselected = unselectedByPlan.get(firstPlanId);
  if (firstPlanUnselected === undefined) {
    return [];
  }

  return [...firstPlanUnselected.entries()]
    .filter(([productKey]) => otherPlanIds.every(planId => unselectedByPlan.get(planId)?.has(productKey) === true))
    .map(([, sessionType]) => sessionType);
}

export function remapNeededSessionTypeIdsForPlan(
  neededSessionTypeIds: readonly number[],
  planId: number,
  sessionTypes: readonly SessionType[],
  sessionTypePlanIds: Readonly<Record<number, number>>,
): number[] {
  const idByProductKeyOnPlan = sessionTypeIdByProductKey(sessionTypes, planId, sessionTypePlanIds);
  const sessionTypeById = new Map(sessionTypes.map(sessionType => [sessionType.id, sessionType]));

  return neededSessionTypeIds.flatMap(neededSessionTypeId => {
    const sessionType = sessionTypeById.get(neededSessionTypeId);
    if (sessionType === undefined) {
      return [];
    }

    const remappedId = idByProductKeyOnPlan.get(sessionTypeProductKey(sessionType));
    if (remappedId === undefined) {
      return [];
    }

    return [remappedId];
  });
}

export function remapNeededSessionTypesInValues(
  values: SessionTypeBulkEditValues,
  planId: number,
  sessionTypes: readonly SessionType[],
  sessionTypePlanIds: Readonly<Record<number, number>>,
): SessionTypeBulkEditValues {
  const rule = values.rule;
  if (rule?.neededSessionTypes == null) {
    return values;
  }

  const remappedIds = remapNeededSessionTypeIdsForPlan(
    rule.neededSessionTypes.map(option => Number(option.id)),
    planId,
    sessionTypes,
    sessionTypePlanIds,
  );
  const titleById = new Map(sessionTypes.map(sessionType => [sessionType.id, sessionType.label]));

  return {
    ...values,
    rule: {
      ...rule,
      neededSessionTypes: remappedIds.map(id => ({
        id,
        title: titleById.get(id) ?? '',
      })),
    },
  };
}

function sessionTypeIdByProductKey(
  sessionTypes: readonly SessionType[],
  planId: number,
  sessionTypePlanIds: Readonly<Record<number, number>>,
): Map<string, number> {
  const idByProductKey = new Map<string, number>();
  for (const sessionType of sessionTypes) {
    if (sessionTypePlanIds[sessionType.id] !== planId) {
      continue;
    }

    const productKey = sessionTypeProductKey(sessionType);
    if (idByProductKey.has(productKey)) {
      continue;
    }

    idByProductKey.set(productKey, sessionType.id);
  }

  return idByProductKey;
}

function sessionTypeProductKey(sessionType: SessionType): string {
  return `${sessionType.label}${sessionTypeProductKeySeparator}${sessionType.groups[0]?.name ?? ''}`;
}

function uniqueSelectedPlanIds(selectedTicketTypeIds: readonly number[], sessionTypePlanIds: Readonly<Record<number, number>>): number[] {
  return [
    ...new Set(
      selectedTicketTypeIds.flatMap(ticketTypeId => {
        const planId = sessionTypePlanIds[ticketTypeId];
        return planId === undefined ? [] : [planId];
      }),
    ),
  ];
}

function unselectedByProductKey(
  sessionTypes: readonly SessionType[],
  planId: number,
  selectedTicketTypeIds: ReadonlySet<number>,
  sessionTypePlanIds: Readonly<Record<number, number>>,
): Map<string, SessionType> {
  const byProductKey = new Map<string, SessionType>();
  for (const sessionType of sessionTypes) {
    if (sessionTypePlanIds[sessionType.id] !== planId) {
      continue;
    }

    if (selectedTicketTypeIds.has(sessionType.id)) {
      continue;
    }

    const productKey = sessionTypeProductKey(sessionType);
    if (byProductKey.has(productKey)) {
      continue;
    }

    byProductKey.set(productKey, sessionType);
  }

  return byProductKey;
}
