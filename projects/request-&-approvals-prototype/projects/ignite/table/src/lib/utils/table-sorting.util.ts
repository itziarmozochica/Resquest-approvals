import type { SortingState, Updater } from '@tanstack/table-core';

import type { IgntTableSortIconName } from '../models';

export function nextSortingFromUpdater(currentSorting: SortingState, updater: Updater<SortingState>): SortingState {
  return typeof updater === 'function' ? updater(currentSorting) : updater;
}

export function isSortingEqual(left: SortingState, right: SortingState): boolean {
  if (left.length !== right.length) return false;
  return left.every((item, index) => item.id === right[index]?.id && item.desc === right[index]?.desc);
}

export function ariaSortForState(sorted: false | 'asc' | 'desc'): 'ascending' | 'descending' | 'none' {
  if (sorted === 'asc') return 'ascending';
  if (sorted === 'desc') return 'descending';
  return 'none';
}

export function sortDirectionForState(sorted: false | 'asc' | 'desc'): 'asc' | 'desc' | 'none' {
  if (sorted === 'asc') return 'asc';
  if (sorted === 'desc') return 'desc';
  return 'none';
}

export function sortIconForState(sorted: false | 'asc' | 'desc'): IgntTableSortIconName {
  if (sorted === 'asc') return 'sort-amount-up-alt';
  if (sorted === 'desc') return 'sort-amount-down-alt';
  return 'sort-alt';
}
