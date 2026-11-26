import { isSessionTypeFieldPopulated } from './default-translation-field-catalog';

export interface ApplyToAllEntry {
  entityId: number;
  instructions: string;
}

export function applyInstructionsToAllTicketTypesExceptOrigin<T extends ApplyToAllEntry>(
  entries: readonly T[],
  originEntityId: number,
  value: string,
): T[] {
  return entries.map((entry: T) => (entry.entityId === originEntityId ? entry : { ...entry, instructions: value }));
}

export function countTicketTypesWithNonEmptyInstructionsExceptOrigin(entries: readonly ApplyToAllEntry[], originEntityId: number): number {
  return entries.reduce((count: number, entry: ApplyToAllEntry) => {
    if (entry.entityId === originEntityId) {
      return count;
    }
    return count + (isSessionTypeFieldPopulated('instructions', entry.instructions) ? 1 : 0);
  }, 0);
}
