import { parseStrictPositiveIntegerString } from '@fz-original/app/shared/utils/number.util';

import type { ParsedPlanIds } from '../models/immersive-module-replication.model';

const SEPARATOR_PATTERN = /[\s,]+/;

export const MAX_PLAN_IDS = 200;

export function parsePlanIds(raw: string, sourcePlanId: number, max = MAX_PLAN_IDS): ParsedPlanIds {
  const tokens = raw
    .split(SEPARATOR_PATTERN)
    .map(token => token.trim())
    .filter(token => token.length > 0);

  const invalidTokens: string[] = [];
  const seen = new Set<number>();
  const uniqueIds: number[] = [];
  let duplicateCount = 0;
  let droppedSourceId = false;

  for (const token of tokens) {
    const id = parseStrictPositiveIntegerString(token);
    if (id === null || !Number.isSafeInteger(id)) {
      invalidTokens.push(token);
      continue;
    }
    if (id === sourcePlanId) {
      droppedSourceId = true;
      continue;
    }
    if (seen.has(id)) {
      duplicateCount += 1;
      continue;
    }
    seen.add(id);
    uniqueIds.push(id);
  }

  const overflowCount = Math.max(0, uniqueIds.length - max);
  const ids = uniqueIds.slice(0, max);

  return { droppedSourceId, duplicateCount, ids, invalidTokens, overflowCount };
}
