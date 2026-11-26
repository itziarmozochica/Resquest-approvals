/**
 * Payload emitted by `IgntTableComponent` when the page changes (output `paginationChange`).
 * Use when handling server-side pagination.
 */
export interface IgntTablePageChangeEvent {
  /** 0-based page index. */
  pageIndex: number;
}
