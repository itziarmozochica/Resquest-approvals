import type { SortingState } from '@tanstack/table-core';

/**
 * Payload emitted by `IgntTableComponent` when sorting changes (output `sortingChange`).
 * Use when handling server-side sorting.
 */
export interface IgntTableSortChangeEvent {
  sorting: SortingState;
}
