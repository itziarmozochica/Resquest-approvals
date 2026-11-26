import { SessionTypeInventory } from '@fz-original/app/shared/services/sessions/session-type.model';

import { QuickSetupInventoryPayload } from './quick-setup-inventory.model';

export interface QuickSetupPreviewInventoryRow {
  id: string;
  /** `null` when the source does not expose a capacity for the row: the preview leaves the cell empty instead of inventing a number. */
  maxCapacity: number | null;
  name: string;
  /** Already formatted; empty when the amount or the plan currency is not derivable. */
  price: string;
}

export interface QuickSetupPreviewInventoryGroup {
  id: string;
  maxCapacity: number | null;
  name: string;
  tickets: QuickSetupPreviewInventoryRow[];
}

export interface QuickSetupPreviewInventoryPayloadSource {
  readonly kind: 'inventoryPayload';
  readonly payload: QuickSetupInventoryPayload;
}

export interface QuickSetupPreviewSessionTypeInventorySource {
  readonly inventory: SessionTypeInventory;
  readonly kind: 'sessionTypeInventory';
}

/**
 * Where the preview reads its inventory figures from.
 * Create mode (and resume landing on the inventory step) has the payload the user just submitted;
 * a resume that skips the inventory step only has the session types fetched from the plan.
 */
export type QuickSetupPreviewInventorySource = QuickSetupPreviewInventoryPayloadSource | QuickSetupPreviewSessionTypeInventorySource;

export interface QuickSetupPreviewInventoryFigures {
  addOns: QuickSetupPreviewInventoryRow[];
  groups: QuickSetupPreviewInventoryGroup[];
  ungroupedTickets: QuickSetupPreviewInventoryRow[];
}

export interface QuickSetupPreviewScheduleSummary {
  datesLabel: string;
  excludedDatesLabel: string | null;
  name: string;
  timesLabel: string;
}

export interface QuickSetupPreviewData {
  addOns: QuickSetupPreviewInventoryRow[];
  coverImageUrl: string | null;
  eventName: string;
  groups: QuickSetupPreviewInventoryGroup[];
  planLanguageLabel: string;
  schedules: QuickSetupPreviewScheduleSummary[];
  ungroupedTickets: QuickSetupPreviewInventoryRow[];
  validationMethodLabel: string;
  venueLabel: string;
}
